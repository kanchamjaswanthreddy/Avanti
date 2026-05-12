// Avanti — Table Node (React Flow custom node)
// Renders a DATABASE TABLE on the schema canvas.
// Fully custom design — no default React Flow UI visible.
// Handles: display fields, add field inline, delete field, delete table.

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import { useCanvasStore, makeField } from '../../../store/canvasStore';
import type { TableNodeData, FieldType } from '@avanti/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELD_TYPES: FieldType[] = [
  'TEXT', 'INTEGER', 'DECIMAL', 'BOOLEAN',
  'DATE', 'TIMESTAMPTZ', 'UUID', 'ENUM', 'JSONB', 'FILE_REF',
];

const TYPE_COLOR: Record<FieldType, string> = {
  TEXT:        '#6366f1',
  INTEGER:     '#0ea5e9',
  DECIMAL:     '#06b6d4',
  BOOLEAN:     '#10b981',
  DATE:        '#f59e0b',
  TIMESTAMPTZ: '#f97316',
  UUID:        '#8b5cf6',
  ENUM:        '#ec4899',
  JSONB:       '#84cc16',
  FILE_REF:    '#64748b',
};

// ── Handle styles ─────────────────────────────────────────────────────────────

const TARGET_HANDLE_STYLE: React.CSSProperties = {
  width:        12,
  height:       12,
  background:   '#fff',
  border:       '2.5px solid #1A3C6B',
  borderRadius: '50%',
  left:         -6,
  top:          '50%',
  transform:    'translateY(-50%)',
  cursor:       'crosshair',
  boxShadow:    '0 0 0 3px rgba(26,60,107,0.12)',
};

const FIELD_HANDLE_STYLE: React.CSSProperties = {
  width:        10,
  height:       10,
  background:   '#F59E0B',
  border:       '2px solid #fff',
  borderRadius: '50%',
  right:        -5,
  top:          '50%',
  transform:    'translateY(-50%)',
  opacity:      0.22,
  transition:   'opacity 0.15s ease, box-shadow 0.15s ease',
  cursor:       'crosshair',
  boxShadow:    '0 0 0 2px rgba(245,158,11,0.2)',
};

// ── SVG icons ─────────────────────────────────────────────────────────────────

function PkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="4" cy="4" r="3" stroke="#f59e0b" strokeWidth="1.5" />
      <rect x="6" y="5.5" width="1.2" height="3" rx="0.4" fill="#f59e0b" />
      <rect x="7.5" y="6.5" width="1" height="1.2" rx="0.3" fill="#f59e0b" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── AddFieldRow ───────────────────────────────────────────────────────────────

interface AddFieldRowProps {
  tableId: string;
  onClose: () => void;
}

