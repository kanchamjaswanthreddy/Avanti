// Vidyut Schema Migration Engine — DDL Executor
// From TechnicalArchitecture_v1.docx Section 4.2
//
// Receives a typed SchemaChangeDescriptor[], applies the DDL in a single
// transaction alongside the meta-schema update. Full rollback on any failure.
//
// SECURITY: All user-supplied identifiers pass validateIdentifier() + sanitizeIdentifier()
// before touching SQL. Zero string interpolation of unvalidated input.
// Default values go through pgLiteral() which type-checks and escapes them.

import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type {
  MetaSchema, MetaTable, MetaField, FieldType,
  SchemaChangeDescriptor, SchemaChangeResult,
  AddTablePayload, AddColumnPayload, DropColumnPayload, DropTablePayload,
  RenameColumnPayload, ChangeTypePayload, SetDefaultPayload,
  SetNullablePayload, AddEnumValuePayload,
} from '@vidyut/types';
import { validateIdentifier, sanitizeIdentifier } from '@vidyut/utils';
import { readMetaSchema, writeMetaSchema } from './meta.js';

// ── Identifier safety ─────────────────────────────────────────────────────────

function safeId(name: string): string {
  const result = validateIdentifier(name);
  if (!result.ok) throw new Error(`Invalid identifier "${name}": ${result.error}`);
  return sanitizeIdentifier(name);
}

// ── Field type → PostgreSQL type ──────────────────────────────────────────────

function toPgType(fieldType: FieldType): string {
  const map: Record<FieldType, string> = {
    TEXT:        'TEXT',
    INTEGER:     'INTEGER',
    DECIMAL:     'NUMERIC(15,4)',
    BOOLEAN:     'BOOLEAN',
    DATE:        'DATE',
    TIMESTAMPTZ: 'TIMESTAMPTZ',
    UUID:        'UUID',
    ENUM:        'TEXT',          // enum values live in meta-schema, not PG ENUM
    JSONB:       'JSONB',
    FILE_REF:    'UUID',          // GCS object reference
  };
  return map[fieldType] ?? 'TEXT';
}

// ── Safe default value → SQL literal ─────────────────────────────────────────
// NEVER call this with unvalidated user input for dynamic SQL.
// Only used for scalar default values in column definitions.

function pgDefaultLiteral(value: unknown, type: FieldType): string {
  if (value === null || value === undefined) return 'NULL';

  switch (type) {
    case 'INTEGER': {
      const n = parseInt(String(value), 10);
      if (!Number.isInteger(n)) throw new Error(`Invalid INTEGER default: ${String(value)}`);
      return String(n);
    }
    case 'DECIMAL': {
      const n = parseFloat(String(value));
      if (!Number.isFinite(n)) throw new Error(`Invalid DECIMAL default: ${String(value)}`);
      return String(n);
    }
    case 'BOOLEAN':
      return value ? 'TRUE' : 'FALSE';
    case 'TEXT':
    case 'ENUM':
      // Escape single quotes by doubling them (standard SQL)
      return `'${String(value).replace(/'/g, "''")}'`;
    case 'DATE':
      // Validate ISO date format before using as literal
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        throw new Error(`Invalid DATE default: ${String(value)}`);
      }
      return `'${String(value)}'`;
    default:
      // No default supported for UUID, JSONB, TIMESTAMPTZ, FILE_REF via canvas
      throw new Error(`Default values not supported for type ${type}.`);
  }
}

// ── Build column definition string ───────────────────────────────────────────

function buildColDef(
  colName: string,
  type: FieldType,
  nullable: boolean,
  defaultValue: unknown | null
): string {
  const pgType  = toPgType(type);
  const notNull = nullable ? '' : ' NOT NULL';
  let def = '';
  if (defaultValue !== null && defaultValue !== undefined) {
    try {
      def = ` DEFAULT ${pgDefaultLiteral(defaultValue, type)}`;
    } catch {
      // Skip unsupported defaults — user can add later
    }
  }
  return `${safeId(colName)} ${pgType}${notNull}${def}`;
}

// ── Apply a single schema change ──────────────────────────────────────────────

