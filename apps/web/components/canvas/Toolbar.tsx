// Vidyut — Canvas Toolbar
// Fixed top bar: Save, Undo, Redo, Add Table, version indicator.
// Communicates state via canvasStore.

'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useCanvasStore } from '../../store/canvasStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  title:  string;
  onSaveRequest: () => void;
}

// ── AddTableModal (inline) ────────────────────────────────────────────────────

interface AddTableModalProps {
  onConfirm: (tableName: string, displayName: string) => void;
  onClose:   () => void;
}

function AddTableModal({ onConfirm, onClose }: AddTableModalProps) {
  const [tableName, setTableName]   = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleConfirm = () => {
    const tn = tableName.trim().toLowerCase().replace(/\s+/g, '_');
    const dn = displayName.trim() || tn;
    if (!tn) return;
    onConfirm(tn, dn);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      style={{
        position:    'fixed',
        inset:       0,
        background:  'var(--surface-overlay)',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        zIndex:      'var(--z-modal)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.95,    y: 8 }}
        transition={{ duration: 0.15 }}
        style={{
          background:   'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          padding:      'var(--space-6)',
          width:        360,
          boxShadow:    'var(--shadow-xl)',
          display:      'flex',
          flexDirection: 'column',
          gap:          'var(--space-4)',
        }}
      >
        <h3
          style={{
            margin:     0,
            fontSize:   'var(--text-base)',
            fontWeight: 'var(--font-semibold)',
            color:      'var(--text-primary)',
          }}
        >
          New Table
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
              Table name <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(PostgreSQL column name)</span>
            </span>
            <input
              autoFocus
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. parent_communications"
              style={{
                padding:      'var(--space-2) var(--space-3)',
                fontSize:     'var(--text-sm)',
                border:       '1px solid var(--color-gray-300)',
                borderRadius: 'var(--radius-sm)',
                color:        'var(--text-primary)',
                background:   'var(--surface-card)',
                fontFamily:   'var(--font-mono)',
                outline:      'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
              Display name
            </span>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. Parent Communications"
              style={{
                padding:      'var(--space-2) var(--space-3)',
                fontSize:     'var(--text-sm)',
                border:       '1px solid var(--color-gray-300)',
                borderRadius: 'var(--radius-sm)',
                color:        'var(--text-primary)',
                background:   'var(--surface-card)',
                outline:      'none',
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding:      'var(--space-2) var(--space-4)',
              fontSize:     'var(--text-sm)',
              background:   'none',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-sm)',
              cursor:       'pointer',
              color:        'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding:      'var(--space-2) var(--space-4)',
              fontSize:     'var(--text-sm)',
              background:   'var(--color-brand-500)',
              border:       'none',
              borderRadius: 'var(--radius-sm)',
              cursor:       'pointer',
              color:        'var(--color-gray-0)',
              fontWeight:   'var(--font-medium)',
            }}
          >
            Create Table
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export function Toolbar({ title, onSaveRequest }: ToolbarProps) {
  const [showAddTable, setShowAddTable] = useState(false);

  const isDirty   = useCanvasStore(s => s.isDirty);
  const isSaving  = useCanvasStore(s => s.isSaving);
  const lastSaved = useCanvasStore(s => s.lastSaved);
  const history   = useCanvasStore(s => s.history);
  const future    = useCanvasStore(s => s.future);
  const saveError = useCanvasStore(s => s.saveError);
  const metaSchema = useCanvasStore(s => s.baseMetaSchema);
  const addTable  = useCanvasStore(s => s.addTable);
  const undo      = useCanvasStore(s => s.undo);
  const redo      = useCanvasStore(s => s.redo);
  const clearSaveError = useCanvasStore(s => s.clearSaveError);

  const handleAddTable = useCallback((tableName: string, displayName: string) => {
    // Place new table in a reasonable default position
    addTable({
      tableName,
      displayName,
      position: { x: 60 + Math.random() * 200, y: 60 + Math.random() * 200 },
    });
  }, [addTable]);

  const formatLastSaved = (d: Date | null) => {
    if (!d) return null;
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'Saved just now';
    if (diff < 3_600_000) return `Saved ${Math.floor(diff / 60_000)}m ago`;
    return `Saved at ${d.toLocaleTimeString()}`;
  };

  return (
    <>
      <div
        style={{
          height:       52,
          background:   'var(--surface-card)',
          borderBottom: '1px solid var(--color-gray-200)',
          display:      'flex',
          alignItems:   'center',
          padding:      '0 var(--space-4)',
          gap:          'var(--space-3)',
          flexShrink:   0,
          zIndex:       'var(--z-sticky)',
          boxShadow:    'var(--shadow-xs)',
        }}
      >
        {/* Left: canvas title + version */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        'var(--space-2)',
            }}
          >
            <span
              style={{
                fontSize:   'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                color:      'var(--text-primary)',
              }}
            >
              {title}
            </span>
            {metaSchema && (
              <span
                style={{
                  fontSize:     'var(--text-xs)',
                  color:        'var(--text-muted)',
                  background:   'var(--color-gray-100)',
                  padding:      '1px var(--space-2)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                v{metaSchema.version}
              </span>
            )}
          </div>

          {/* Dirty / last saved indicator */}
          {isDirty && !isSaving && (
            <span
              style={{
                fontSize:   'var(--text-xs)',
                color:      'var(--color-accent-600)',
                display:    'flex',
                alignItems: 'center',
                gap:        'var(--space-1)',
              }}
            >
              <span style={{ fontSize: 8, lineHeight: 1 }}>●</span>
              Unsaved changes
            </span>
          )}
          {!isDirty && lastSaved && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {formatLastSaved(lastSaved)}
            </span>
          )}
          {saveError && (
            <span
              style={{
                fontSize:   'var(--text-xs)',
                color:      'var(--color-error)',
                cursor:     'pointer',
              }}
              onClick={clearSaveError}
              title={saveError}
            >
              Save failed — click to dismiss
            </span>
          )}
        </div>

        {/* Center: Undo / Redo */}
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <ToolbarIconButton
            label="Undo"
            disabled={history.length === 0}
            onClick={undo}
          >
            ↩
          </ToolbarIconButton>
          <ToolbarIconButton
            label="Redo"
            disabled={future.length === 0}
            onClick={redo}
          >
            ↪
          </ToolbarIconButton>
        </div>

        {/* Right: Add Table + Save */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setShowAddTable(true)}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              fontSize:     'var(--text-sm)',
              background:   'none',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-sm)',
              cursor:       'pointer',
              color:        'var(--text-secondary)',
              display:      'flex',
              alignItems:   'center',
              gap:          'var(--space-1)',
              fontWeight:   'var(--font-medium)',
            }}
          >
            <span style={{ fontSize: 16 }}>+</span> Table
          </button>

          <button
            onClick={onSaveRequest}
            disabled={!isDirty || isSaving}
            style={{
              padding:      'var(--space-2) var(--space-4)',
              fontSize:     'var(--text-sm)',
              fontWeight:   'var(--font-medium)',
              background:   isDirty && !isSaving ? 'var(--color-brand-500)' : 'var(--color-gray-200)',
              border:       'none',
              borderRadius: 'var(--radius-sm)',
              cursor:       isDirty && !isSaving ? 'pointer' : 'default',
              color:        isDirty && !isSaving ? 'var(--color-gray-0)' : 'var(--text-muted)',
              transition:   'background 0.15s ease, color 0.15s ease',
            }}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {showAddTable && (
        <AddTableModal
          onConfirm={handleAddTable}
          onClose={() => setShowAddTable(false)}
        />
      )}
    </>
  );
}

// ── ToolbarIconButton ─────────────────────────────────────────────────────────

function ToolbarIconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label:    string;
  disabled: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        width:        30,
        height:       30,
        background:   'none',
        border:       '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-sm)',
        cursor:       disabled ? 'default' : 'pointer',
        color:        disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        fontSize:     16,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        padding:      0,
      }}
    >
      {children}
    </button>
  );
}
