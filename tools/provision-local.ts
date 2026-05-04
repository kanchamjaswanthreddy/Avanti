#!/usr/bin/env node
// Avanti — Local School Provisioning Tool
//
// Creates a new school in the local control plane and provisions its isolated DB.
// For local development only — production provisioning happens via the API.
//
// Usage:
//   npx tsx tools/provision-local.ts \
//     --name="Sunrise International School" \
//     --slug="sunrise" \
//     --admin-email=admin@sunrise.school \
//     --admin-password=Admin@1234
//
// What it does:
//   1. Inserts a school record into the control plane DB
//   2. Creates an isolated school DB (avanti_school_<id_prefix>)
//   3. Runs school migrations (packages/migrations/school/)
//   4. Seeds: default roles + admin user
//   5. Prints credentials and school ID

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { buildCoreMetaSchema } from '../packages/schema-engine/src/seed.js';

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse CLI args ────────────────────────────────────────────────────────────

function parseArgs(): {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
} {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([a-z-]+)=(.+)$/);
    if (match && match[1] && match[2]) {
      args[match[1]] = match[2];
    }
  }

  const name          = args['name'];
  const slug          = args['slug'];
  const adminEmail    = args['admin-email'];
  const adminPassword = args['admin-password'];

  if (!name || !slug || !adminEmail || !adminPassword) {
    console.error('Usage: npx tsx tools/provision-local.ts \\');
    console.error('  --name="School Name" \\');
    console.error('  --slug=school-slug \\');
    console.error('  --admin-email=admin@school.com \\');
    console.error('  --admin-password=SecurePass123');
    process.exit(1);
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error('ERROR: --slug must be lowercase alphanumeric with hyphens only.');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('ERROR: --admin-password must be at least 8 characters.');
    process.exit(1);
  }

  return { name, slug, adminEmail, adminPassword };
}

// ── Generate UUID v4 ──────────────────────────────────────────────────────────

function generateUUID(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return [
    bytes.slice(0, 4).toString('hex'),
    bytes.slice(4, 6).toString('hex'),
    bytes.slice(6, 8).toString('hex'),
    bytes.slice(8, 10).toString('hex'),
    bytes.slice(10, 16).toString('hex'),
  ].join('-');
}

// ── School DB name from school UUID ──────────────────────────────────────────

function schoolDbName(schoolId: string): string {
  return `avanti_school_${schoolId.replace(/-/g, '_').slice(0, 20)}`;
}

// ── Load school migrations ─────────────────────────────────────────────────────

async function loadSchoolMigrations(): Promise<Array<{ version: number; name: string; sql: string }>> {
  const dir = join(__dirname, '../packages/migrations/school');
  const entries = await readdir(dir);
  const files = entries
    .filter(f => f.endsWith('.sql') && !f.includes('.rollback.'))
    .sort();

  const migrations = [];
  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch?.[1]) continue;
    const version = parseInt(versionMatch[1], 10);
    const sql = await readFile(join(dir, file), 'utf-8');
    migrations.push({ version, name: file.replace('.sql', ''), sql });
  }
  return migrations;
}

// ── Default roles and permissions ─────────────────────────────────────────────

