// Vidyut Meta-Schema Registry Types
// From TechnicalArchitecture_v1.docx Section 4.1
//
// The meta-schema is stored in _meta_schema table in each school's DB.
// It is the single source of truth for the school's current data model.
// The frontend ALWAYS reads this — never introspects the database directly.

export type FieldType =
  | 'TEXT'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'TIMESTAMPTZ'
  | 'UUID'
  | 'ENUM'
  | 'JSONB'
  | 'FILE_REF';

export interface MetaField {
  id: string;           // stable UUID — never changes even if column is renamed
  columnName: string;   // actual PostgreSQL column name
  displayName: string;  // label shown in UI
  // Per-language display names for i18n: { 'en': 'Blood Group', 'hi': 'रक्त समूह', ... }
  displayNames: Record<string, string>;
  type: FieldType;
  nullable: boolean;
  defaultValue: unknown | null;
  enumValues: string[] | null; // only if type === 'ENUM'
  isCore: boolean;      // true = seeded by platform, cannot be deleted
  isHidden: boolean;    // soft-deleted: hidden from UI but not dropped from DB
  createdAt: string;    // ISO timestamp
  createdBy: string;    // userId who added this field
}

export interface MetaTable {
  id: string;
  tableName: string;    // actual PostgreSQL table name
  displayName: string;  // label shown in UI
  displayNames: Record<string, string>;
  isCore: boolean;
  isHidden: boolean;
  fields: MetaField[];
  createdAt: string;
}

export interface MetaSchema {
  version: number;      // increments on every schema change
  schoolId: string;
  tables: MetaTable[];
  updatedAt: string;    // ISO timestamp
}
