// Avanti — Canvas Toolbar
// Fixed top bar: Save (⌘S), Undo, Redo, Add Table, version + table count.
// Communicates state via canvasStore.

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { useCanvasStore } from '../../store/canvasStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  title:         string;
  onSaveRequest: () => void;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function UndoIcon({ disabled }: { disabled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 5h6a4 4 0 1 1 0 8H4"
        stroke={disabled ? 'var(--color-gray-300)' : 'var(--text-secondary)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 5l2.5-2.5M2 5l2.5 2.5"
        stroke={disabled ? 'var(--color-gray-300)' : 'var(--text-secondary)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon({ disabled }: { disabled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M12 5H6a4 4 0 1 0 0 8h4"
        stroke={disabled ? 'var(--color-gray-300)' : 'var(--text-secondary)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5l-2.5-2.5M12 5l-2.5 2.5"
        stroke={disabled ? 'var(--color-gray-300)' : 'var(--text-secondary)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0.75" y="0.75" width="11.5" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <line x1="0.75" y1="4.25" x2="12.25" y2="4.25" stroke="currentColor" strokeWidth="1.25" />
      <line x1="5" y1="4.25" x2="5" y2="12.25" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

// ── AddTableModal ─────────────────────────────────────────────────────────────

interface AddTableModalProps {
  onConfirm: (tableName: string, displayName: string) => void;
  onClose:   () => void;
}

function AddTableModal({ onConfirm, onClose }: AddTableModalProps) {
  const [tableName, setTableName]     = useState('');
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
        position:       'fixed',
        inset:          0,
        background:     'var(--surface-overlay)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         'var(--z-modal)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.96,    y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          background:    'var(--surface-card)',
          borderRadius:  'var(--radius-lg)',
          padding:       'var(--space-6)',
          width:         380,
          boxShadow:     'var(--shadow-xl)',
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-5)',
          border:        '1px solid var(--color-gray-200)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width:          34,
              height:         34,
              borderRadius:   'var(--radius-md)',
              background:     'var(--color-brand-50)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          'var(--color-brand-500)',
            }}
          >
            <TableIcon />
          </div>
          <div>
            <h3
              style={{
                margin:     0,
                fontSize:   'var(--text-base)',
                fontWeight: 'var(--font-semibold)',
                color:      'var(--text-primary)',
                lineHeight: 1.3,
              }}
            >
              New Table
            </h3>
            <p
              style={{
                margin:   0,
                fontSize: 'var(--text-xs)',
                color:    'var(--text-muted)',
              }}
            >
              Creates a new database table in your schema
            </p>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
              Table name
              <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: 'var(--space-1)' }}>
                — PostgreSQL identifier
              </span>
            </span>
            <input
              autoFocus
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. parent_communications"
              style={modalInputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
              Display name
              <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: 'var(--space-1)' }}>
                — shown in the UI
              </span>
            </span>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. Parent Communications"
              style={modalInputStyle}
            />
          </label>
        </div>

        {/* Actions */}
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
              background:   tableName.trim() ? 'var(--color-brand-500)' : 'var(--color-gray-200)',
              border:       'none',
              borderRadius: 'var(--radius-sm)',
              cursor:       tableName.trim() ? 'pointer' : 'default',
              color:        tableName.trim() ? 'var(--color-gray-0)' : 'var(--text-muted)',
              fontWeight:   'var(--font-medium)',
              transition:   'background 0.15s ease',
            }}
          >
            Create table
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export function Toolbar({ title, onSaveRequest }: ToolbarProps) {
  const [showAddTable, setShowAddTable] = useState(false);

  const isDirty    = useCanvasStore(s => s.isDirty);
  const isSaving   = useCanvasStore(s => s.isSaving);
  const lastSaved  = useCanvasStore(s => s.lastSaved);
  const history    = useCanvasStore(s => s.history);
  const future     = useCanvasStore(s => s.future);
  const saveError  = useCanvasStore(s => s.saveError);
  const metaSchema = useCanvasStore(s => s.baseMetaSchema);
  const nodes      = useCanvasStore(s => s.nodes);
  const addTable   = useCanvasStore(s => s.addTable);
  const undo       = useCanvasStore(s => s.undo);
  const redo       = useCanvasStore(s => s.redo);
  const clearSaveError = useCanvasStore(s => s.clearSaveError);

  const tableCount = nodes.filter(n => n.type === 'TABLE').length;

  // ⌘S / Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) onSaveRequest();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (history.length > 0) undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (future.length > 0) redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, isSaving, onSaveRequest, history.length, future.length, undo, redo]);

  const handleAddTable = useCallback((tableName: string, displayName: string) => {
    addTable({
      tableName,
      displayName,
      position: { x: 80 + Math.random() * 180, y: 80 + Math.random() * 180 },
    });
  }, [addTable]);

  const formatLastSaved = (d: Date | null) => {
    if (!d) return null;
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'Saved just now';
    if (diff < 3_600_000) return `Saved ${Math.floor(diff / 60_000)}m ago`;
    return `Saved at ${d.toLocaleTimeString()}`;
  };

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

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
          boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Left: title + version + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
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
                  color:        'var(--color-brand-500)',
                  background:   'var(--color-brand-50)',
                  padding:      '1px 7px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight:   'var(--font-medium)',
                }}
              >
                v{metaSchema.version}
              </span>
            )}
            <span
              style={{
                fontSize:     'var(--text-xs)',
                color:        'var(--text-muted)',
                background:   'var(--color-gray-100)',
                padding:      '1px 7px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {tableCount} table{tableCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Status */}
          {isSaving && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, border: '1.5px solid var(--color-brand-300)', borderTop: '1.5px solid var(--color-brand-500)', borderRadius: '50%', animation: 'toolbar-spin 0.6s linear infinite' }} />
              Saving…
            </span>
          )}
          {!isSaving && isDirty && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent-600)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
              Unsaved changes
            </span>
          )}
          {!isSaving && !isDirty && lastSaved && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {formatLastSaved(lastSaved)}
            </span>
          )}
          {saveError && (
            <span
              style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', cursor: 'pointer' }}
              onClick={clearSaveError}
              title={saveError}
            >
              Save failed — click to dismiss
            </span>
          )}
        </div>

        {/* Center: Undo / Redo */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
          <ToolbarIconButton label="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
            <UndoIcon disabled={!canUndo} />
          </ToolbarIconButton>
          <ToolbarIconButton label="Redo (⌘Y)" disabled={!canRedo} onClick={redo}>
            <RedoIcon disabled={!canRedo} />
          </ToolbarIconButton>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--color-gray-200)' }} />

        {/* Right: Add Table + Save */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddTable(true)}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              fontSize:     'var(--text-xs)',
              background:   'none',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-sm)',
              cursor:       'pointer',
              color:        'var(--text-secondary)',
              display:      'flex',
              alignItems:   'center',
              gap:          'var(--space-2)',
              fontWeight:   'var(--font-medium)',
              transition:   'background 0.1s ease, border-color 0.1s ease',
            }}
          >
            <TableIcon />
            New table
          </button>

          <button
            onClick={onSaveRequest}
            disabled={!isDirty || isSaving}
            title="Save (⌘S)"
            style={{
              padding:      'var(--space-2) var(--space-4)',
              fontSize:     'var(--text-xs)',
              fontWeight:   'var(--font-semibold)',
              background:   isDirty && !isSaving ? 'var(--color-brand-500)' : 'var(--color-gray-100)',
              border:       isDirty && !isSaving ? 'none' : '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-sm)',
              cursor:       isDirty && !isSaving ? 'pointer' : 'default',
              color:        isDirty && !isSaving ? 'var(--color-gray-0)' : 'var(--text-muted)',
              transition:   'background 0.15s ease, color 0.15s ease',
              display:      'flex',
              alignItems:   'center',
              gap:          'var(--space-2)',
            }}
          >
            {isSaving ? 'Saving…' : 'Save'}
            {isDirty && !isSaving && (
              <span style={{ opacity: 0.65, fontWeight: 'var(--font-normal)', fontSize: 10 }}>⌘S</span>
            )}
          </button>
        </div>
      </div>

      {showAddTable && (
        <AddTableModal
          onConfirm={handleAddTable}
          onClose={() => setShowAddTable(false)}
        />
      )}

      <style>{`
        @keyframes toolbar-spin { to { transform: rotate(360deg); } }
      `}</style>
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
        width:          30,
        height:         30,
        background:     'none',
        border:         '1px solid var(--color-gray-200)',
        borderRadius:   'var(--radius-sm)',
        cursor:         disabled ? 'default' : 'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        0,
        opacity:        disabled ? 0.4 : 1,
        transition:     'background 0.1s ease, opacity 0.1s ease',
      }}
    >
      {children}
    </button>
  );
}

// ── Modal input style ─────────────────────────────────────────────────────────

const modalInputStyle: React.CSSProperties = {
  padding:      'var(--space-2) var(--space-3)',
  fontSize:     'var(--text-sm)',
  border:       '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-sm)',
  color:        'var(--text-primary)',
  background:   'var(--surface-card)',
  fontFamily:   'var(--font-mono)',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
};
