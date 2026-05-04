// Vidyut SME — Canvas Diff Algorithm
// From TechnicalArchitecture_v1.docx Section 5.2
//
// Computes SchemaChangeDescriptor[] by diffing the current canvas state
// against the last-known meta-schema. The meta-schema is the ground truth;
// the canvas shows pending edits on top of it.
//
// Field identity is tracked by fieldId (stable UUID assigned at creation).
// Table identity tracked by tableId.

import type {
  MetaSchema, MetaTable, MetaField,
  CanvasNode, TableNodeData, TableFieldDraft,
  SchemaChangeDescriptor,
  AddTablePayload, AddColumnPayload, DropColumnPayload, DropTablePayload,
  RenameColumnPayload, ChangeTypePayload, SetNullablePayload,
} from '@vidyut/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTableNodes(nodes: CanvasNode[]): Array<CanvasNode & { data: TableNodeData }> {
  return nodes.filter(
    (n): n is CanvasNode & { data: TableNodeData } => n.type === 'TABLE'
  );
}

// ── Main diff function ────────────────────────────────────────────────────────

export function computeDiff(
  currentNodes: CanvasNode[],
  metaSchema: MetaSchema,
  requestedBy: string
): SchemaChangeDescriptor[] {
  const changes: SchemaChangeDescriptor[] = [];
  const timestamp = new Date().toISOString();

  const tableNodes = getTableNodes(currentNodes);

  // Index saved tables by ID
  const savedTablesById = new Map<string, MetaTable>(
    metaSchema.tables.filter(t => !t.isHidden).map(t => [t.id, t])
  );
  // Index current canvas tables by ID
  const currentTablesById = new Map<string, CanvasNode & { data: TableNodeData }>(
    tableNodes.map(n => [n.data.tableId, n])
  );

  // ── NEW TABLES (in canvas, not in meta-schema) ────────────────────────────
  for (const [tableId, node] of currentTablesById) {
    if (savedTablesById.has(tableId)) continue;

    const data = node.data;
    const visibleFields = data.fields.filter(f => !f.isHidden && !f.isCore);

    const payload: AddTablePayload = {
      tableName:    data.tableName,
      displayName:  data.displayName,
      displayNames: {},
      fields:       visibleFields.map(f => ({
        columnName:   f.columnName,
        displayName:  f.displayName,
        displayNames: {},
        type:         f.type,
        nullable:     f.nullable,
        defaultValue: f.defaultValue,
        ...(f.enumValues !== null ? { enumValues: f.enumValues } : {}),
      })),
    };

    changes.push({ action: 'ADD_TABLE', tableId, payload, requestedBy, timestamp });
  }

  // ── REMOVED TABLES (in meta-schema, not in canvas) ────────────────────────
  for (const [tableId, table] of savedTablesById) {
    if (currentTablesById.has(tableId)) continue;
    if (table.isCore) continue;  // never auto-drop core tables

    const payload: DropTablePayload = { hardDelete: false };
    changes.push({ action: 'DROP_TABLE', tableId, payload, requestedBy, timestamp });
  }

  // ── CHANGED TABLES (field-level diff) ────────────────────────────────────
  for (const [tableId, node] of currentTablesById) {
    const savedTable = savedTablesById.get(tableId);
    if (!savedTable) continue;  // new table handled above

    const currentData = node.data;
    const savedFieldsById = new Map<string, MetaField>(
      savedTable.fields.map(f => [f.id, f])
    );
    const currentFieldsById = new Map<string, TableFieldDraft>(
      currentData.fields.map(f => [f.fieldId, f])
    );

    // NEW FIELDS
    for (const [fieldId, field] of currentFieldsById) {
      if (savedFieldsById.has(fieldId)) continue;
      if (field.isCore || field.isHidden) continue;

      const payload: AddColumnPayload = {
        columnName:   field.columnName,
        displayName:  field.displayName,
        displayNames: {},
        type:         field.type,
        nullable:     field.nullable,
        defaultValue: field.defaultValue,
        ...(field.enumValues !== null ? { enumValues: field.enumValues } : {}),
      };
      changes.push({ action: 'ADD_COLUMN', tableId, fieldId, payload, requestedBy, timestamp });
    }

    // REMOVED FIELDS
    for (const [fieldId, savedField] of savedFieldsById) {
      if (currentFieldsById.has(fieldId)) continue;
      if (savedField.isCore) continue;

      const payload: DropColumnPayload = { hardDelete: false };
      changes.push({ action: 'DROP_COLUMN', tableId, fieldId, payload, requestedBy, timestamp });
    }

    // CHANGED FIELDS
    for (const [fieldId, currentField] of currentFieldsById) {
      const savedField = savedFieldsById.get(fieldId);
      if (!savedField) continue;  // new field handled above

      // Column rename takes priority over type change
      if (currentField.columnName !== savedField.columnName) {
        const payload: RenameColumnPayload = {
          newColumnName:  currentField.columnName,
          newDisplayName: currentField.displayName,
          newDisplayNames: {},
        };
        changes.push({ action: 'RENAME_COLUMN', tableId, fieldId, payload, requestedBy, timestamp });

      } else if (currentField.type !== savedField.type) {
        const payload: ChangeTypePayload = {
          newType: currentField.type,
          ...(currentField.enumValues !== null ? { newEnumValues: currentField.enumValues } : {}),
        };
        changes.push({ action: 'CHANGE_COLUMN_TYPE', tableId, fieldId, payload, requestedBy, timestamp });

      } else if (currentField.nullable !== savedField.nullable) {
        const payload: SetNullablePayload = { nullable: currentField.nullable };
        changes.push({ action: 'SET_NULLABLE', tableId, fieldId, payload, requestedBy, timestamp });
      }
    }
  }

  return changes;
}

// ── Build canvas nodes from meta-schema ───────────────────────────────────────
// Used when loading the canvas: converts MetaSchema → CanvasNode[] with positions

export function metaSchemaToNodes(
  metaSchema: MetaSchema,
  positions: Record<string, { x: number; y: number }>
): CanvasNode[] {
  return metaSchema.tables
    .filter(t => !t.isHidden)
    .map((table, i) => {
      const pos = positions[table.id] ?? { x: 50 + (i % 4) * 320, y: 50 + Math.floor(i / 4) * 380 };
      return {
        id:       table.id,
        type:     'TABLE' as const,
        position: pos,
        selected: false,
        data: {
          tableId:     table.id,
          tableName:   table.tableName,
          displayName: table.displayName,
          fields:      table.fields.map(f => ({
            fieldId:      f.id,
            columnName:   f.columnName,
            displayName:  f.displayName,
            type:         f.type,
            nullable:     f.nullable,
            defaultValue: f.defaultValue,
            enumValues:   f.enumValues,
            isCore:       f.isCore,
            isHidden:     f.isHidden,
          })),
          isCore:   table.isCore,
          isHidden: table.isHidden,
        } satisfies import('@vidyut/types').TableNodeData,
      };
    });
}
