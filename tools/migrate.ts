#!/usr/bin/env node
// Vidyut Core Migration Runner
// From OperationsDesignReference_v1.docx Section 1.2
//
// Usage:
//   npx tsx tools/migrate.ts                    # run pending migrations (local)
//   npx tsx tools/migrate.ts --env=production   # run against all active schools
//   npx tsx tools/migrate.ts --dry-run          # validate SQL without applying
//   npx tsx tools/migrate.ts --reset            # wipe + re-apply all (local only)
//
// IMPORTANT: In production this runs as a GitHub Actions step before deploy.
// It connects to every ACTIVE school's database and applies pending migrations.

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENV = process.argv.includes('--env=production') ? 'production' : 'local';
const DRY_RUN = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset') && ENV === 'local';

if (RESET && ENV === 'production') {
  console.error('ERROR: --reset is not allowed in production.');
  process.exit(1);
}

if (DRY_RUN) {
  console.log('[migrate] DRY RUN — no migrations will be applied.');
}

// ── Types ────────────────────────────────────────────────────────────────────

interface MigrationFile {
  version: number;
  name: string;
  sql: string;
}

interface MigrationResult {
  target: string;       // school slug or 'control-plane'
  status: 'OK' | 'SKIP' | 'FAILED';
  appliedCount?: number;
  error?: string;
}

// ── Load migration files ─────────────────────────────────────────────────────

async function loadMigrationFiles(dir: string): Promise<MigrationFile[]> {
  const entries = await readdir(dir);
  const sqlFiles = entries
    .filter(f => f.endsWith('.sql') && !f.includes('.rollback.'))
    .sort(); // lexicographic sort — relies on zero-padded version prefix

  const migrations: MigrationFile[] = [];
  for (const file of sqlFiles) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch?.[1]) {
      console.warn(`[migrate] Skipping file with no version prefix: ${file}`);
      continue;
    }
    const version = parseInt(versionMatch[1], 10);
    const sql = await readFile(join(dir, file), 'utf-8');
    migrations.push({ version, name: file.replace('.sql', ''), sql });
  }
  return migrations;
}

// ── Get applied versions from a database ────────────────────────────────────

async function getAppliedVersions(pool: pg.Pool): Promise<number[]> {
  try {
    const result = await pool.query<{ version: number }>(
      'SELECT version FROM _migration_history ORDER BY version'
    );
    return result.rows.map(r => r.version);
  } catch {
    // Table doesn't exist yet — first run
    return [];
  }
}

// ── Apply migrations to one database ────────────────────────────────────────

async function applyMigrations(
  pool: pg.Pool,
  migrations: MigrationFile[],
  target: string
): Promise<MigrationResult> {
  const applied = await getAppliedVersions(pool);
  const pending = migrations.filter(m => !applied.includes(m.version));

  if (pending.length === 0) {
    return { target, status: 'SKIP' };
  }

  if (DRY_RUN) {
    console.log(`[migrate] [DRY RUN] ${target}: would apply ${pending.length} migration(s):`);
    for (const m of pending) console.log(`  - v${m.version}: ${m.name}`);
    return { target, status: 'OK', appliedCount: pending.length };
  }

  for (const migration of pending) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO _migration_history (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      await client.query('COMMIT');
      console.log(`[migrate] ${target}: applied v${migration.version} — ${migration.name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return { target, status: 'OK', appliedCount: pending.length };
}

// ── Get list of active schools (production only) ─────────────────────────────

async function getActiveSchools(
  controlPool: pg.Pool
): Promise<Array<{ slug: string; dbSecretId: string }>> {
  const result = await controlPool.query<{ slug: string; db_secret_id: string }>(
    `SELECT slug, db_secret_id FROM schools WHERE status = 'ACTIVE' ORDER BY created_at`
  );
  return result.rows.map(r => ({ slug: r.slug, dbSecretId: r.db_secret_id }));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const migrationsDir = join(__dirname, '../packages/migrations/core');
  const migrations = await loadMigrationFiles(migrationsDir);
  console.log(`[migrate] Found ${migrations.length} migration file(s).`);

  const results: MigrationResult[] = [];

  if (ENV === 'local') {
    // Local: run against the single control plane DB
    const dbUrl = process.env['CONTROL_PLANE_DB_URL'] ??
      'postgresql://dev_user:dev_password@localhost:5432/vidyut_control';

    if (RESET) {
      console.log('[migrate] RESET: dropping and recreating database...');
      // Drop all tables by running rollback files in reverse
      // For simplicity in local reset, we just reconnect with DROP SCHEMA
      const resetPool = new Pool({ connectionString: dbUrl });
      await resetPool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await resetPool.end();
      console.log('[migrate] Database reset complete.');
    }

    const pool = new Pool({ connectionString: dbUrl });
    try {
      const result = await applyMigrations(pool, migrations, 'control-plane (local)');
      results.push(result);
    } finally {
      await pool.end();
    }

  } else {
    // Production: run against Control Plane first, then all active school DBs
    const controlDbUrl = process.env['CONTROL_PLANE_DB_URL'];
    if (!controlDbUrl) {
      console.error('ERROR: CONTROL_PLANE_DB_URL environment variable is required.');
      process.exit(1);
    }

    const controlPool = new Pool({ connectionString: controlDbUrl });

    // 1. Apply to Control Plane
    try {
      const result = await applyMigrations(controlPool, migrations, 'control-plane');
      results.push(result);
    } catch (err) {
      console.error('[migrate] FATAL: Control Plane migration failed:', err);
      await controlPool.end();
      process.exit(1);
    }

    // 2. Apply to all active school DBs
    const schools = await getActiveSchools(controlPool);
    console.log(`[migrate] Running migrations on ${schools.length} active school database(s)...`);

    for (const school of schools) {
      // TODO (GCP): Replace with Secret Manager lookup
      // const creds = await gcpSecretManager.getSecret(school.dbSecretId);
      // const schoolDbUrl = buildConnectionString(creds);
      console.warn(`[migrate] School ${school.slug}: GCP Secret Manager not configured yet. Skipping.`);
      results.push({ target: school.slug, status: 'SKIP' });
    }

    await controlPool.end();
  }

  // ── Summary report ─────────────────────────────────────────────────────────
  const ok     = results.filter(r => r.status === 'OK');
  const skipped = results.filter(r => r.status === 'SKIP');
  const failed  = results.filter(r => r.status === 'FAILED');

  console.log('\n[migrate] ─── Summary ───────────────────────────────────────');
  console.log(`  Applied: ${ok.length}  |  Skipped: ${skipped.length}  |  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.error('\n[migrate] FAILED databases:');
    for (const f of failed) console.error(`  - ${f.target}: ${f.error}`);
    process.exit(1);
  }

  console.log('[migrate] All migrations complete.\n');
}

main().catch(err => {
  console.error('[migrate] Unexpected error:', err);
  process.exit(1);
});
