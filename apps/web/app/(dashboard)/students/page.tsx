'use client';

// Avanti — Students List Page

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiClient } from '../../../lib/api';
import type { Student, SchoolClass } from '@avanti/types';

const PAGE_SIZE = 25;

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#EEF2FF', '#4F6DA8'],
  ['#D1FAE5', '#059669'],
  ['#FEF3C7', '#D97706'],
  ['#FCE7F3', '#BE185D'],
  ['#EDE9FE', '#7C3AED'],
  ['#DBEAFE', '#1D4ED8'],
];

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const [bg, fg] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]!;
  return (
    <div
      style={{
        width:          32,
        height:         32,
        borderRadius:   '50%',
        background:     bg,
        color:          fg,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       11,
        fontWeight:     700,
        flexShrink:     0,
        letterSpacing:  '0.02em',
      }}
    >
      {initials}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [classId,  setClassId]  = useState('');
  const [classes,  setClasses]  = useState<SchoolClass[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    void getApiClient().getClasses().then(setClasses).catch(() => {/* ignore */});
  }, []);

  const load = useCallback(async (p: number, q: string, cid: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getApiClient().getStudents({
        page: p, limit: PAGE_SIZE,
        ...(q   ? { search: q }    : {}),
        ...(cid ? { classId: cid } : {}),
      });
      setStudents(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page, search, classId); }, [load, page, search, classId]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontSize:      'var(--text-2xl)',
              fontWeight:    700,
              color:         'var(--text-primary)',
              margin:        0,
              letterSpacing: '-0.02em',
            }}
          >
            Students
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
            {loading ? 'Loading…' : `${total} students enrolled`}
          </p>
        </div>
        <Link
          href="/students/new"
          className="btn-brand"
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            'var(--space-2)',
            padding:        'var(--space-2) var(--space-4)',
            background:     'var(--color-brand-500)',
            color:          '#fff',
            borderRadius:   'var(--radius-md)',
            fontSize:       'var(--text-sm)',
            fontWeight:     600,
            textDecoration: 'none',
            height:         38,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add student
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or admission number…"
          className="avanti-input"
          style={{
            flex:         '1 1 240px',
            padding:      'var(--space-2) var(--space-3)',
            border:       '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-md)',
            fontSize:     'var(--text-sm)',
            background:   '#fff',
            color:        'var(--text-primary)',
            outline:      'none',
            height:       38,
            boxShadow:    '0 1px 2px rgba(0,0,0,0.04)',
          }}
        />
        <select
          value={classId}
          onChange={e => { setClassId(e.target.value); setPage(1); }}
          style={{
            padding:      'var(--space-2) var(--space-3)',
            border:       '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-md)',
            fontSize:     'var(--text-sm)',
            background:   '#fff',
            color:        'var(--text-primary)',
            minWidth:     160,
            height:       38,
            boxShadow:    '0 1px 2px rgba(0,0,0,0.04)',
            outline:      'none',
          }}
        >
          <option value="">All classes</option>
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
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--text-sm)', color: '#B91C1C',
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background:   '#fff',
          borderRadius: 'var(--radius-xl)',
          overflow:     'hidden',
          boxShadow:    '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
              {['Student', 'Admission No.', 'Class', 'Parent / Phone', ''].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding:       'var(--space-3) var(--space-4)',
                    textAlign:     'left',
                    fontWeight:    600,
                    color:         'var(--text-muted)',
                    fontSize:      10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    whiteSpace:    'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                    <div style={{
                      width: 16, height: 16,
                      border: '2px solid var(--color-brand-100)',
                      borderTop: '2px solid var(--color-brand-500)',
                      borderRadius: '50%',
                      animation: 'avanti-spin 0.7s linear infinite',
                    }} />
                    Loading students…
                  </div>
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No students found.
                </td>
              </tr>
            )}
            {students.map((s, i) => (
              <tr
                key={s.id}
                className="avanti-row"
                style={{ borderBottom: i < students.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}
              >
                {/* Student */}
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Avatar name={`${s.firstName} ${s.lastName}`} />
                    <div>
                      <Link
                        href={`/students/${s.id}`}
                        style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-sm)' }}
                      >
                        {s.firstName} {s.lastName}
                      </Link>
                      {s.gender && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {s.gender.charAt(0) + s.gender.slice(1).toLowerCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {/* Admission No */}
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {s.admissionNumber}
                </td>
                {/* Class */}
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  {s.className ? (
                    <span
                      style={{
                        display:      'inline-block',
                        padding:      '2px 8px',
                        background:   'var(--color-brand-50)',
                        color:        'var(--color-brand-600)',
                        borderRadius: 'var(--radius-full)',
                        fontSize:     11,
                        fontWeight:   600,
                      }}
                    >
                      {s.className}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                {/* Parent */}
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{s.parentName ?? '—'}</div>
                  {(s.parentPhone ?? s.phone) && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                      {s.parentPhone ?? s.phone}
                    </div>
                  )}
                </td>
                {/* View */}
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                  <Link
                    href={`/students/${s.id}`}
                    style={{
                      display:      'inline-flex',
                      alignItems:   'center',
                      gap:          4,
                      color:        'var(--color-brand-500)',
                      fontSize:     'var(--text-xs)',
                      fontWeight:   500,
                      textDecoration: 'none',
                      opacity:      0.7,
                    }}
                  >
                    View
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4.5 9l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-md)',
              background:   '#fff',
              cursor:       page === 1 ? 'not-allowed' : 'pointer',
              opacity:      page === 1 ? 0.4 : 1,
              fontSize:     'var(--text-sm)',
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-md)',
              background:   '#fff',
              cursor:       page === totalPages ? 'not-allowed' : 'pointer',
              opacity:      page === totalPages ? 0.4 : 1,
              fontSize:     'var(--text-sm)',
            }}
          >
            Next →
          </button>
        </div>
      )}

      <style>{`
        @keyframes avanti-spin { to { transform: rotate(360deg); } }
        .avanti-row:hover td { background: #F9FAFB; }
      `}</style>
    </div>
  );
}
