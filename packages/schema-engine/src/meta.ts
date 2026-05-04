// Vidyut SME — Meta-Schema Read/Write
// From TechnicalArchitecture_v1.docx Section 4.1
//
// The meta-schema is the single source of truth for a school's data model.
// All reads and writes go through these functions within a transaction.
// FOR UPDATE locking prevents concurrent schema changes on the same school.

import type pg from 'pg';
import type { MetaSchema } from '@vidyut/types';

export async function readMetaSchema(
  client: pg.PoolClient,
  schoolId: string
): Promise<MetaSchema> {
  const result = await client.query<{
    schema_json: MetaSchema | string;
    version: number;
    school_id: string;
    updated_at: Date;
  }>(
    `SELECT schema_json, version, school_id, updated_at
     FROM _meta_schema
     WHERE school_id = $1
     FOR UPDATE`,
    [schoolId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Meta-schema not found for school ${schoolId}. Was the school provisioned?`);
  }

  // pg returns JSONB as already-parsed object; handle both cases
  const schema: MetaSchema = typeof row.schema_json === 'string'
    ? (JSON.parse(row.schema_json) as MetaSchema)
    : row.schema_json;

  schema.version   = row.version;
  schema.schoolId  = row.school_id;
  schema.updatedAt = row.updated_at.toISOString();
  return schema;
}

export async function writeMetaSchema(
  client: pg.PoolClient,
  schoolId: string,
  meta: MetaSchema
): Promise<number> {
  meta.updatedAt = new Date().toISOString();

  const result = await client.query<{ version: number }>(
    `UPDATE _meta_schema
     SET schema_json = $1::jsonb, version = version + 1, updated_at = now()
     WHERE school_id = $2
     RETURNING version`,
    [JSON.stringify(meta), schoolId]
  );

  const newVersion = result.rows[0]?.version;
  if (newVersion === undefined) {
    throw new Error(`Failed to update meta-schema for school ${schoolId}.`);
  }

  meta.version = newVersion;
  return newVersion;
}

// Read-only (no FOR UPDATE) — for API responses, not schema changes
export async function getMetaSchema(
  db: pg.Pool,
  schoolId: string
): Promise<MetaSchema> {
  const result = await db.query<{
    schema_json: MetaSchema | string;
    version: number;
    school_id: string;
    updated_at: Date;
  }>(
    `SELECT schema_json, version, school_id, updated_at
     FROM _meta_schema
     WHERE school_id = $1`,
    [schoolId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Meta-schema not found for school ${schoolId}.`);
  }

  const schema: MetaSchema = typeof row.schema_json === 'string'
    ? (JSON.parse(row.schema_json) as MetaSchema)
    : row.schema_json;

  schema.version   = row.version;
  schema.schoolId  = row.school_id;
  schema.updatedAt = row.updated_at.toISOString();
  return schema;
}
