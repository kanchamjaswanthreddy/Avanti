// Vidyut — Canvas Side Panel
// Read-only schema browser: shows tables and fields from the saved meta-schema.
// Shows the server-side truth (baseMetaSchema) + pending node count difference.

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { MetaTable } from '@vidyut/types';

// ── FieldType badge colours ───────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
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

// ── TableSection ──────────────────────────────────────────────────────────────

function TableSection({ table }: { table: MetaTable }) {
  const [expanded, setExpanded] = useState(false);
  const visibleFields = table.fields.filter(f => !f.isHidden);

  return (
    <div
      style={{
        border:       '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-md)',
        overflow:     'hidden',
        background:   'var(--surface-card)',
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width:      '100%',
          background: 'none',
          border:     'none',
          padding:    'var(--space-3) var(--space-3)',
          display:    'flex',
          alignItems: 'center',
          gap:        'var(--space-2)',
          cursor:     'pointer',
          textAlign:  'left',
        }}
      >
        <span
          style={{
            fontSize:   'var(--text-xs)',
            color:      'var(--text-muted)',
            transition: 'transform 0.15s ease',
            transform:  expanded ? 'rotate(90deg)' : 'none',
          }}
        >
          ▶
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize:   'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              color:      'var(--text-primary)',
              overflow:   'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {table.displayName}
          </div>
          <div
            style={{
              fontSize:  'var(--text-xs)',
              color:     'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              overflow:  'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {table.tableName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
          <span
            style={{
              fontSize:     10,
              color:        'var(--text-muted)',
              background:   'var(--color-gray-100)',
              padding:      '1px 5px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {visibleFields.length} fields
          </span>
          {table.isCore && (
            <span
              style={{
                fontSize:     10,
                color:        'var(--color-brand-500)',
                background:   'var(--color-brand-50)',
                padding:      '1px 5px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              CORE
            </span>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                borderTop: '1px solid var(--color-gray-100)',
                padding:   'var(--space-1) 0',
              }}
            >
              {visibleFields.map(field => (
                <div
                  key={field.id}
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    padding:    'var(--space-2) var(--space-3)',
                    gap:        'var(--space-2)',
                  }}
                >
                  <span
                    style={{
                      width:        6,
                      height:       6,
                      borderRadius: '50%',
                      background:   TYPE_COLOR[field.type] ?? '#9ca3af',
                      flexShrink:   0,
                    }}
                  />
                  <span
                    style={{
                      flex:       1,
                      fontSize:   'var(--text-xs)',
                      color:      'var(--text-primary)',
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
                      fontSize:     9,
                      color:        TYPE_COLOR[field.type] ?? 'var(--text-muted)',
                      background:   `${TYPE_COLOR[field.type] ?? '#9ca3af'}18`,
                      padding:      '1px 5px',
                      borderRadius: 'var(--radius-full)',
                      flexShrink:   0,
                    }}
                  >
                    {field.type}
                  </span>
                  {!field.nullable && (
                    <span
                      style={{
                        fontSize:     9,
                        color:        'var(--color-error)',
                        flexShrink:   0,
                      }}
                      title="NOT NULL"
                    >
                      NN
                    </span>
                  )}
                </div>
              ))}
              {visibleFields.length === 0 && (
                <div
                  style={{
                    padding:   'var(--space-2) var(--space-3)',
                    fontSize:  'var(--text-xs)',
                    color:     'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  No fields
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SidePanel ─────────────────────────────────────────────────────────────────

export function SidePanel() {
  const baseMetaSchema = useCanvasStore(s => s.baseMetaSchema);
  const nodes          = useCanvasStore(s => s.nodes);

  if (!baseMetaSchema) return null;

  const savedTableCount   = baseMetaSchema.tables.filter(t => !t.isHidden).length;
  const currentTableCount = nodes.filter(n => n.type === 'TABLE').length;
  const pendingNew        = currentTableCount - savedTableCount;

  return (
    <div
      style={{
        width:         280,
        flexShrink:    0,
        borderLeft:    '1px solid var(--color-gray-200)',
        background:    'var(--surface-card)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding:      'var(--space-4)',
          borderBottom: '1px solid var(--color-gray-100)',
          flexShrink:   0,
        }}
      >
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize:   'var(--text-xs)',
              fontWeight: 'var(--font-semibold)',
              color:      'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Schema
          </span>
          <span
            style={{
              fontSize:     'var(--text-xs)',
              color:        'var(--text-muted)',
              background:   'var(--color-gray-100)',
              padding:      '1px var(--space-2)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            v{baseMetaSchema.version}
          </span>
        </div>

        <div
          style={{
            marginTop:  'var(--space-2)',
            fontSize:   'var(--text-xs)',
            color:      'var(--text-muted)',
            display:    'flex',
            gap:        'var(--space-3)',
          }}
        >
          <span>{savedTableCount} saved tables</span>
          {pendingNew > 0 && (
            <span style={{ color: 'var(--color-accent-600)' }}>
              +{pendingNew} pending
            </span>
          )}
        </div>
      </div>

      {/* Table list */}
      <div
        style={{
          flex:      1,
          overflowY: 'auto',
          padding:   'var(--space-3)',
          display:   'flex',
          flexDirection: 'column',
          gap:       'var(--space-2)',
        }}
      >
        {baseMetaSchema.tables
          .filter(t => !t.isHidden)
          .map(table => (
            <TableSection key={table.id} table={table} />
          ))}

        {savedTableCount === 0 && (
          <div
            style={{
              padding:   'var(--space-6) var(--space-4)',
              fontSize:  'var(--text-sm)',
              color:     'var(--text-muted)',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            No tables saved yet.
            <br />
            Add a table from the toolbar.
          </div>
        )}
      </div>
    </div>
  );
}
