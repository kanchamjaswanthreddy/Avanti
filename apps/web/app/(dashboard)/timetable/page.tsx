'use client';

// Avanti — Timetable Page
// Class selector → weekly period grid (Mon–Sat × periods).

import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../../../lib/api';
import type { SchoolClass, TimetableSlot } from '@avanti/types';

const DAYS: { key: number; label: string; short: string }[] = [
  { key: 1, label: 'Monday',    short: 'Mon' },
  { key: 2, label: 'Tuesday',   short: 'Tue' },
  { key: 3, label: 'Wednesday', short: 'Wed' },
  { key: 4, label: 'Thursday',  short: 'Thu' },
  { key: 5, label: 'Friday',    short: 'Fri' },
  { key: 6, label: 'Saturday',  short: 'Sat' },
];

// Deterministic soft color per subject name
const SUBJECT_PALETTES = [
  { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
  { bg: '#FDF4FF', border: '#E9D5FF', text: '#7E22CE' },
  { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
  { bg: '#FEF9C3', border: '#FDE68A', text: '#92400E' },
  { bg: '#FCE7F3', border: '#FBCFE8', text: '#9D174D' },
  { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' },
  { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
];

function subjectColor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) & 0xffff;
  return SUBJECT_PALETTES[hash % SUBJECT_PALETTES.length]!;
}

// ── Slot Cell ──────────────────────────────────────────────────────────────────

function SlotCell({ slot }: { slot: TimetableSlot | undefined }) {
  if (!slot) {
    return (
      <td
        style={{
          padding:       'var(--space-1)',
          borderRight:   '1px solid var(--color-gray-100)',
          borderBottom:  '1px solid var(--color-gray-100)',
          verticalAlign: 'top',
          minWidth:      110,
          height:        72,
          background:    '#FAFBFC',
        }}
      />
    );
  }
  const c = subjectColor(slot.subject);
  return (
    <td
      style={{
        padding:       'var(--space-1)',
        borderRight:   '1px solid var(--color-gray-100)',
        borderBottom:  '1px solid var(--color-gray-100)',
        verticalAlign: 'top',
        minWidth:      110,
      }}
    >
      <div
        style={{
          background:   c.bg,
          border:       `1px solid ${c.border}`,
          borderRadius: 'var(--radius-md)',
          padding:      'var(--space-2)',
          minHeight:    60,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
          {slot.subject}
        </div>
        {slot.teacherName && (
          <div style={{ fontSize: 10, color: c.text, opacity: 0.75, marginTop: 2 }}>
            {slot.teacherName}
          </div>
        )}
        {slot.room && (
          <div style={{ fontSize: 10, color: c.text, opacity: 0.6 }}>{slot.room}</div>
        )}
        <div style={{ fontSize: 10, color: c.text, opacity: 0.55, marginTop: 2 }}>
          {slot.startTime}–{slot.endTime}
        </div>
      </div>
    </td>
  );
}

// ── Empty / placeholder states ─────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        'var(--space-16)',
        background:     '#fff',
        borderRadius:   'var(--radius-xl)',
        boxShadow:      '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        gap:            'var(--space-3)',
        textAlign:      'center',
      }}
    >
      <div
        style={{
          width:          52,
          height:         52,
          borderRadius:   'var(--radius-xl)',
          background:     'var(--color-brand-50)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          'var(--color-brand-400)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 2v3M15 2v3M2 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{message}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [slots,   setSlots]   = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [clsLoading, setClsLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setClsLoading(true);
    void getApiClient()
      .getClasses()
      .then(cls => {
        setClasses(cls);
        if (cls[0]) setClassId(cls[0].id);
      })
      .catch(() => {/* ignore */})
      .finally(() => setClsLoading(false));
  }, []);

  const loadTimetable = useCallback(async (cid: string) => {
    if (!cid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getApiClient().getWeeklyTimetable(cid);
      // Guard: API might return undefined .slots
      setSlots(Array.isArray(data?.slots) ? data.slots : []);
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

  // Defensive: ensure slots is always an array before computations
  const safeSlots = Array.isArray(slots) ? slots : [];

  // Build period rows: max period from data, fallback 8
  const maxPeriod = safeSlots.length > 0
    ? Math.max(...safeSlots.map(s => s.periodNumber))
    : 8;
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  // Lookup: dayOfWeek → periodNumber → slot
  const slotMap: Record<number, Record<number, TimetableSlot>> = {};
  for (const slot of safeSlots) {
    if (!slotMap[slot.dayOfWeek]) slotMap[slot.dayOfWeek] = {};
    slotMap[slot.dayOfWeek]![slot.periodNumber] = slot;
  }

  // Representative time per period number
  const periodTime: Record<number, string> = {};
  for (const slot of safeSlots) {
    if (!periodTime[slot.periodNumber]) {
      periodTime[slot.periodNumber] = `${slot.startTime}–${slot.endTime}`;
    }
  }

  const selectedClass = classes.find(c => c.id === classId);

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Timetable
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
            {selectedClass
              ? `${selectedClass.name}${selectedClass.section ? ` — ${selectedClass.section}` : ''} · weekly schedule`
              : 'Weekly class schedule'}
          </p>
        </div>

        {/* Class picker */}
        <select
          value={classId}
          onChange={e => setClassId(e.target.value)}
          disabled={clsLoading}
          style={{
            padding:      'var(--space-2) var(--space-3)',
            border:       '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-md)',
            fontSize:     'var(--text-sm)',
            background:   '#fff',
            color:        'var(--text-primary)',
            minWidth:     200,
            height:       38,
            boxShadow:    '0 1px 2px rgba(0,0,0,0.04)',
            outline:      'none',
            cursor:       clsLoading ? 'not-allowed' : 'pointer',
            opacity:      clsLoading ? 0.6 : 1,
          }}
        >
          <option value="">Select class…</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.section ? ` — ${c.section}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background:   '#FEF2F2',
          border:       '1px solid #FECACA',
          borderRadius: 'var(--radius-md)',
          padding:      'var(--space-3) var(--space-4)',
          fontSize:     'var(--text-sm)',
          color:        '#B91C1C',
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          <div style={{
            width: 16, height: 16,
            border: '2px solid var(--color-brand-100)',
            borderTop: '2px solid var(--color-brand-500)',
            borderRadius: '50%',
            animation: 'avanti-spin 0.7s linear infinite',
          }} />
          Loading timetable…
        </div>
      )}

      {/* No class selected */}
      {!loading && !classId && (
        <EmptyState message="Select a class above to view its weekly timetable." />
      )}

      {/* No slots */}
      {!loading && classId && safeSlots.length === 0 && !error && (
        <EmptyState message="No timetable slots have been configured for this class yet." />
      )}

      {/* Timetable grid */}
      {!loading && classId && safeSlots.length > 0 && (
        <div
          style={{
            background:   '#fff',
            borderRadius: 'var(--radius-xl)',
            boxShadow:    '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            overflow:     'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: 700 }}>
              <thead>
                <tr>
                  {/* Period column header */}
                  <th
                    style={{
                      padding:       'var(--space-3) var(--space-4)',
                      textAlign:     'left',
                      fontWeight:    600,
                      color:         'var(--text-muted)',
                      fontSize:      10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      background:    '#F8FAFC',
                      borderRight:   '1px solid var(--color-gray-100)',
                      borderBottom:  '1px solid var(--color-gray-100)',
                      minWidth:      90,
                    }}
                  >
                    Period
                  </th>
                  {DAYS.map(d => (
                    <th
                      key={d.key}
                      style={{
                        padding:       'var(--space-3) var(--space-4)',
                        textAlign:     'center',
                        fontWeight:    600,
                        color:         'var(--color-brand-700, #1e40af)',
                        fontSize:      'var(--text-sm)',
                        background:    '#F0F5FF',
                        borderRight:   '1px solid var(--color-gray-100)',
                        borderBottom:  '1px solid var(--color-gray-100)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {d.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, idx) => (
                  <tr key={p} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                    {/* Period label */}
                    <td
                      style={{
                        padding:     'var(--space-2) var(--space-3)',
                        borderRight: '1px solid var(--color-gray-100)',
                        borderBottom:'1px solid var(--color-gray-100)',
                        background:  '#F8FAFC',
                        verticalAlign: 'middle',
                        whiteSpace:  'nowrap',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
                        P{p}
                      </div>
                      {periodTime[p] && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
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
        </div>
      )}

      <style>{`
        @keyframes avanti-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
