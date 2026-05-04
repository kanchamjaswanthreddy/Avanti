'use client';

// Avanti — Attendance Marking Page
// Class + date selector → student roster → P/A/H/L toggle → save.

import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../../../lib/api';
import type { SchoolClass, AttendanceRosterEntry, AttendanceStatus } from '@avanti/types';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; bg: string }[] = [
  { value: 'PRESENT',  label: 'P', color: '#15803d', bg: '#dcfce7' },
  { value: 'ABSENT',   label: 'A', color: '#b91c1c', bg: '#fee2e2' },
  { value: 'HALF_DAY', label: 'H', color: '#b45309', bg: '#fef9c3' },
  { value: 'LATE',     label: 'L', color: '#7c3aed', bg: '#ede9fe' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function StatusToggle({
  value,
  onChange,
}: {
  value: AttendanceStatus | null;
  onChange: (s: AttendanceStatus) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {STATUS_OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              width:        '30px',
              height:       '30px',
              borderRadius: '6px',
              border:       active ? `2px solid ${opt.color}` : '1px solid var(--color-gray-300)',
              background:   active ? opt.bg : 'var(--surface-card)',
              color:        active ? opt.color : 'var(--text-muted)',
              fontWeight:   active ? 700 : 400,
              fontSize:     '12px',
              cursor:       'pointer',
              transition:   'all 100ms',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AttendancePage() {
  const [classes,  setClasses]   = useState<SchoolClass[]>([]);
  const [classId,  setClassId]   = useState('');
  const [date,     setDate]      = useState(todayISO());
  const [roster,   setRoster]    = useState<AttendanceRosterEntry[]>([]);
  const [marks,    setMarks]     = useState<Record<string, AttendanceStatus | null>>({});
  const [loading,  setLoading]   = useState(false);
  const [saving,   setSaving]    = useState(false);
  const [saved,    setSaved]     = useState(false);
  const [error,    setError]     = useState<string | null>(null);

  useEffect(() => {
    void getApiClient().getClasses().then(cls => {
      setClasses(cls);
      if (cls[0]) setClassId(cls[0].id);
    }).catch(() => {/* ignore */});
  }, []);

  const loadAttendance = useCallback(async (cid: string, d: string) => {
    if (!cid || !d) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const data = await getApiClient().getClassAttendance(cid, d);
      setRoster(data.roster);
      const m: Record<string, AttendanceStatus | null> = {};
      for (const r of data.roster) m[r.studentId] = r.status;
      setMarks(m);
    } catch {
      setRoster([]);
      setMarks({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (classId && date) void loadAttendance(classId, date);
  }, [loadAttendance, classId, date]);

  const markAll = (status: AttendanceStatus) => {
    setMarks(prev => {
      const next = { ...prev };
      for (const id of Object.keys(next)) next[id] = status;
      return next;
    });
  };

  const summary = {
    PRESENT:  Object.values(marks).filter(s => s === 'PRESENT').length,
    ABSENT:   Object.values(marks).filter(s => s === 'ABSENT').length,
    HALF_DAY: Object.values(marks).filter(s => s === 'HALF_DAY').length,
    LATE:     Object.values(marks).filter(s => s === 'LATE').length,
    unmarked: Object.values(marks).filter(s => s === null).length,
  };

  const handleSave = async () => {
    const records = Object.entries(marks)
      .filter(([, s]) => s !== null)
      .map(([studentId, status]) => ({ studentId, status: status! }));

    if (records.length === 0) {
      setError('Please mark at least one student before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await getApiClient().markAttendance(classId, date, records);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Attendance
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            Mark daily attendance for a class
          </p>
        </div>

        {/* Class + date selectors */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize:     'var(--text-sm)',
              background:   'var(--surface-card)',
              color:        'var(--text-primary)',
              minWidth:     '160px',
            }}
          >
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.section ? ` — ${c.section}` : ''}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize:     'var(--text-sm)',
              background:   'var(--surface-card)',
              color:        'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Summary bar */}
      {roster.length > 0 && (
        <div
          style={{
            display:    'flex',
            gap:        'var(--space-4)',
            flexWrap:   'wrap',
            padding:    'var(--space-4)',
            background: 'var(--surface-card)',
            border:     '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-lg)',
            alignItems: 'center',
          }}
        >
          {STATUS_OPTIONS.map(opt => (
            <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: opt.bg, border: `2px solid ${opt.color}`, flexShrink: 0,
              }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {opt.label}: <strong style={{ color: 'var(--text-primary)' }}>{summary[opt.value]}</strong>
              </span>
            </div>
          ))}
          {summary.unmarked > 0 && (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning-600, #d97706)', marginLeft: 'auto' }}>
              {summary.unmarked} not yet marked
            </span>
          )}

          {/* Bulk mark */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mark all:</span>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => markAll(opt.value)}
                style={{
                  padding:      '3px 10px',
                  borderRadius: '6px',
                  border:       `1px solid ${opt.color}`,
                  background:   opt.bg,
                  color:        opt.color,
                  fontSize:     '11px',
                  fontWeight:   700,
                  cursor:       'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
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

      {saved && (
        <div style={{
          background: 'var(--color-success-50, #f0fdf4)',
          border: '1px solid var(--color-success-200, #bbf7d0)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-success-700, #15803d)',
        }}>
          Attendance saved successfully.
        </div>
      )}

      {/* Roster */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
          Loading roster…
        </div>
      ) : !classId ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
          Select a class to begin.
        </div>
      ) : roster.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
          No students in this class.
        </div>
      ) : (
        <div
          style={{
            background:   'var(--surface-card)',
            border:       '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-lg)',
            overflow:     'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admission No.</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r, i) => (
                <tr
                  key={r.studentId}
                  style={{ borderBottom: i < roster.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}
                >
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', width: '40px' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>
                    {r.firstName} {r.lastName}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>
                    {r.admissionNumber}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <StatusToggle
                      value={marks[r.studentId] ?? null}
                      onChange={s => setMarks(prev => ({ ...prev, [r.studentId]: s }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save button */}
      {roster.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              padding:      'var(--space-3) var(--space-6)',
              background:   saving ? 'var(--color-gray-400)' : 'var(--color-brand-500)',
              color:        '#fff',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              fontSize:     'var(--text-sm)',
              fontWeight:   600,
              cursor:       saving ? 'not-allowed' : 'pointer',
              transition:   'background 150ms',
            }}
          >
            {saving ? 'Saving…' : 'Save attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
