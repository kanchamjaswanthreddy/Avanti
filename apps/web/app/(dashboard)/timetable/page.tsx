'use client';

// Avanti — Timetable Page
// Class selector → weekly period grid (Mon–Sat × periods).

import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../../../lib/api';
import type { SchoolClass, TimetableSlot } from '@avanti/types';

const DAYS: { key: number; label: string }[] = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
];

// Rotating soft colors for subjects
const SUBJECT_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  { bg: '#fef9c3', border: '#fde68a', text: '#92400e' },
  { bg: '#fce7f3', border: '#fbcfe8', text: '#9d174d' },
  { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
];

function subjectColor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) & 0xffff;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length]!;
}

function SlotCell({ slot }: { slot?: TimetableSlot | undefined }) {
  if (!slot) {
    return (
      <td style={{
        padding: 'var(--space-2)',
        border: '1px solid var(--color-gray-100)',
        verticalAlign: 'top',
        minWidth: '100px',
        height: '60px',
      }} />
    );
  }
  const c = subjectColor(slot.subject);
  return (
    <td style={{
      padding: 'var(--space-1)',
      border: '1px solid var(--color-gray-100)',
      verticalAlign: 'top',
      minWidth: '100px',
    }}>
      <div style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '6px',
        padding: 'var(--space-2)',
        height: '100%',
        minHeight: '52px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: c.text }}>{slot.subject}</div>
        {slot.teacherName && (
          <div style={{ fontSize: '10px', color: c.text, opacity: 0.75, marginTop: '2px' }}>{slot.teacherName}</div>
        )}
        {slot.room && (
          <div style={{ fontSize: '10px', color: c.text, opacity: 0.6 }}>{slot.room}</div>
        )}
        <div style={{ fontSize: '10px', color: c.text, opacity: 0.55, marginTop: '2px' }}>
          {slot.startTime}–{slot.endTime}
        </div>
      </div>
    </td>
  );
}

export default function TimetablePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [slots,   setSlots]   = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    void getApiClient().getClasses().then(cls => {
      setClasses(cls);
      if (cls[0]) setClassId(cls[0].id);
    }).catch(() => {/* ignore */});
  }, []);

  const loadTimetable = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getApiClient().getWeeklyTimetable(cid);
      setSlots(data.slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (classId) void loadTimetable(classId);
  }, [loadTimetable, classId]);

  // Build grid: periods on rows, days on columns
  const maxPeriod = slots.length > 0 ? Math.max(...slots.map(s => s.periodNumber)) : 8;
  const periods   = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  // Lookup: day → period → slot
  const slotMap: Record<number, Record<number, TimetableSlot>> = {};
  for (const slot of slots) {
    if (!slotMap[slot.dayOfWeek]) slotMap[slot.dayOfWeek] = {};
    slotMap[slot.dayOfWeek]![slot.periodNumber] = slot;
  }

  // Representative time labels from period 1 on any day
  const periodTime: Record<number, string> = {};
  for (const slot of slots) {
    if (!periodTime[slot.periodNumber]) {
      periodTime[slot.periodNumber] = `${slot.startTime}–${slot.endTime}`;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Timetable
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            Weekly class schedule
          </p>
        </div>
        <select
          value={classId}
          onChange={e => setClassId(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            minWidth: '180px',
          }}
        >
          <option value="">Select class</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.section ? ` — ${c.section}` : ''}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-error-50, #fef2f2)',
          border: '1px solid var(--color-error-200, #fecaca)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-error-700, #b91c1c)',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
          Loading timetable…
        </div>
      ) : !classId ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
          Select a class to view its timetable.
        </div>
      ) : slots.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--space-10)',
          background: 'var(--surface-card)', border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)',
        }}>
          No timetable slots configured for this class.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse',
            fontSize: 'var(--text-sm)',
            minWidth: '700px',
            background: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--color-gray-200)',
          }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-50)' }}>
                <th style={{
                  padding: 'var(--space-3) var(--space-4)',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid var(--color-gray-200)',
                  minWidth: '80px',
                }}>
                  Period
                </th>
                {DAYS.map(d => (
                  <th
                    key={d.key}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--color-gray-200)',
                      minWidth: '110px',
                    }}
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p}>
                  <td style={{
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--color-gray-100)',
                    background: 'var(--color-gray-50)',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)' }}>P{p}</div>
                    {periodTime[p] && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {periodTime[p]}
                      </div>
                    )}
                  </td>
                  {DAYS.map(d => (
                    <SlotCell key={d.key} slot={slotMap[d.key]?.[p]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
