// Avanti Canvas Builder Types
// From TechnicalArchitecture_v1.docx Section 5.1
//
// Three canvas modes:
//   TABLE  — Schema canvas (Phase 3): builds database tables + fields
//   ROLE   — Role builder canvas (Phase 3+)
//   WORKFLOW — Workflow automation canvas (Phase 3+)
// State managed with Zustand. Graph rendering via @xyflow/react.

import type { PermissionSet } from './permissions.js';
import type { FieldType } from './meta-schema.js';

export type NodeType =
  | 'TABLE'             // Schema canvas: a database table
  | 'ROLE'
  | 'WORKFLOW_TRIGGER'
  | 'WORKFLOW_ACTION'
  | 'WORKFLOW_CONDITION'
  | 'WORKFLOW_END';

// ── Schema Canvas (Phase 3) ───────────────────────────────────────────────────

export interface TableFieldDraft {
  fieldId: string;       // stable UUID — set when field is created, never changes
  columnName: string;    // PostgreSQL column name (validated: [a-z0-9_])
  displayName: string;   // UI label
  type: FieldType;
  nullable: boolean;
  defaultValue: unknown | null;
  enumValues: string[] | null;  // only used when type === 'ENUM'
  isCore: boolean;              // platform-seeded, cannot be deleted
  isHidden: boolean;            // soft-deleted
}

export interface TableNodeData {
  tableId: string;        // stable UUID — MetaTable.id
  tableName: string;      // PostgreSQL table name
  displayName: string;    // UI label
  fields: TableFieldDraft[];
  isCore: boolean;        // system tables (users, students, etc.) cannot be deleted
  isHidden: boolean;
}

export interface RoleNodeData {
  roleId: string;
  roleName: string;
  permissions: PermissionSet;
  userCount: number;    // how many users are currently in this role
  isCore: boolean;      // core roles cannot be deleted
}

export type TriggerType = 'FORM_SUBMIT' | 'DATE_EVENT' | 'PAYMENT' | 'MANUAL';
export type WorkflowActionType = 'NOTIFY' | 'CREATE_RECORD' | 'ASSIGN_TASK' | 'REQUIRE_APPROVAL' | 'GENERATE_DOC';

export interface WorkflowNodeData {
  workflowId: string;
  label: string;
  triggerType?: TriggerType;
  actionType?: WorkflowActionType;
  config: Record<string, unknown>; // action-specific configuration
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: TableNodeData | RoleNodeData | WorkflowNodeData;
  selected: boolean;
}

export interface CanvasEdge {
  id: string;
  source: string;       // source node id
  target: string;       // target node id
  label?: string;       // condition label for workflow branches
  animated: boolean;
}

export interface CanvasSnapshot {
  canvasId: string;     // 'schema' | 'role' | custom ID
  schoolId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  version: number;
  savedAt: string;      // ISO timestamp
  savedBy: string;      // userId
}

// Saved canvas layout (node positions only — schema data lives in _meta_schema)
export interface CanvasLayout {
  canvasId: string;
  schoolId: string;
  positions: Record<string, { x: number; y: number }>;  // tableId → position
  savedAt: string;
  savedBy: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedIds: Set<string>;
  history: CanvasSnapshot[];    // undo stack
  future: CanvasSnapshot[];     // redo stack
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  lastSavedSnapshot: CanvasSnapshot | null;
}
