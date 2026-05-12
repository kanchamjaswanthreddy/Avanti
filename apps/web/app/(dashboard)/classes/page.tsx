'use client';

// Avanti — Classes Page
// Card grid of all classes. Each card shows: name, section, grade, teacher, student count.

import { useState, useEffect } from 'react';
import { getApiClient } from '../../../lib/api';

// ClassRecord shape returned by the API (superset of SchoolClass type)
interface ClassRecord {
  id:           string;
  name:         string;
  section:      string | null;
  academicYear: string;
  gradeLevel:   number | null;
  teacherName:  string | null;
  studentCount: number;
}

// ── Grade color palette (10 rotating colors) ──────────────────────────────────

const GRADE_PALETTES = [
  { bg: '#EEF2FF', accent: '#4F6DA8', text: '#1e3a6e' },
  { bg: '#F0FDF4', accent: '#16a34a', text: '#14532d' },
  { bg: '#FFF7ED', accent: '#ea580c', text: '#7c2d12' },
  { bg: '#FDF4FF', accent: '#9333ea', text: '#581c87' },
  { bg: '#FEF9C3', accent: '#ca8a04', text: '#713f12' },
  { bg: '#FEF2F2', accent: '#dc2626', text: '#7f1d1d' },
  { bg: '#F0F9FF', accent: '#0284c7', text: '#0c4a6e' },
  { bg: '#FFF1F2', accent: '#e11d48', text: '#881337' },
  { bg: '#F7FEE7', accent: '#65a30d', text: '#365314' },
  { bg: '#FDF2F8', accent: '#db2777', text: '#831843' },
];

function classPalette(name: string, gradeLevel: number | null) {
  const idx = gradeLevel !== null
    ? (gradeLevel - 1) % GRADE_PALETTES.length
    : name.charCodeAt(0) % GRADE_PALETTES.length;
  return GRADE_PALETTES[idx]!;
}

// ── ClassCard ─────────────────────────────────────────────────────────────────

function ClassCard({ cls }: { cls: ClassRecord }) {
  const p = classPalette(cls.name, cls.gradeLevel);

  return (
    <div
      className="avanti-card"
      style={{
        background:    '#fff',
        borderRadius:  'var(--radius-xl)',
        overflow:      'hidden',
        boxShadow:     '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        display:       'flex',
        flexDirection: 'column',
        cursor:        'default',
      }}
    >
      {/* Color header */}
      <div
        style={{
          background:     p.bg,
          padding:        'var(--space-5) var(--space-5) var(--space-4)',
          borderBottom:   `1px solid ${p.accent}22`,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            'var(--space-3)',
        }}
      >
        {/* Class name badge */}
        <div
          style={{
            width:          52,
            height:         52,
            borderRadius:   'var(--radius-lg)',
            background:     p.accent,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {cls.name.replace(/[^0-9A-Za-z]/g, '').slice(0, 2).toUpperCase()}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize:      'var(--text-base)',
              fontWeight:    700,
              color:         p.text,
              letterSpacing: '-0.01em',
              lineHeight:    1.2,
              overflow:      'hidden',
              textOverflow:  'ellipsis',
              whiteSpace:    'nowrap',
            }}
          >
            {cls.name}
            {cls.section && (
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginLeft: 6, opacity: 0.7 }}>
                — {cls.section}
              </span>
            )}
          </div>
          <div style={{ marginTop: 4 }}>
            <span
              style={{
                fontSize:     10,
                fontWeight:   600,
                color:        p.accent,
                background:   `${p.accent}18`,
                padding:      '2px 8px',
                borderRadius: 'var(--radius-full)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {cls.academicYear}
            </span>
          </div>
        </div>

        {/* Grade level */}
        {cls.gradeLevel && (
          <div
            style={{
              flexShrink:     0,
              textAlign:      'right',
            }}
          >
            <div style={{ fontSize: 10, color: p.accent, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Grade</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: p.text, lineHeight: 1.1 }}>
              {cls.gradeLevel}
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          padding:     'var(--space-4) var(--space-5)',
          display:     'flex',
          gap:         'var(--space-6)',
        }}
      >
        <Stat
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1.5 12c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          }
          value={cls.studentCount}
          label="Students"
        />
        <Stat
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M2 12.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M7 7.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          }
          value={cls.teacherName ?? 'Not assigned'}
          label="Class Teacher"
          small
        />
      </div>
    </div>
  );
}

function Stat({ icon, value, label, small }: { icon: React.ReactNode; value: string | number; label: string; small?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--text-muted)' }}>
        {icon}
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
      </div>
      <div
        style={{
          fontSize:   small ? 'var(--text-sm)' : 'var(--text-xl)',
          fontWeight: small ? 500 : 700,
          color:      'var(--text-primary)',
          lineHeight: 1.1,
          letterSpacing: small ? 0 : '-0.02em',
          overflow:   'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth:   160,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        gridColumn:     '1 / -1',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        'var(--space-16)',
        background:     '#fff',
        borderRadius:   'var(--radius-xl)',
        boxShadow:      '0 1px 4px rgba(0,0,0,0.06)',
        gap:            'var(--space-4)',
      }}
    >
      <div
        style={{
          width:          56,
          height:         56,
          borderRadius:   'var(--radius-xl)',
          background:     'var(--color-brand-50)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          'var(--color-brand-400)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>
          No classes yet
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          Classes will appear here once they're added to the school.
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getApiClient()
      .getClasses()
      .then(data => setClasses(data as unknown as ClassRecord[]))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  // Group by academic year
  const years = [...new Set(classes.map(c => c.academicYear))].sort().reverse();

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Classes
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
            {loading ? 'Loading…' : `${classes.length} classes across ${years.length} academic year${years.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--color-brand-100)', borderTop: '2px solid var(--color-brand-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Loading classes…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Classes grouped by academic year */}
      {!loading && !error && years.length === 0 && (
        <div style={{ display: 'grid' }}>
          <EmptyState />
        </div>
      )}

      {!loading && years.map(year => (
        <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Year label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {year}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-gray-200)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {classes.filter(c => c.academicYear === year).length} classes
            </span>
          </div>

          {/* Card grid */}
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap:                 'var(--space-4)',
            }}
          >
            {classes
              .filter(c => c.academicYear === year)
              .map(cls => <ClassCard key={cls.id} cls={cls} />)
            }
          </div>
        </div>
      ))}
    </div>
  );
}
