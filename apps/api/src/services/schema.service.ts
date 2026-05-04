// Vidyut API — Schema Service
// Thin wrapper around the schema-engine package for use in API routes.
// Adds permission checks and request validation.

import type pg from 'pg';
import type { SchemaChangeDescriptor, SchemaChangeResult, MetaSchema } from '@vidyut/types';
import { executeSchemaChanges, getMetaSchema } from '@vidyut/schema-engine';

export { getMetaSchema };

export async function applyChanges(
  db: pg.Pool,
  schoolId: string,
  changes: SchemaChangeDescriptor[],
  userId: string
): Promise<SchemaChangeResult & { metaSchema?: MetaSchema }> {
  // Stamp requestedBy on all changes
  const stamped = changes.map(c => ({ ...c, requestedBy: userId }));

  const result = await executeSchemaChanges(db, schoolId, stamped);

  if (result.success) {
    // Return updated meta-schema so client can refresh canvas state
    const metaSchema = await getMetaSchema(db, schoolId);
    return { ...result, metaSchema };
  }

  return result;
}

export async function getSchemaChangeLog(
  db: pg.Pool,
  schoolId: string,
  limit = 50
): Promise<Array<{
  id: string;
  version: number;
  appliedAt: string;
  appliedBy: string;
  changes: SchemaChangeDescriptor[];
}>> {
  const result = await db.query<{
    id: string;
    version: number;
    applied_at: Date;
    applied_by: string;
    changes_json: SchemaChangeDescriptor[];
  }>(
    `SELECT id, version, applied_at, applied_by, changes_json
     FROM _schema_change_log
     WHERE school_id = $1
     ORDER BY version DESC
     LIMIT $2`,
    [schoolId, limit]
  );

  return result.rows.map(r => ({
    id:         r.id,
    version:    r.version,
    appliedAt:  r.applied_at.toISOString(),
    appliedBy:  r.applied_by,
    changes:    Array.isArray(r.changes_json) ? r.changes_json : [],
  }));
}
