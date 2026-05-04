// Avanti — Canvas Editor
// React Flow–based schema canvas. Completely reskinned — no default RF UI visible.
// Uses Zustand canvasStore as the single source of truth for schema state.
// React Flow manages rendering + drag interaction; positions sync back on drag stop.
//
// Flow:
//   mount → fetch canvas from API → canvasStore.loadCanvas()
//   drag  → onNodeDragStop → canvasStore.syncPositions()
//   save  → computeDiff → (if changes) ChangePreviewModal → canvasStore.save()

'use client';

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AnimatePresence } from 'motion/react';

import { useCanvasStore } from '../../store/canvasStore';
import { useAuthStore } from '../../store/authStore';
import { getApiClient } from '../../lib/api';
import { computeDiff } from '@avanti/schema-engine/diff';
import { TableNode } from './nodes/TableNode';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { ChangePreviewModal } from './ChangePreviewModal';
import type { CanvasLayout, MetaSchema, SchemaChangeDescriptor, CanvasEdge, TableNodeData } from '@avanti/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CanvasEditorProps {
  canvasId: string;
  title:    string;
}

// Use React Flow's base Node type (data: Record<string,unknown>)
// Our custom data is accessed via casting inside node components
type AvantiNode = RFNode;

// ── Converters ────────────────────────────────────────────────────────────────

import type { CanvasNode } from '@avanti/types';

function toRFNode(n: CanvasNode): AvantiNode {
  return {
    id:       n.id,
    type:     n.type,
    position: n.position,
    data:     n.data as unknown as Record<string, unknown>,
    selected: n.selected,
  };
}

// Shared FK edge visual style
function buildEdgeStyle(label?: string): Partial<RFEdge> {
  return {
    type:      'smoothstep',
    ...(label ? { label } : {}),
    markerEnd: { type: MarkerType.ArrowClosed, color: '#93c5fd', width: 16, height: 16 },
    style:     { stroke: '#93c5fd', strokeWidth: 1.5 },
    labelStyle:      { fontSize: 9, fill: '#9ca3af', fontFamily: 'JetBrains Mono, ui-monospace, monospace' },
    labelBgStyle:    { fill: '#ffffff', fillOpacity: 0.92 },
    labelBgPadding:  [4, 2] as [number, number],
    labelBgBorderRadius: 3,
  };
}

// CanvasEdge (persisted) → RFEdge (display)
function toRFEdge(e: CanvasEdge): RFEdge {
  return {
    id:           e.id,
    source:       e.source,
    target:       e.target,
    sourceHandle: e.sourceHandle,
    ...buildEdgeStyle(e.label),
  };
}

// RFEdge (display) → CanvasEdge (persisted)
function fromRFEdge(e: RFEdge): CanvasEdge {
  return {
    id:           e.id,
    source:       e.source,
    target:       e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    label:        typeof e.label === 'string' ? e.label : undefined,
    animated:     false,
  };
}

// ── React Flow override vars (applied on the wrapper div) ─────────────────────

const RF_WRAPPER_STYLE: React.CSSProperties = {
  '--xy-background-color-default':       'var(--surface-page)',
  '--xy-background-pattern-color':       'var(--color-gray-300)',
  '--xy-edge-stroke-default':            'var(--color-gray-300)',
  '--xy-edge-stroke-selected-default':   'var(--color-brand-400)',
  '--xy-selection-background-color':     'rgba(26,60,107,0.06)',
  '--xy-selection-border-color':         'var(--color-brand-400)',
  '--xy-node-border-radius':             '0px',  // our nodes handle their own radius
  '--xy-node-color':                     'transparent',
  '--xy-node-border-default':            'none',
  '--xy-node-background-color-default':  'transparent',
  '--xy-node-boxshadow-hover-default':   'none',
  '--xy-node-boxshadow-selected-default': 'none',
  width:  '100%',
  height: '100%',
} as React.CSSProperties;

