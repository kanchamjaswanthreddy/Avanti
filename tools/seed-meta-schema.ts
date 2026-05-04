#!/usr/bin/env node
// Avanti — Seed meta-schema for an existing school
//
// Populates _meta_schema with all 7 core business tables.
// Run this once against any school that was provisioned with the old
// empty meta-schema (`{"tables":[]}`).
//
// Usage:
//   npx tsx tools/seed-meta-schema.ts --school-id=<uuid>
//
// Example (Sunrise school):
//   npx tsx tools/seed-meta-schema.ts --school-id=6ba54cf8-e044-4f55-87e8-3afb956f0fdb

import pg from 'pg';
import { buildCoreMetaSchema } from '../packages/schema-engine/src/seed.js';

const { Pool } = pg;

// ── Parse CLI args ────────────────────────────────────────────────────────────

function parseArgs(): { schoolId: string } {
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--school-id=(.+)$/);
    if (match?.[1]) return { schoolId: match[1] };
  }
  console.error('Usage: npx tsx tools/seed-meta-schema.ts --school-id=<uuid>');
  process.exit(1);
}

// ── School DB name (same logic as provision-local.ts) ─────────────────────────

function schoolDbName(schoolId: string): string {
  return `avanti_school_${schoolId.replace(/-/g, '_').slice(0, 20)}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { schoolId } = parseArgs();

  const controlDbUrl = process.env['CONTROL_PLANE_DB_URL']
    ?? 'postgresql://dev_user:dev_password@localhost:5434/avanti_control';

  console.log(`\n[seed-meta-schema] Seeding meta-schema for school: ${schoolId}`);

  // ── Verify school exists in control plane ─────────────────────────────────
  const controlPool = new Pool({ connectionString: controlDbUrl });
  const schoolCheck = await controlPool.query<{ status: string }>(
    `SELECT status FROM schools WHERE id = $1`,
    [schoolId]
  );
  await controlPool.end();

  if (schoolCheck.rows.length === 0) {
    console.error(`[seed-meta-schema] ERROR: School ${schoolId} not found in control plane.`);
    process.exit(1);
  }
  console.log(`[seed-meta-schema] School status: ${schoolCheck.rows[0]!.status}`);

  // ── Connect to school DB ──────────────────────────────────────────────────
  const baseUrl = new URL(controlDbUrl);
  baseUrl.pathname = `/${schoolDbName(schoolId)}`;
  const schoolPool = new Pool({ connectionString: baseUrl.toString() });

  try {
    // ── Build and upsert meta-schema ────────────────────────────────────────
    const meta = buildCoreMetaSchema(schoolId);

    const result = await schoolPool.query<{ version: number }>(
      `INSERT INTO _meta_schema (school_id, schema_json, version)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (school_id)
       DO UPDATE SET
         schema_json = EXCLUDED.schema_json,
         version     = EXCLUDED.version,
         updated_at  = now()
       RETURNING version`,
      [schoolId, JSON.stringify(meta), meta.version]
    );

    const version = result.rows[0]?.version;
    console.log(`[seed-meta-schema] Done — ${meta.tables.length} core tables seeded (version: ${version}).`);
    console.log('\n  Core tables:');
    for (const t of meta.tables) {
      console.log(`    ${t.tableName.padEnd(20)} ${t.fields.length} fields`);
    }
    console.log('\n  Open the canvas at http://localhost:3000/canvas/schema\n');

  } finally {
    await schoolPool.end();
  }
}

main().catch(err => {
  console.error('\n[seed-meta-schema] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