async function applyChange(
  client: pg.PoolClient,
  meta: MetaSchema,
  change: SchemaChangeDescriptor
): Promise<void> {
  const now = new Date().toISOString();

  switch (change.action) {

    // ── ADD_TABLE ─────────────────────────────────────────────────────────────
    case 'ADD_TABLE': {
      const payload = change.payload as AddTablePayload;
      const tableName = safeId(payload.tableName);

      const colDefs = payload.fields.map(f =>
        '  ' + buildColDef(f.columnName, f.type, f.nullable, f.defaultValue)
      );

      await client.query(`
        CREATE TABLE ${tableName} (
          id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id  UUID NOT NULL,
          ${colDefs.join(',\n          ')},
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      // Index on school_id for all school-scoped tables
      await client.query(
        `CREATE INDEX ${tableName}_school_idx ON ${tableName} (school_id)`
      );

      // Auto-update updated_at trigger
      await client.query(`
        CREATE TRIGGER trg_${tableName}_updated_at
          BEFORE UPDATE ON ${tableName}
          FOR EACH ROW EXECUTE FUNCTION _vidyut_update_updated_at()
      `);

      // Add to meta-schema
      const newTable: MetaTable = {
        id:           change.tableId,
        tableName:    payload.tableName,
        displayName:  payload.displayName,
        displayNames: payload.displayNames ?? {},
        isCore:       false,
        isHidden:     false,
        createdAt:    now,
        fields:       payload.fields.map((f) => ({
          id:           randomUUID(),
          columnName:   f.columnName,
          displayName:  f.displayName,
          displayNames: f.displayNames ?? {},
          type:         f.type,
          nullable:     f.nullable,
          defaultValue: f.defaultValue,
          enumValues:   f.enumValues ?? null,
          isCore:       false,
          isHidden:     false,
          createdAt:    now,
          createdBy:    change.requestedBy,
        })),
      };
      meta.tables.push(newTable);
      break;
    }

    // ── DROP_TABLE ────────────────────────────────────────────────────────────
    case 'DROP_TABLE': {
      const payload = change.payload as DropTablePayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found in meta-schema.`);
      if (table.isCore) throw new Error(`Cannot delete system table "${table.tableName}".`);

      if (payload.hardDelete) {
        await client.query(`DROP TABLE IF EXISTS ${safeId(table.tableName)} CASCADE`);
        meta.tables = meta.tables.filter(t => t.id !== change.tableId);
      } else {
        table.isHidden = true;
      }
      break;
    }

    // ── ADD_COLUMN ────────────────────────────────────────────────────────────
    case 'ADD_COLUMN': {
      const payload = change.payload as AddColumnPayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found.`);
      if (table.isHidden) throw new Error(`Cannot add column to hidden table "${table.tableName}".`);

      const tableName = safeId(table.tableName);
      const colDef    = buildColDef(payload.columnName, payload.type, payload.nullable, payload.defaultValue);

      await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${colDef}`);

      const newField: MetaField = {
        id:           change.fieldId ?? randomUUID(),
        columnName:   payload.columnName,
        displayName:  payload.displayName,
        displayNames: payload.displayNames ?? {},
        type:         payload.type,
        nullable:     payload.nullable,
        defaultValue: payload.defaultValue,
        enumValues:   payload.enumValues ?? null,
        isCore:       false,
        isHidden:     false,
        createdAt:    now,
        createdBy:    change.requestedBy,
      };
      table.fields.push(newField);
      break;
    }

    // ── DROP_COLUMN ───────────────────────────────────────────────────────────
    case 'DROP_COLUMN': {
      const payload = change.payload as DropColumnPayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found.`);
      const field = table.fields.find(f => f.id === change.fieldId);
      if (!field) throw new Error(`Field ${change.fieldId ?? '?'} not found.`);
      if (field.isCore) throw new Error(`Cannot delete system field "${field.columnName}".`);

      if (payload.hardDelete) {
        await client.query(
          `ALTER TABLE ${safeId(table.tableName)} DROP COLUMN IF EXISTS ${safeId(field.columnName)}`
        );
        table.fields = table.fields.filter(f => f.id !== change.fieldId);
      } else {
        field.isHidden = true;
      }
      break;
    }

    // ── RENAME_COLUMN ─────────────────────────────────────────────────────────
    case 'RENAME_COLUMN': {
      const payload = change.payload as RenameColumnPayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found.`);
      const field = table.fields.find(f => f.id === change.fieldId);
      if (!field) throw new Error(`Field ${change.fieldId ?? '?'} not found.`);

      const newColName = safeId(payload.newColumnName);
      await client.query(
        `ALTER TABLE ${safeId(table.tableName)} RENAME COLUMN ${safeId(field.columnName)} TO ${newColName}`
      );
      field.columnName   = payload.newColumnName;
      field.displayName  = payload.newDisplayName;
      if (payload.newDisplayNames) field.displayNames = payload.newDisplayNames;
      break;
    }

    // ── CHANGE_COLUMN_TYPE ────────────────────────────────────────────────────
    case 'CHANGE_COLUMN_TYPE': {
      const payload = change.payload as ChangeTypePayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found.`);
      const field = table.fields.find(f => f.id === change.fieldId);
      if (!field) throw new Error(`Field ${change.fieldId ?? '?'} not found.`);

      const newPgType = toPgType(payload.newType);
      // USING cast — let PostgreSQL try. Will fail if data can't be cast.
      await client.query(
        `ALTER TABLE ${safeId(table.tableName)}
         ALTER COLUMN ${safeId(field.columnName)} TYPE ${newPgType}
         USING ${safeId(field.columnName)}::${newPgType}`
      );
      field.type       = payload.newType;
      field.enumValues = payload.newEnumValues ?? null;
      break;
    }

    // ── ADD_ENUM_VALUE ────────────────────────────────────────────────────────
    case 'ADD_ENUM_VALUE': {
      const payload = change.payload as AddEnumValuePayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found.`);
      const field = table.fields.find(f => f.id === change.fieldId);
      if (!field) throw new Error(`Field ${change.fieldId ?? '?'} not found.`);
      if (field.type !== 'ENUM') throw new Error(`Field "${field.columnName}" is not type ENUM.`);

      // Enum values stored in meta-schema only (column type is TEXT in PG)
      if (!field.enumValues) field.enumValues = [];
      if (!field.enumValues.includes(payload.value)) {
        field.enumValues = [...field.enumValues, payload.value];
      }
      break;
    }

    // ── SET_DEFAULT ───────────────────────────────────────────────────────────
    case 'SET_DEFAULT': {
      const payload = change.payload as SetDefaultPayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found.`);
      const field = table.fields.find(f => f.id === change.fieldId);
      if (!field) throw new Error(`Field ${change.fieldId ?? '?'} not found.`);

      if (payload.defaultValue === null) {
        await client.query(
          `ALTER TABLE ${safeId(table.tableName)} ALTER COLUMN ${safeId(field.columnName)} DROP DEFAULT`
        );
      } else {
        const lit = pgDefaultLiteral(payload.defaultValue, field.type);
        await client.query(
          `ALTER TABLE ${safeId(table.tableName)} ALTER COLUMN ${safeId(field.columnName)} SET DEFAULT ${lit}`
        );
      }
      field.defaultValue = payload.defaultValue;
      break;
    }

    // ── SET_NULLABLE ──────────────────────────────────────────────────────────
    case 'SET_NULLABLE': {
      const payload = change.payload as SetNullablePayload;
      const table = meta.tables.find(t => t.id === change.tableId);
      if (!table) throw new Error(`Table ${change.tableId} not found.`);
      const field = table.fields.find(f => f.id === change.fieldId);
      if (!field) throw new Error(`Field ${change.fieldId ?? '?'} not found.`);

      if (payload.nullable) {
        await client.query(
          `ALTER TABLE ${safeId(table.tableName)} ALTER COLUMN ${safeId(field.columnName)} DROP NOT NULL`
        );
      } else {
        await client.query(
          `ALTER TABLE ${safeId(table.tableName)} ALTER COLUMN ${safeId(field.columnName)} SET NOT NULL`
        );
      }
      field.nullable = payload.nullable;
      break;
    }

    default:
      throw new Error(`Unknown schema change action: ${(change as SchemaChangeDescriptor).action}`);
  }
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeSchemaChanges(
  db: pg.Pool,
  schoolId: string,
  changes: SchemaChangeDescriptor[]
): Promise<SchemaChangeResult> {
  if (changes.length === 0) return { success: true };

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Load meta-schema with FOR UPDATE lock to prevent concurrent changes
    const meta = await readMetaSchema(client, schoolId);

    // Apply each change, mutating meta in memory
    for (const change of changes) {
      await applyChange(client, meta, change);
    }

    // Write updated meta-schema (increments version atomically)
    const newVersion = await writeMetaSchema(client, schoolId, meta);

    // Immutable audit log
    await client.query(
      `INSERT INTO _schema_change_log (school_id, changes_json, version, applied_by)
       VALUES ($1, $2::jsonb, $3, $4)`,
      [schoolId, JSON.stringify(changes), newVersion, changes[0]?.requestedBy ?? 'system']
    );

    await client.query('COMMIT');
    return { success: true, newVersion };

  } catch (err) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : 'Unknown error during schema change.';
    return { success: false, error: message };
  } finally {
    client.release();
  }
}
