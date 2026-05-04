// Vidyut Schema Migration Engine — Change Descriptor Types
// From TechnicalArchitecture_v1.docx Section 4.2
//
// The canvas never sends raw SQL to the SME.
// It sends a typed SchemaChangeDescriptor describing the intent.
// The SME generates and executes the SQL from this descriptor.

import type { FieldType } from './meta-schema.js';

export type ChangeAction =
  | 'ADD_TABLE'
  | 'DROP_TABLE'          // soft-delete only unless explicitly confirmed
  | 'ADD_COLUMN'
  | 'DROP_COLUMN'         // soft-delete only unless explicitly confirmed
  | 'RENAME_COLUMN'
  | 'CHANGE_COLUMN_TYPE'  // only allowed when no data exists in column
  | 'ADD_ENUM_VALUE'
  | 'SET_DEFAULT'
  | 'SET_NULLABLE';

export interface AddColumnPayload {
  columnName: string;
  displayName: string;
  displayNames?: Record<string, string>;
  type: FieldType;
  nullable: boolean;
  defaultValue: unknown | null;
  enumValues?: string[];
}

export interface AddTablePayload {
  tableName: string;
  displayName: string;
  displayNames?: Record<string, string>;
  fields: AddColumnPayload[];
}

export interface DropColumnPayload {
  hardDelete: boolean; // false = soft-delete (isHidden), true = DROP COLUMN (requires confirmation)
}

export interface DropTablePayload {
  hardDelete: boolean;
}

export interface RenameColumnPayload {
  newColumnName: string;
  newDisplayName: string;
  newDisplayNames?: Record<string, string>;
}

export interface ChangeTypePayload {
  newType: FieldType;
  newEnumValues?: string[];
}

export interface SetDefaultPayload {
  defaultValue: unknown | null;
}

export interface SetNullablePayload {
  nullable: boolean;
}

export interface AddEnumValuePayload {
  value: string;
}

export type ChangePayload =
  | AddTablePayload
  | AddColumnPayload
  | DropColumnPayload
  | DropTablePayload
  | RenameColumnPayload
  | ChangeTypePayload
  | SetDefaultPayload
  | SetNullablePayload
  | AddEnumValuePayload;

export interface SchemaChangeDescriptor {
  action: ChangeAction;
  tableId: string;        // MetaTable.id
  fieldId?: string;       // MetaField.id — for column-level actions
  payload: ChangePayload;
  requestedBy: string;    // userId
  timestamp: string;      // ISO timestamp
}

export interface SchemaChangeResult {
  success: boolean;
  newVersion?: number;
  error?: string;
}
