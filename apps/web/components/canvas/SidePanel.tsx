// Avanti — Canvas Side Panel
// Read-only schema browser: shows tables and fields from the saved meta-schema.
// Split into Core Tables and Custom Tables sections.

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { MetaTable } from '@avanti/types';

// ── Field type badge colours ──────────────────────────────────────────────────

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

// ── Chevron icon ──────────────────────────────────────────────────────────────

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      style={{
        flexShrink:  0,
        transition:  'transform 0.15s ease',
        transform:   expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      <path
        d="M3 2l4 3-4 3"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── TableSection ──────────────────────────────────────────────────────────────

function TableSection({ table }: { table: MetaTable }) {
  const [expanded, setExpanded] = useState(false);
  const visibleFields = table.fields.filter(f => !f.isHidden);

  return (
    <div
      style={{
        border:       '1px solid var(--color-gray-200)',
        borderLeft:   `3px solid ${table.isCore ? '#94a3b8' : '#F59E0B'}`,
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
          padding:    'var(--space-2) var(--space-3)',
          display:    'flex',
          alignItems: 'center',
          gap:        'var(--space-2)',
          cursor:     'pointer',
          textAlign:  'left',
        }}
      >
        <Chevron expanded={expanded} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize:     'var(--text-xs)',
              fontWeight:   'var(--font-semibold)',
              color:        'var(--text-primary)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}
          >
            {table.displayName}
          </div>
          <div
            style={{
              fontSize:     'var(--text-xs)',
              color:        'var(--text-muted)',
              fontFamily:   'var(--font-mono)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}
          >
            {table.tableName}
          </div>
        </div>
        <span
          style={{
            fontSize:     9,
            color:        'var(--text-muted)',
            background:   'var(--color-gray-100)',
            padding:      '1px 5px',
            borderRadius: 'var(--radius-full)',
            flexShrink:   0,
          }}
        >
          {visibleFields.length}
        </span>
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
            <div style={{ borderTop: '1px solid var(--color-gray-100)', padding: 'var(--space-1) 0' }}>
              {visibleFields.map(field => {
                const isPK = field.columnName === 'id';
                return (
                  <div
                    key={field.id}
                    style={{
                      display:    'flex',
                      alignItems: 'center',
                      padding:    'var(--space-1) var(--space-3)',
                      gap:        'var(--space-2)',
                    }}
                  >
                    <span
                      style={{
                        width:        6,
                        height:       6,
                        borderRadius: '50%',
                        background:   isPK ? '#f59e0b' : (TYPE_COLOR[field.type] ?? '#9ca3af'),
                        flexShrink:   0,
                      }}
                    />
                    <span
                      style={{
                        flex:         1,
                        fontSize:     'var(--text-xs)',
                        color:        isPK ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontFamily:   'var(--font-mono)',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
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
                      {isPK ? 'PK' : field.type}
                    </span>
                    {!field.nullable && !isPK && (
                      <span style={{ fontSize: 9, color: 'var(--color-error)', flexShrink: 0 }} title="NOT NULL">
                        NN
                      </span>
                    )}
                  </div>
                );
              })}
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

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <div
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         'var(--space-2)',
        padding:     'var(--space-2) 0 var(--space-1)',
      }}
    >
      <span
        style={{
          width:        3,
          height:       12,
          borderRadius: 2,
          background:   accent,
          flexShrink:   0,
        }}
      />
      <span
        style={{
          fontSize:      'var(--text-xs)',
          fontWeight:    'var(--font-semibold)',
          color:         'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          flex:          1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize:     9,
          color:        'var(--text-muted)',
          background:   'var(--color-gray-100)',
          padding:      '1px 6px',
          borderRadius: 'var(--radius-full)',
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ── SidePanel ─────────────────────────────────────────────────────────────────

export function SidePanel() {
  const baseMetaSchema = useCanvasStore(s => s.baseMetaSchema);
  const nodes          = useCanvasStore(s => s.nodes);

  if (!baseMetaSchema) return null;

  const allTables    = baseMetaSchema.tables.filter(t => !t.isHidden);
  const coreTables   = allTables.filter(t => t.isCore);
  const customTables = allTables.filter(t => !t.isCore);

  const savedTableCount   = allTables.length;
  const currentTableCount = nodes.filter(n => n.type === 'TABLE').length;
  const pendingNew        = currentTableCount - savedTableCount;

  return (
    <div
      style={{
        width:         272,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize:      'var(--text-xs)',
              fontWeight:    'var(--font-semibold)',
              color:         'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            Schema
          </span>
          <span
            style={{
              fontSize:     'var(--text-xs)',
              color:        'var(--color-brand-500)',
              background:   'var(--color-brand-50)',
              padding:      '1px var(--space-2)',
              borderRadius: 'var(--radius-full)',
              fontWeight:   'var(--font-medium)',
            }}
          >
            v{baseMetaSchema.version}
          </span>
        </div>

        <div
          style={{
            marginTop: 'var(--space-2)',
            fontSize:  'var(--text-xs)',
            color:     'var(--text-muted)',
            display:   'flex',
            gap:       'var(--space-3)',
          }}
        >
          <span>{savedTableCount} saved</span>
          {pendingNew > 0 && (
            <span style={{ color: '#F59E0B', fontWeight: 'var(--font-medium)' }}>
              +{pendingNew} pending
            </span>
          )}
        </div>
      </div>

      {/* Table list */}
      <div
        style={{
          flex:          1,
          overflowY:     'auto',
          padding:       'var(--space-3)',
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-1)',
        }}
      >
        {/* Core tables */}
        {coreTables.length > 0 && (
          <>
            <SectionHeader label="Core" count={coreTables.length} accent="#94a3b8" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
              {coreTables.map(table => (
                <TableSection key={table.id} table={table} />
              ))}
            </div>
          </>
        )}

        {/* Custom tables */}
        {customTables.length > 0 && (
          <>
            <SectionHeader label="Custom" count={customTables.length} accent="#F59E0B" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {customTables.map(table => (
                <TableSection key={table.id} table={table} />
              ))}
            </div>
          </>
        )}

        {savedTableCount === 0 && (
          <div
            style={{
              padding:   'var(--space-6) var(--space-4)',
              fontSize:  'var(--text-sm)',
              color:     'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            No tables saved yet.
            <br />
            <span style={{ fontSize: 'var(--text-xs)' }}>Add a table from the toolbar.</span>
          </div>
        )}
      </div>

      {/* Tip footer */}
      <div
        style={{
          padding:      'var(--space-3) var(--space-4)',
          borderTop:    '1px solid var(--color-gray-100)',
          flexShrink:   0,
        }}
      >
        <div
          style={{
            fontSize:     'var(--text-xs)',
            color:        'var(--text-muted)',
            lineHeight:   1.5,
            display:      'flex',
            gap:          'var(--space-2)',
            alignItems:   'flex-start',
          }}
        >
          <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>💡</span>
          <span>Hover a table, then drag from the amber dot on a field to connect tables.</span>
        </div>
      </div>
    </div>
  );
}
