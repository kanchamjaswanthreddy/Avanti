// Vidyut — Change Preview Modal
// Shows pending SchemaChangeDescriptor[] in human-readable form before saving.
// Shown only when there are schema changes (not for position-only saves).

'use client';

import React from 'react';
import { motion } from 'motion/react';
import type { SchemaChangeDescriptor, MetaSchema } from '@vidyut/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function describeChange(change: SchemaChangeDescriptor, schema: MetaSchema | null): string {
  const table = schema?.tables.find(t => t.id === change.tableId);
  const tableName = table?.displayName ?? change.tableId.slice(0, 8) + '…';

  switch (change.action) {
    case 'ADD_TABLE': {
      const p = change.payload as { tableName?: string; displayName?: string; fields?: unknown[] };
      const fieldCount = p.fields?.length ?? 0;
      const dn = p.displayName ?? p.tableName ?? 'new table';
      return `Add table "${dn}"${fieldCount > 0 ? ` with ${fieldCount} field${fieldCount !== 1 ? 's' : ''}` : ''}`;
    }
    case 'DROP_TABLE':
      return `Hide table "${tableName}"`;
    case 'ADD_COLUMN': {
      const p = change.payload as { columnName?: string; type?: string };
      return `Add column "${p.columnName ?? '?'}" (${p.type ?? '?'}) to "${tableName}"`;
    }
    case 'DROP_COLUMN': {
      const field = table?.fields.find(f => f.id === change.fieldId);
      return `Hide column "${field?.columnName ?? change.fieldId?.slice(0, 8) ?? '?'}" from "${tableName}"`;
    }
    case 'RENAME_COLUMN': {
      const field = table?.fields.find(f => f.id === change.fieldId);
      const p = change.payload as { newColumnName?: string };
      return `Rename "${field?.columnName ?? '?'}" → "${p.newColumnName ?? '?'}" in "${tableName}"`;
    }
    case 'CHANGE_COLUMN_TYPE': {
      const field = table?.fields.find(f => f.id === change.fieldId);
      const p = change.payload as { newType?: string };
      return `Change "${field?.columnName ?? '?'}" type to ${p.newType ?? '?'} in "${tableName}"`;
    }
    case 'SET_NULLABLE': {
      const field = table?.fields.find(f => f.id === change.fieldId);
      const p = change.payload as { nullable?: boolean };
      return `${p.nullable ? 'Allow nulls' : 'Require value'} for "${field?.columnName ?? '?'}" in "${tableName}"`;
    }
    case 'ADD_ENUM_VALUE': {
      const field = table?.fields.find(f => f.id === change.fieldId);
      const p = change.payload as { value?: string };
      return `Add enum value "${p.value ?? '?'}" to "${field?.columnName ?? '?'}" in "${tableName}"`;
    }
    case 'SET_DEFAULT': {
      const field = table?.fields.find(f => f.id === change.fieldId);
      const p = change.payload as { defaultValue?: unknown };
      return `Set default "${String(p.defaultValue ?? 'null')}" for "${field?.columnName ?? '?'}" in "${tableName}"`;
    }
    default:
      return `${change.action} on "${tableName}"`;
  }
}

function actionColor(action: string): string {
  if (action.startsWith('ADD_') || action === 'ADD_ENUM_VALUE') return 'var(--color-success)';
  if (action.startsWith('DROP_') || action.startsWith('REMOVE_')) return 'var(--color-error)';
  return 'var(--color-info)';
}

function actionBg(action: string): string {
  if (action.startsWith('ADD_') || action === 'ADD_ENUM_VALUE') return 'var(--color-success-light)';
  if (action.startsWith('DROP_') || action.startsWith('REMOVE_')) return 'var(--color-error-light)';
  return 'var(--color-info-light)';
}

// ── ChangePreviewModal ────────────────────────────────────────────────────────

interface ChangePreviewModalProps {
  changes:    SchemaChangeDescriptor[];
  metaSchema: MetaSchema | null;
  onConfirm:  () => void;
  onCancel:   () => void;
}

export function ChangePreviewModal({
  changes,
  metaSchema,
  onConfirm,
  onCancel,
}: ChangePreviewModalProps) {
  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        background: 'var(--surface-overlay)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex:     'var(--z-modal)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.97,    y: 10 }}
        transition={{ duration: 0.18 }}
        style={{
          background:   'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          width:        520,
          maxHeight:    '80vh',
          display:      'flex',
          flexDirection: 'column',
          boxShadow:    'var(--shadow-xl)',
          overflow:     'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding:      'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--color-gray-200)',
            flexShrink:   0,
          }}
        >
          <h2
            style={{
              margin:     0,
              fontSize:   'var(--text-base)',
              fontWeight: 'var(--font-semibold)',
              color:      'var(--text-primary)',
            }}
          >
            Review Schema Changes
          </h2>
          <p
            style={{
              margin:   'var(--space-1) 0 0',
              fontSize: 'var(--text-sm)',
              color:    'var(--text-secondary)',
            }}
          >
            {changes.length} change{changes.length !== 1 ? 's' : ''} will be applied to the database.
            This cannot be undone after confirming.
          </p>
        </div>

        {/* Change list */}
        <div
          style={{
            flex:      1,
            overflowY: 'auto',
            padding:   'var(--space-4) var(--space-6)',
            display:   'flex',
            flexDirection: 'column',
            gap:       'var(--space-2)',
          }}
        >
          {changes.map((change, i) => (
            <div
              key={i}
              style={{
                display:    'flex',
                alignItems: 'flex-start',
                gap:        'var(--space-3)',
              }}
            >
              <span
                style={{
                  fontSize:     9,
                  fontWeight:   'var(--font-semibold)',
                  color:        actionColor(change.action),
                  background:   actionBg(change.action),
                  padding:      '2px var(--space-2)',
                  borderRadius: 'var(--radius-full)',
                  flexShrink:   0,
                  marginTop:    2,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {change.action.replace(/_/g, ' ')}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  color:    'var(--text-primary)',
                  lineHeight: 'var(--leading-normal)',
                }}
              >
                {describeChange(change, metaSchema)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding:      'var(--space-4) var(--space-6)',
            borderTop:    '1px solid var(--color-gray-200)',
            display:      'flex',
            gap:          'var(--space-3)',
            justifyContent: 'flex-end',
            flexShrink:   0,
            background:   'var(--color-gray-50)',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding:      'var(--space-2) var(--space-5)',
              fontSize:     'var(--text-sm)',
              background:   'none',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-sm)',
              cursor:       'pointer',
              color:        'var(--text-secondary)',
              fontWeight:   'var(--font-medium)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding:      'var(--space-2) var(--space-5)',
              fontSize:     'var(--text-sm)',
              fontWeight:   'var(--font-semibold)',
              background:   'var(--color-brand-500)',
              border:       'none',
              borderRadius: 'var(--radius-sm)',
              cursor:       'pointer',
              color:        'var(--color-gray-0)',
            }}
          >
            Apply & Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
