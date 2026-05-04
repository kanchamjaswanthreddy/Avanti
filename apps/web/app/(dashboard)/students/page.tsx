'use client';

// Avanti — Students List Page
// Paginated table with search + class filter.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiClient } from '../../../lib/api';
import type { Student, SchoolClass } from '@avanti/types';

const PAGE_SIZE = 25;

// ── Gender badge ──────────────────────────────────────────────────────────────

function GenderBadge({ gender }: { gender?: string | null | undefined }) {
  if (!gender) return null;
  const map: Record<string, string> = {
    MALE:   '#3b82f6',
    FEMALE: '#ec4899',
    OTHER:  '#8b5cf6',
  };
  const label: Record<string, string> = { MALE: 'M', FEMALE: 'F', OTHER: 'O' };
  return (
    <span
      style={{
        display:      'inline-block',
        width:        '20px',
        height:       '20px',
        borderRadius: '50%',
        background:   map[gender] ?? '#9ca3af',
        color:        '#fff',
        fontSize:     '10px',
        fontWeight:   700,
        textAlign:    'center',
        lineHeight:   '20px',
        flexShrink:   0,
      }}
    >
      {label[gender] ?? '?'}
    </span>
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

  // Load classes for filter dropdown
  useEffect(() => {
    void getApiClient().getClasses().then(setClasses).catch(() => {/* ignore */});
  }, []);

  const load = useCallback(async (p: number, q: string, cid: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getApiClient().getStudents({
        page:    p,
        limit:   PAGE_SIZE,
        ...(q   ? { search: q }   : {}),
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

  useEffect(() => {
    void load(page, search, classId);
  }, [load, page, search, classId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Students
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            {total > 0 ? `${total} students` : 'Loading…'}
          </p>
        </div>
        <Link
          href="/students/new"
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
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add Student
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={search}
          onChange={handleSearch}
          placeholder="Search by name or admission number…"
          style={{
            flex:         '1 1 240px',
            padding:      'var(--space-2) var(--space-3)',
            border:       '1px solid var(--color-gray-300)',
            borderRadius: 'var(--radius-md)',
            fontSize:     'var(--text-sm)',
            background:   'var(--surface-card)',
            color:        'var(--text-primary)',
            outline:      'none',
          }}
        />
        <select
          value={classId}
          onChange={e => { setClassId(e.target.value); setPage(1); }}
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

      {/* Table */}
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
              {['Admission No.', 'Name', 'Class', 'Gender', 'Parent', 'Phone', ''].map(h => (
                <th
                  key={h}
                  style={{
                    padding:   'var(--space-3) var(--space-4)',
                    textAlign: 'left',
                    fontWeight: 600,
                    color:     'var(--text-muted)',
                    fontSize:  '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
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
                <td colSpan={7} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No students found.
                </td>
              </tr>
            )}
            {students.map((s, i) => (
              <tr
                key={s.id}
                style={{
                  borderBottom: i < students.length - 1 ? '1px solid var(--color-gray-100)' : 'none',
                }}
              >
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px' }}>
                  {s.admissionNumber}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>
                  <Link href={`/students/${s.id}`} style={{ color: 'var(--color-brand-600)', textDecoration: 'none' }}>
                    {s.firstName} {s.lastName}
                  </Link>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>
                  {s.className ?? '—'}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <GenderBadge gender={s.gender} />
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>
                  {s.parentName ?? '—'}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>
                  {s.parentPhone ?? s.phone ?? '—'}
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                  <Link
                    href={`/students/${s.id}`}
                    style={{ color: 'var(--text-muted)', fontSize: '12px', textDecoration: 'none' }}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-md)',
              background:   'var(--surface-card)',
              cursor:       page === 1 ? 'not-allowed' : 'pointer',
              opacity:      page === 1 ? 0.4 : 1,
              fontSize:     'var(--text-sm)',
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-md)',
              background:   'var(--surface-card)',
              cursor:       page === totalPages ? 'not-allowed' : 'pointer',
              opacity:      page === totalPages ? 0.4 : 1,
              fontSize:     'var(--text-sm)',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