function AddFieldRow({ tableId, onClose }: AddFieldRowProps) {
  const [colName, setColName]   = useState('');
  const [dispName, setDispName] = useState('');
  const [type, setType]         = useState<FieldType>('TEXT');
  const [nullable, setNullable] = useState(true);
  const colRef = useRef<HTMLInputElement>(null);

  const updateTableData = useCanvasStore(s => s.updateTableData);

  const handleAdd = useCallback(() => {
    const col = colName.trim().toLowerCase().replace(/\s+/g, '_');
    const display = dispName.trim() || col;
    if (!col) { colRef.current?.focus(); return; }

    updateTableData(tableId, data => ({
      ...data,
      fields: [
        ...data.fields,
        makeField({ columnName: col, displayName: display, type, nullable }),
      ],
    }));
    onClose();
  }, [colName, dispName, type, nullable, tableId, updateTableData, onClose]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        borderTop:     '1px solid var(--color-brand-100)',
        padding:       'var(--space-3)',
        display:       'flex',
        flexDirection: 'column',
        gap:           'var(--space-2)',
        background:    'var(--color-brand-50)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          ref={colRef}
          autoFocus
          value={colName}
          onChange={e => setColName(e.target.value)}
          onKeyDown={handleKey}
          placeholder="column_name"
          style={inputStyle}
        />
        <input
          value={dispName}
          onChange={e => setDispName(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Display label"
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <select
          value={type}
          onChange={e => setType(e.target.value as FieldType)}
          style={{ ...inputStyle, flex: '0 0 auto', width: 130 }}
        >
          {FIELD_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        'var(--space-1)',
            fontSize:   'var(--text-xs)',
            color:      'var(--text-secondary)',
            cursor:     'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={nullable}
            onChange={e => setNullable(e.target.checked)}
          />
          Nullable
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleAdd} style={addBtnStyle}>Add field</button>
        </div>
      </div>
    </motion.div>
  );
}

// ── TableNode ─────────────────────────────────────────────────────────────────

export function TableNode({ id, data, selected }: NodeProps) {
  const tableData       = data as unknown as TableNodeData;
  const [showAddField, setShowAddField] = useState(false);
  const updateTableData = useCanvasStore(s => s.updateTableData);
  const deleteTable     = useCanvasStore(s => s.deleteTable);

  const visibleFields = tableData.fields.filter(f => !f.isHidden);
  const accentColor   = tableData.isCore ? '#94a3b8' : '#F59E0B';

  const handleDeleteField = useCallback((fieldId: string) => {
    updateTableData(id, d => ({
      ...d,
      fields: d.fields.map(f =>
        f.fieldId === fieldId ? { ...f, isHidden: true } : f
      ),
    }));
  }, [id, updateTableData]);

  return (
    <div
      style={{
        background:   'var(--surface-card)',
        borderTop:    `1.5px solid ${selected ? 'var(--color-brand-400)' : 'var(--color-gray-200)'}`,
        borderRight:  `1.5px solid ${selected ? 'var(--color-brand-400)' : 'var(--color-gray-200)'}`,
        borderBottom: `1.5px solid ${selected ? 'var(--color-brand-400)' : 'var(--color-gray-200)'}`,
        borderLeft:   `4px solid ${selected ? 'var(--color-brand-500)' : accentColor}`,
        borderRadius: 'var(--radius-md)',
        minWidth:     268,
        maxWidth:     320,
        boxShadow:    selected
          ? '0 0 0 3px rgba(26,60,107,0.12), var(--shadow-lg)'
          : 'var(--shadow-sm)',
        transition:   'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          background:     tableData.isCore
            ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #1e4a87 0%, #1A3C6B 100%)',
          padding:        'var(--space-3) var(--space-4)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            'var(--space-2)',
          position:       'relative',
          borderRadius:   '5px 5px 0 0',  // slightly less to account for left border
        }}
      >
        {/* Target handle — receives FK arrows */}
        <Handle
          type="target"
          position={Position.Left}
          id="handle-target"
          style={TARGET_HANDLE_STYLE}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, minWidth: 0 }}>
          {/* Table icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="white" strokeWidth="1.2" />
            <line x1="1" y1="4.5" x2="13" y2="4.5" stroke="white" strokeWidth="1.2" />
            <line x1="5" y1="4.5" x2="5" y2="13" stroke="white" strokeWidth="1.2" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize:     'var(--text-sm)',
                fontWeight:   'var(--font-semibold)',
                color:        'var(--color-gray-0)',
                lineHeight:   1.2,
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}
            >
              {tableData.displayName}
            </div>
            <div
              style={{
                fontSize:     'var(--text-xs)',
                color:        'rgba(255,255,255,0.55)',
                fontFamily:   'var(--font-mono)',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}
            >
              {tableData.tableName}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
          {tableData.isCore && (
            <span
              style={{
                fontSize:     9,
                color:        'rgba(255,255,255,0.65)',
                background:   'rgba(255,255,255,0.12)',
                padding:      '2px 7px',
                borderRadius: 'var(--radius-full)',
                letterSpacing: '0.05em',
                fontWeight:   'var(--font-semibold)',
              }}
            >
              CORE
            </span>
          )}
          {!tableData.isCore && (
            <button
              onClick={() => deleteTable(id)}
              title="Delete table"
              style={{
                background:   'rgba(255,255,255,0.1)',
                border:       'none',
                color:        'rgba(255,255,255,0.7)',
                borderRadius: 'var(--radius-sm)',
                cursor:       'pointer',
                width:        22,
                height:       22,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                padding:      0,
                transition:   'background 0.1s ease',
              }}
              className="table-delete-btn"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: 'var(--space-1) 0' }}>
        {visibleFields.length === 0 && (
          <div
            style={{
              padding:   'var(--space-4) var(--space-4)',
              fontSize:  'var(--text-xs)',
              color:     'var(--text-muted)',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            No fields yet
          </div>
        )}

        {visibleFields.map((field) => {
          const isPK = field.columnName === 'id';
          return (
            <div
              key={field.fieldId}
              style={{
                display:      'flex',
                alignItems:   'center',
                padding:      'var(--space-2) var(--space-4) var(--space-2) var(--space-3)',
                gap:          'var(--space-2)',
                borderBottom: '1px solid var(--color-gray-100)',
                position:     'relative',
                transition:   'background 0.1s ease',
              }}
              className="field-row"
            >
              {/* Source handle — drag to draw FK arrow */}
              <Handle
                type="source"
                position={Position.Right}
                id={`handle-source-${field.fieldId}`}
                style={FIELD_HANDLE_STYLE}
                className="field-source-handle"
              />

              {/* PK icon or type dot */}
              {isPK ? (
                <PkIcon />
              ) : (
                <span
                  style={{
                    width:        8,
                    height:       8,
                    borderRadius: '50%',
                    background:   TYPE_COLOR[field.type],
                    flexShrink:   0,
                  }}
                />
              )}

              {/* Column name */}
              <span
                style={{
                  flex:         1,
                  fontSize:     'var(--text-xs)',
                  color:        isPK || field.isCore ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontWeight:   field.isCore ? 'var(--font-normal)' : 'var(--font-medium)',
                  fontFamily:   'var(--font-mono)',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}
              >
                {field.columnName}
              </span>

              {/* Type badge */}
              <span
                style={{
                  fontSize:     9,
                  color:        TYPE_COLOR[field.type],
                  background:   `${TYPE_COLOR[field.type]}18`,
                  padding:      '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  flexShrink:   0,
                  fontWeight:   'var(--font-semibold)',
                  letterSpacing: '0.02em',
                }}
              >
                {field.type}
              </span>

              {/* NOT NULL badge */}
              {!field.nullable && !isPK && (
                <span
                  style={{
                    fontSize:     9,
                    color:        'var(--color-error)',
                    background:   'var(--color-error-light)',
                    padding:      '2px 5px',
                    borderRadius: 'var(--radius-full)',
                    flexShrink:   0,
                    fontWeight:   'var(--font-medium)',
                  }}
                >
                  NN
                </span>
              )}

              {/* Delete field */}
              {!field.isCore && (
                <button
                  onClick={() => handleDeleteField(field.fieldId)}
                  title="Remove field"
                  style={{
                    background: 'none',
                    border:     'none',
                    color:      'var(--color-gray-400)',
                    cursor:     'pointer',
                    padding:    0,
                    lineHeight: 1,
                    display:    'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    opacity:    0,
                    transition: 'opacity 0.1s ease',
                  }}
                  className="field-delete-btn"
                >
                  <DeleteIcon />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add field */}
      <AnimatePresence>
        {showAddField && (
          <AddFieldRow
            tableId={id}
            onClose={() => setShowAddField(false)}
          />
        )}
      </AnimatePresence>

      {!showAddField && (
        <button
          onClick={() => setShowAddField(true)}
          style={{
            width:        '100%',
            background:   'none',
            border:       'none',
            borderTop:    '1px solid var(--color-gray-100)',
            padding:      'var(--space-2) var(--space-3)',
            fontSize:     'var(--text-xs)',
            color:        'var(--text-muted)',
            cursor:       'pointer',
            textAlign:    'left',
            display:      'flex',
            alignItems:   'center',
            gap:          'var(--space-2)',
            transition:   'background 0.1s ease, color 0.1s ease',
            borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          }}
          className="add-field-btn"
        >
          <span
            style={{
              width:          16,
              height:         16,
              borderRadius:   '50%',
              background:     'var(--color-gray-100)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       13,
              lineHeight:     1,
              flexShrink:     0,
              transition:     'background 0.1s ease',
            }}
            className="add-field-icon"
          >
            +
          </span>
          Add field
        </button>
      )}

      {/* Hover styles */}
      <style>{`
        .react-flow__node:hover .field-source-handle {
          opacity: 1 !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.25) !important;
        }
        .react-flow__node:hover .field-delete-btn {
          opacity: 1 !important;
        }
        .react-flow__node:hover .table-delete-btn {
          background: rgba(255,255,255,0.18) !important;
        }
        .field-row:hover {
          background: var(--color-gray-50);
        }
        .add-field-btn:hover {
          background: var(--color-brand-50) !important;
          color: var(--color-brand-600) !important;
        }
        .add-field-btn:hover .add-field-icon {
          background: var(--color-brand-100) !important;
        }
      `}</style>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex:         1,
  padding:      '5px var(--space-2)',
  fontSize:     'var(--text-xs)',
  border:       '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-sm)',
  color:        'var(--text-primary)',
  background:   'var(--surface-card)',
  outline:      'none',
  minWidth:     0,
  fontFamily:   'var(--font-mono)',
};

const cancelBtnStyle: React.CSSProperties = {
  padding:      '4px var(--space-3)',
  fontSize:     'var(--text-xs)',
  background:   'none',
  border:       '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-sm)',
  cursor:       'pointer',
  color:        'var(--text-secondary)',
};

const addBtnStyle: React.CSSProperties = {
  padding:      '4px var(--space-3)',
  fontSize:     'var(--text-xs)',
  background:   'var(--color-brand-500)',
  border:       'none',
  borderRadius: 'var(--radius-sm)',
  cursor:       'pointer',
  color:        'var(--color-gray-0)',
  fontWeight:   'var(--font-medium)',
};
