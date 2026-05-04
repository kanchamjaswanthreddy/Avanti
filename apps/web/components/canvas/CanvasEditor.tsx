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
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
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
import type { CanvasLayout, MetaSchema, SchemaChangeDescriptor } from '@avanti/types';

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
  const baseMetaSchema = useCanvasStore(s => s.baseMetaSchema);
  const loadCanvas     = useCanvasStore(s => s.loadCanvas);
  const syncPositions  = useCanvasStore(s => s.syncPositions);
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

  // Keep a ref to current store nodes for save-time diff (avoids stale closure)
  const storeNodesRef = useRef(storeNodes);
  storeNodesRef.current = storeNodes;

  // Sync React Flow nodes when the store changes (load, schema ops, undo/redo)
  useEffect(() => {
    setRfNodes(storeNodes.map(toRFNode));
  }, [storeNodes]);

  // ── RF callbacks ──────────────────────────────────────────────────────────

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRfNodes(prev => applyNodeChanges(changes, prev));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setRfEdges(prev => applyEdgeChanges(changes, prev));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setRfEdges(prev => addEdge(connection, prev));
  }, []);

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
            deleteKeyCode={null}
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
