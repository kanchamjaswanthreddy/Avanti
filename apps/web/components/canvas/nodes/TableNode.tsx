// Vidyut — Table Node (React Flow custom node)
// Renders a DATABASE TABLE on the schema canvas.
// Fully custom design — no default React Flow UI visible.
// Handles: display fields, add field inline, delete field, delete table.

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'motion/react';
import { useCanvasStore, makeField } from '../../../store/canvasStore';
import type { TableNodeData, FieldType } from '@vidyut/types';

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
      style={{
        borderTop: '1px solid var(--color-brand-100)',
        padding:   'var(--space-3)',
        display:   'flex',
        flexDirection: 'column',
        gap:       'var(--space-2)',
        background: 'var(--color-brand-50)',
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
          style={{ ...inputStyle, flex: '0 0 auto', width: 120 }}
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
          <button onClick={handleAdd} style={addBtnStyle}>Add</button>
        </div>
      </div>
    </motion.div>
  );
}

// ── TableNode ─────────────────────────────────────────────────────────────────

export function TableNode({ id, data, selected }: NodeProps) {
  const tableData = data as unknown as TableNodeData;
  const [showAddField, setShowAddField] = useState(false);
  const updateTableData = useCanvasStore(s => s.updateTableData);
  const deleteTable     = useCanvasStore(s => s.deleteTable);

  const visibleFields = tableData.fields.filter(f => !f.isHidden);

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
        border:       `2px solid ${selected ? 'var(--color-brand-500)' : 'var(--color-gray-200)'}`,
        borderRadius: 'var(--radius-md)',
        minWidth:     260,
        maxWidth:     320,
        boxShadow:    selected ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transition:   'border-color 0.15s ease, box-shadow 0.15s ease',
        overflow:     'hidden',
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'var(--color-brand-400)', width: 10, height: 10, border: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'var(--color-brand-400)', width: 10, height: 10, border: 'none' }}
      />

      {/* Header */}
      <div
        style={{
          background:  tableData.isCore ? 'var(--color-gray-800)' : 'var(--color-brand-500)',
          padding:     'var(--space-3) var(--space-4)',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
          gap:         'var(--space-2)',
        }}
      >
        <div>
          <div
            style={{
              fontSize:   'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              color:      'var(--color-gray-0)',
              lineHeight: 1.2,
            }}
          >
            {tableData.displayName}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color:    'rgba(255,255,255,0.65)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {tableData.tableName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {tableData.isCore && (
            <span
              style={{
                fontSize:     10,
                color:        'rgba(255,255,255,0.7)',
                background:   'rgba(255,255,255,0.15)',
                padding:      '1px 6px',
                borderRadius: 'var(--radius-full)',
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
                background: 'rgba(255,255,255,0.15)',
                border:     'none',
                color:      'rgba(255,255,255,0.8)',
                borderRadius: 'var(--radius-sm)',
                cursor:     'pointer',
                width:      20,
                height:     20,
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize:   12,
                padding:    0,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: 'var(--space-1) 0' }}>
        {visibleFields.length === 0 && (
          <div
            style={{
              padding:  'var(--space-3) var(--space-4)',
              fontSize: 'var(--text-xs)',
              color:    'var(--text-muted)',
              fontStyle: 'italic',
            }}
          >
            No fields yet — add one below
          </div>
        )}
        {visibleFields.map((field) => (
          <div
            key={field.fieldId}
            style={{
              display:    'flex',
              alignItems: 'center',
              padding:    'var(--space-2) var(--space-4)',
              gap:        'var(--space-2)',
              borderBottom: '1px solid var(--color-gray-100)',
            }}
          >
            <span
              style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   TYPE_COLOR[field.type],
                flexShrink:   0,
              }}
            />
            <span
              style={{
                flex:       1,
                fontSize:   'var(--text-xs)',
                color:      field.isCore ? 'var(--text-muted)' : 'var(--text-primary)',
                fontWeight: field.isCore ? 'var(--font-normal)' : 'var(--font-medium)',
                fontFamily: 'var(--font-mono)',
                overflow:   'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {field.columnName}
            </span>
            <span
              style={{
                fontSize:   9,
                color:      TYPE_COLOR[field.type],
                background: `${TYPE_COLOR[field.type]}15`,
                padding:    '1px 5px',
                borderRadius: 'var(--radius-full)',
                flexShrink: 0,
                fontWeight: 'var(--font-medium)',
              }}
            >
              {field.type}
            </span>
            {!field.nullable && (
              <span
                style={{
                  fontSize:     9,
                  color:        'var(--color-error)',
                  background:   'var(--color-error-light)',
                  padding:      '1px 5px',
                  borderRadius: 'var(--radius-full)',
                  flexShrink:   0,
                }}
              >
                NN
              </span>
            )}
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
                  fontSize:   12,
                  lineHeight: 1,
                  display:    'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  opacity:    0,
                }}
                className="field-delete-btn"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add field area */}
      <AnimatePresence>
        {showAddField && (
          <AddFieldRow
            tableId={id}
            onClose={() => setShowAddField(false)}
          />
        )}
      </AnimatePresence>

      {/* Add field button */}
      {!showAddField && (
        <button
          onClick={() => setShowAddField(true)}
          style={{
            width:      '100%',
            background: 'none',
            border:     'none',
            borderTop:  '1px dashed var(--color-gray-200)',
            padding:    'var(--space-2) var(--space-4)',
            fontSize:   'var(--text-xs)',
            color:      'var(--text-muted)',
            cursor:     'pointer',
            textAlign:  'left',
            display:    'flex',
            alignItems: 'center',
            gap:        'var(--space-1)',
          }}
        >
          <span style={{ fontSize: 14 }}>+</span> Add field
        </button>
      )}

      {/* CSS for hover-show delete button */}
      <style>{`
        .react-flow__node:hover .field-delete-btn {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex:        1,
  padding:     '4px var(--space-2)',
  fontSize:    'var(--text-xs)',
  border:      '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-sm)',
  color:       'var(--text-primary)',
  background:  'var(--surface-card)',
  outline:     'none',
  minWidth:    0,
  fontFamily:  'var(--font-mono)',
};

const cancelBtnStyle: React.CSSProperties = {
  padding:      '3px var(--space-3)',
  fontSize:     'var(--text-xs)',
  background:   'none',
  border:       '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-sm)',
  cursor:       'pointer',
  color:        'var(--text-secondary)',
};

const addBtnStyle: React.CSSProperties = {
  padding:      '3px var(--space-3)',
  fontSize:     'var(--text-xs)',
  background:   'var(--color-brand-500)',
  border:       'none',
  borderRadius: 'var(--radius-sm)',
  cursor:       'pointer',
  color:        'var(--color-gray-0)',
  fontWeight:   'var(--font-medium)',
};
