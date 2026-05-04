// Avanti Canvas Store — Zustand v5
// Owns the canonical canvas state: nodes, base meta-schema, undo/redo history.
// React Flow reads from this store and syncs position changes back via syncPositions().
//
// Separation of concerns:
//   Schema mutations (addTable, updateTableData, deleteTable) → push to undo history
//   Position-only changes (drag) → sync via syncPositions(), no history entry
//   save() → computes diff against baseMetaSchema, calls API, refreshes nodes

import { create } from 'zustand';
import type {
  MetaSchema,
  CanvasNode,
  CanvasEdge,
  CanvasLayout,
  TableNodeData,
  TableFieldDraft,
  FieldType,
} from '@avanti/types';
import { computeDiff, metaSchemaToNodes } from '@avanti/schema-engine/diff';
import { getApiClient } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface CanvasStore {
  // Identity
  canvasId: string | null;
  schoolId: string | null;

  // Canonical state (schema data + positions, kept in sync)
  baseMetaSchema: MetaSchema | null;
  nodes: CanvasNode[];
  edges: CanvasEdge[];

  // Undo/redo (schema changes only)
  history: HistoryEntry[];
  future:  HistoryEntry[];

  // Save state
  isDirty:   boolean;
  isSaving:  boolean;
  saveError: string | null;
  lastSaved: Date | null;

  // ── Actions ──────────────────────────────────────────────────────────────────

  /** Initialize from API response — call after loadCanvas API call */
  loadCanvas(canvasId: string, layout: CanvasLayout, metaSchema: MetaSchema): void;

  /** Add a new TABLE node; generates a stable UUID for the table */
  addTable(params: {
    tableName: string;
    displayName: string;
    position: { x: number; y: number };
  }): void;

  /** Update the TableNodeData of a specific table node */
  updateTableData(
    tableId: string,
    updater: (data: TableNodeData) => TableNodeData
  ): void;

  /** Remove a TABLE node (skips isCore tables) */
  deleteTable(tableId: string): void;

  /** Sync positions from React Flow after node drag — no undo history */
  syncPositions(positionMap: Record<string, { x: number; y: number }>): void;

  // History
  undo(): void;
  redo(): void;

  // Save
  save(userId: string): Promise<void>;
  clearSaveError(): void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvasId:       null,
  schoolId:       null,
  baseMetaSchema: null,
  nodes:          [],
  edges:          [],
  history:        [],
  future:         [],
  isDirty:        false,
  isSaving:       false,
  saveError:      null,
  lastSaved:      null,

  loadCanvas(canvasId, layout, metaSchema) {
    const nodes = metaSchemaToNodes(metaSchema, layout.positions);
    set({
      canvasId,
      schoolId:       metaSchema.schoolId,
      baseMetaSchema: metaSchema,
      nodes,
      edges:     [],
      history:   [],
      future:    [],
      isDirty:   false,
      isSaving:  false,
      saveError: null,
      lastSaved: null,
    });
  },

  addTable({ tableName, displayName, position }) {
    const tableId  = crypto.randomUUID();
    const newNode: CanvasNode = {
      id:       tableId,
      type:     'TABLE',
      position,
      selected: false,
      data:     {
        tableId,
        tableName,
        displayName,
        fields:  [],
        isCore:  false,
        isHidden: false,
      } satisfies TableNodeData,
    };
    const { nodes, edges, history } = get();
    set({
      history: [...history, { nodes: [...nodes], edges: [...edges] }].slice(-50),
      future:  [],
      nodes:   [...nodes, newNode],
      isDirty: true,
    });
  },

  updateTableData(tableId, updater) {
    const { nodes, edges, history } = get();
    set({
      history: [...history, { nodes: [...nodes], edges: [...edges] }].slice(-50),
      future:  [],
      nodes:   nodes.map(n => {
        if (n.id !== tableId || n.type !== 'TABLE') return n;
        return { ...n, data: updater(n.data as TableNodeData) };
      }),
      isDirty: true,
    });
  },

  deleteTable(tableId) {
    const { nodes, edges, history } = get();
    const target = nodes.find(n => n.id === tableId);
    if (!target) return;
    if (target.type === 'TABLE' && (target.data as TableNodeData).isCore) return;
    set({
      history: [...history, { nodes: [...nodes], edges: [...edges] }].slice(-50),
      future:  [],
      nodes:   nodes.filter(n => n.id !== tableId),
      isDirty: true,
    });
  },

  syncPositions(positionMap) {
    const { nodes } = get();
    const updated = nodes.map(n => {
      const pos = positionMap[n.id];
      return pos ? { ...n, position: pos } : n;
    });
    set({ nodes: updated, isDirty: true });
  },

  undo() {
    const { history, future, nodes, edges } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    set({
      history: history.slice(0, -1),
      future:  [...future, { nodes, edges }],
      nodes:   prev.nodes,
      edges:   prev.edges,
      isDirty: true,
    });
  },

  redo() {
    const { history, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[future.length - 1]!;
    set({
      future:  future.slice(0, -1),
      history: [...history, { nodes, edges }],
      nodes:   next.nodes,
      edges:   next.edges,
      isDirty: true,
    });
  },

  async save(userId) {
    const { canvasId, nodes, schoolId, baseMetaSchema } = get();
    if (!canvasId || !schoolId || !baseMetaSchema) return;

    set({ isSaving: true, saveError: null });

    try {
      const changes = computeDiff(nodes, baseMetaSchema, userId);

      const positionMap = Object.fromEntries(nodes.map(n => [n.id, n.position]));
      const layout: CanvasLayout = {
        canvasId,
        schoolId,
        positions: positionMap,
        savedAt: new Date().toISOString(),
        savedBy: userId,
      };

      const result = await getApiClient().saveCanvas(canvasId, layout, changes);

      // Refresh nodes from updated meta-schema, preserving positions
      const freshNodes = metaSchemaToNodes(result.metaSchema, positionMap);

      set({
        baseMetaSchema: result.metaSchema,
        nodes:     freshNodes,
        isSaving:  false,
        isDirty:   false,
        lastSaved: new Date(),
        history:   [],
        future:    [],
      });
    } catch (err) {
      set({
        isSaving:  false,
        saveError: err instanceof Error ? err.message : 'Save failed. Please try again.',
      });
    }
  },

  clearSaveError() {
    set({ saveError: null });
  },
}));

// ── Field helpers (used by TableNode edit handlers) ───────────────────────────

export function makeField(overrides: Partial<TableFieldDraft> & { columnName: string; displayName: string; type: FieldType }): TableFieldDraft {
  return {
    fieldId:      crypto.randomUUID(),
    columnName:   overrides.columnName,
    displayName:  overrides.displayName,
    type:         overrides.type,
    nullable:     overrides.nullable ?? true,
    defaultValue: overrides.defaultValue ?? null,
    enumValues:   overrides.enumValues ?? null,
    isCore:       false,
    isHidden:     false,
  };
}