const DEFAULT_ROLES = [
  {
    name:     'SUPER_ADMIN',
    isSystem: true,
    permissions: [] as Array<{ resource: string; actions: string[] }>,  // bypasses all checks
  },
  {
    name:     'PRINCIPAL',
    isSystem: true,
    permissions: [
      { resource: 'classes',    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
      { resource: 'students',   actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'] },
      { resource: 'attendance', actions: ['CREATE', 'READ', 'UPDATE', 'EXPORT'] },
      { resource: 'fees',       actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
      { resource: 'timetable',  actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
      { resource: 'canvas',     actions: ['READ'] },
    ],
  },
  {
    name:     'TEACHER',
    isSystem: true,
    permissions: [
      { resource: 'classes',    actions: ['READ'] },
      { resource: 'students',   actions: ['READ'] },
      { resource: 'attendance', actions: ['CREATE', 'READ', 'UPDATE'] },
      { resource: 'timetable',  actions: ['READ'] },
    ],
  },
  {
    name:     'ACCOUNTANT',
    isSystem: true,
    permissions: [
      { resource: 'students',   actions: ['READ'] },
      { resource: 'fees',       actions: ['CREATE', 'READ', 'UPDATE', 'EXPORT'] },
    ],
  },
  {
    name:     'STAFF',
    isSystem: false,
    permissions: [
      { resource: 'classes',   actions: ['READ'] },
      { resource: 'students',  actions: ['READ'] },
      { resource: 'timetable', actions: ['READ'] },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  const controlDbUrl = process.env['CONTROL_PLANE_DB_URL']
    ?? 'postgresql://dev_user:dev_password@localhost:5434/avanti_control';

  console.log('\n[provision] Starting local school provisioning...');
  console.log(`  Name:  ${args.name}`);
  console.log(`  Slug:  ${args.slug}`);
  console.log(`  Admin: ${args.adminEmail}`);

  // ── Step 1: Connect to control plane ──────────────────────────────────────
  const controlPool = new Pool({ connectionString: controlDbUrl });

  // Check if slug is already taken
  const slugCheck = await controlPool.query<{ id: string }>(
    `SELECT id FROM schools WHERE slug = $1`,
    [args.slug]
  );
  if (slugCheck.rows.length > 0) {
    console.error(`\n[provision] ERROR: School with slug "${args.slug}" already exists.`);
    await controlPool.end();
    process.exit(1);
  }

  // ── Step 2: Create school record in control plane ─────────────────────────
  const schoolId = generateUUID();
  const dbName   = schoolDbName(schoolId);

  await controlPool.query(
    `INSERT INTO schools (id, name, slug, tier, status)
     VALUES ($1, $2, $3, 'starter', 'PROVISIONING')`,
    [schoolId, args.name, args.slug]
  );
  console.log(`\n[provision] Created school in control plane: ${schoolId}`);

  // ── Step 3: Create isolated school database ───────────────────────────────
  // Connect to postgres (admin) DB to CREATE DATABASE
  const baseUrl = new URL(controlDbUrl);
  baseUrl.pathname = '/postgres';
  const adminPool = new Pool({ connectionString: baseUrl.toString() });

  try {
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[provision] Created school database: ${dbName}`);
  } finally {
    await adminPool.end();
  }

  // ── Step 4: Run school migrations ─────────────────────────────────────────
  const schoolDbUrl = new URL(controlDbUrl);
  schoolDbUrl.pathname = `/${dbName}`;
  const schoolPool = new Pool({ connectionString: schoolDbUrl.toString() });

  const migrations = await loadSchoolMigrations();
  console.log(`[provision] Found ${migrations.length} school migration(s).`);

  for (const migration of migrations) {
    const client = await schoolPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO _migration_history (version, name) VALUES ($1, $2)
         ON CONFLICT (version) DO NOTHING`,
        [migration.version, migration.name]
      );
      await client.query('COMMIT');
      console.log(`[provision] Applied migration: ${migration.name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Step 5: Seed default roles ────────────────────────────────────────────
  const roleIds: Record<string, string> = {};

  for (const role of DEFAULT_ROLES) {
    const result = await schoolPool.query<{ id: string }>(
      `INSERT INTO roles (school_id, name, is_system)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [schoolId, role.name, role.isSystem]
    );
    const roleId = result.rows[0]?.id;
    if (!roleId) continue;
    roleIds[role.name] = roleId;

    for (const perm of role.permissions) {
      await schoolPool.query(
        `INSERT INTO role_permissions (role_id, resource, actions, field_permissions)
         VALUES ($1, $2, $3::text[], '[]')`,
        [roleId, perm.resource, perm.actions]
      );
    }
  }
  console.log(`[provision] Seeded ${DEFAULT_ROLES.length} default roles.`);

  // ── Step 6: Create admin user ─────────────────────────────────────────────
  const adminRoleId = roleIds['SUPER_ADMIN'];
  const passwordHash = await bcrypt.hash(args.adminPassword, 12);

  const adminResult = await schoolPool.query<{ id: string }>(
    `INSERT INTO users (school_id, email, password_hash, name, role_id, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
     RETURNING id`,
    [schoolId, args.adminEmail.toLowerCase(), passwordHash, 'Admin', adminRoleId ?? null]
  );
  const adminUserId = adminResult.rows[0]?.id;
  console.log(`[provision] Created admin user: ${args.adminEmail} (id: ${adminUserId})`);

  // ── Step 7: Seed meta-schema with all 7 core tables ─────────────────────
  const coreMetaSchema = buildCoreMetaSchema(schoolId);
  await schoolPool.query(
    `INSERT INTO _meta_schema (school_id, schema_json, version)
     VALUES ($1, $2::jsonb, $3)`,
    [schoolId, JSON.stringify(coreMetaSchema), coreMetaSchema.version]
  );
  console.log(`[provision] Seeded meta-schema with ${coreMetaSchema.tables.length} core tables.`);

  // ── Step 8: Initialize receipt counter ───────────────────────────────────
  const year = new Date().getFullYear().toString();
  await schoolPool.query(
    `INSERT INTO counters (school_id, name, current_value)
     VALUES ($1, $2, 0)`,
    [schoolId, `receipt_${year}`]
  );

  // ── Step 9: Mark school as ACTIVE in control plane ────────────────────────
  await controlPool.query(
    `UPDATE schools SET status = 'ACTIVE', updated_at = now() WHERE id = $1`,
    [schoolId]
  );

  // ── Step 10: Log provision event ──────────────────────────────────────────
  const provisionHash = createHash('sha256')
    .update(schoolId + Date.now())
    .digest('hex')
    .slice(0, 16);

  await controlPool.query(
    `INSERT INTO provision_log (school_id, event, payload)
     VALUES ($1, 'COMPLETE', $2::jsonb)`,
    [schoolId, JSON.stringify({ db: dbName, token: provisionHash, tool: 'provision-local' })]
  );

  // ── Cleanup & Summary ─────────────────────────────────────────────────────
  await schoolPool.end();
  await controlPool.end();

  console.log('\n[provision] ─── Provisioning Complete ──────────────────────────');
  console.log(`  School ID:    ${schoolId}`);
  console.log(`  School Name:  ${args.name}`);
  console.log(`  Slug:         ${args.slug}`);
  console.log(`  Database:     ${dbName}`);
  console.log(`  Admin Email:  ${args.adminEmail}`);
  console.log(`  Admin Role:   SUPER_ADMIN`);
  console.log('\n  Add to .env.local:');
  console.log(`  SCHOOL_ID=${schoolId}`);
  console.log('\n  Test login:');
  console.log(`  POST http://localhost:4000/api/v1/auth/login`);
  console.log(`  { "email": "${args.adminEmail}", "password": "${args.adminPassword}", "schoolId": "${schoolId}" }`);
  console.log('');
}

main().catch(err => {
  console.error('\n[provision] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