// ── Node types (defined outside component to avoid re-registration) ───────────

const NODE_TYPES = {
  TABLE: TableNode,
} as const;

// ── CanvasEditor ──────────────────────────────────────────────────────────────

export function CanvasEditor({ canvasId, title }: CanvasEditorProps) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = useAuthStore(s => s.user?.id ?? '');

  // ── Store ─────────────────────────────────────────────────────────────────
  const storeNodes     = useCanvasStore(s => s.nodes);
  const storeEdges     = useCanvasStore(s => s.edges);
  const baseMetaSchema = useCanvasStore(s => s.baseMetaSchema);
  const loadCanvas     = useCanvasStore(s => s.loadCanvas);
  const syncPositions  = useCanvasStore(s => s.syncPositions);
  const setEdges       = useCanvasStore(s => s.setEdges);
  const saveError      = useCanvasStore(s => s.saveError);
  const clearSaveError = useCanvasStore(s => s.clearSaveError);
  const save           = useCanvasStore(s => s.save);

  // ── Loading state ─────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    getApiClient()
      .loadCanvas(canvasId)
      .then(({ layout, metaSchema }: { layout: CanvasLayout; metaSchema: MetaSchema }) => {
        if (!cancelled) {
          loadCanvas(canvasId, layout, metaSchema);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load canvas');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [canvasId, loadCanvas]);

  // ── React Flow state ──────────────────────────────────────────────────────
  const [rfNodes, setRfNodes] = useState<AvantiNode[]>([]);
  const [rfEdges, setRfEdges] = useState<RFEdge[]>([]);

  // Keep refs to current store state (avoid stale closures in callbacks)
  const storeNodesRef = useRef(storeNodes);
  storeNodesRef.current = storeNodes;
  const rfEdgesRef = useRef(rfEdges);
  rfEdgesRef.current = rfEdges;

  // Sync React Flow nodes when the store changes (load, schema ops, undo/redo)
  useEffect(() => {
    setRfNodes(storeNodes.map(toRFNode));
  }, [storeNodes]);

  // Sync store edges → RF edges on initial canvas load (storeEdges.length changes)
  useEffect(() => {
    setRfEdges(storeEdges.map(toRFEdge));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeEdges.length === 0 ? 0 : storeEdges[0]?.id]);

  // ── RF callbacks ──────────────────────────────────────────────────────────

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes(prev => applyNodeChanges(changes, prev));
  }, []);

  // Edge change (delete via keyboard, etc.) — sync to store
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setRfEdges(prev => {
      const updated = applyEdgeChanges(changes, prev);
      rfEdgesRef.current = updated;
      setEdges(updated.map(fromRFEdge));
      return updated;
    });
  }, [setEdges]);

  // New connection drawn — build a styled FK edge then sync to store
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    // Extract fieldId from handle ID "handle-source-{fieldId}"
    const rawHandle = connection.sourceHandle ?? '';
    const fieldId   = rawHandle.startsWith('handle-source-')
      ? rawHandle.slice('handle-source-'.length)
      : null;

    // Find the column name for the FK label
    const sourceNode = storeNodesRef.current.find(n => n.id === connection.source);
    const field = fieldId && sourceNode?.type === 'TABLE'
      ? (sourceNode.data as unknown as TableNodeData).fields.find(f => f.fieldId === fieldId)
      : null;

    const label = field?.columnName;

    const newEdge: RFEdge = {
      id:           `edge-${crypto.randomUUID()}`,
      source:       connection.source,
      target:       connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      ...buildEdgeStyle(label),
    };

    setRfEdges(prev => {
      const updated = [...prev, newEdge];
      rfEdgesRef.current = updated;
      setEdges(updated.map(fromRFEdge));
      return updated;
    });
  }, [setEdges]);

  // Sync final positions back to store after drag (batched, no history push)
  const onNodeDragStop = useCallback(
    (_evt: React.MouseEvent, _node: RFNode, allNodes: RFNode[]) => {
      const posMap: Record<string, { x: number; y: number }> = {};
      for (const n of allNodes) posMap[n.id] = n.position;
      syncPositions(posMap);
    },
    [syncPositions]
  );

  // ── Save flow ─────────────────────────────────────────────────────────────
  const [pendingChanges, setPendingChanges] = useState<SchemaChangeDescriptor[]>([]);
  const [showModal, setShowModal]           = useState(false);

  const handleSaveRequest = useCallback(() => {
    if (!baseMetaSchema) return;
    const changes = computeDiff(storeNodesRef.current, baseMetaSchema, userId);
    if (changes.length > 0) {
      setPendingChanges(changes);
      setShowModal(true);
    } else {
      // Position-only save — no confirmation needed
      void save(userId);
    }
  }, [baseMetaSchema, userId, save]);

  const handleConfirmSave = useCallback(() => {
    setShowModal(false);
    setPendingChanges([]);
    void save(userId);
  }, [userId, save]);

  const handleCancelSave = useCallback(() => {
    setShowModal(false);
    setPendingChanges([]);
  }, []);

  // ── Loading / error screens ───────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            'var(--space-3)',
          background:     'var(--surface-page)',
        }}
      >
        <div
          style={{
            width:        32,
            height:       32,
            border:       '3px solid var(--color-brand-100)',
            borderTop:    '3px solid var(--color-brand-500)',
            borderRadius: '50%',
            animation:    'spin 0.7s linear infinite',
          }}
        />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Loading canvas…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            'var(--space-3)',
          background:     'var(--surface-page)',
        }}
      >
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
          {loadError}
        </span>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding:      'var(--space-2) var(--space-4)',
            background:   'var(--color-brand-500)',
            border:       'none',
            borderRadius: 'var(--radius-sm)',
            color:        'var(--color-gray-0)',
            cursor:       'pointer',
            fontSize:     'var(--text-sm)',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Canvas render ─────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        background:    'var(--surface-page)',
      }}
    >
      {/* Toolbar */}
      <Toolbar
        title={title}
        onSaveRequest={handleSaveRequest}
      />

      {/* Canvas + side panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* React Flow canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.25}
            maxZoom={2}
            deleteKeyCode="Backspace"
            onNodesDelete={() => { /* guard: deletion handled in TableNode */ }}
            connectionLineStyle={{ stroke: '#93c5fd', strokeWidth: 1.5 }}
            connectionLineType="smoothstep"
            style={RF_WRAPPER_STYLE}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.5}
              color="var(--color-gray-300)"
            />
          </ReactFlow>

          {/* Save error toast */}
          {saveError && (
            <div
              style={{
                position:     'absolute',
                bottom:       'var(--space-6)',
                left:         '50%',
                transform:    'translateX(-50%)',
                background:   'var(--color-error)',
                color:        'var(--color-gray-0)',
                padding:      'var(--space-3) var(--space-5)',
                borderRadius: 'var(--radius-md)',
                fontSize:     'var(--text-sm)',
                boxShadow:    'var(--shadow-lg)',
                zIndex:       500,
                display:      'flex',
                alignItems:   'center',
                gap:          'var(--space-4)',
                maxWidth:     440,
                whiteSpace:   'nowrap',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{saveError}</span>
              <button
                onClick={clearSaveError}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border:     'none',
                  color:      'inherit',
                  cursor:     'pointer',
                  borderRadius: 'var(--radius-sm)',
                  padding:    '2px var(--space-2)',
                  fontSize:   'var(--text-xs)',
                  flexShrink: 0,
                }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <SidePanel />
      </div>

      {/* Change preview modal */}
      <AnimatePresence>
        {showModal && (
          <ChangePreviewModal
            changes={pendingChanges}
            metaSchema={baseMetaSchema}
            onConfirm={handleConfirmSave}
            onCancel={handleCancelSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
