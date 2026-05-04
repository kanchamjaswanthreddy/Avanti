'use client';

// Avanti — Student Detail Page
// Profile, contact info, class assignment, attendance summary.

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiClient } from '../../../../lib/api';
import type { Student } from '@avanti/types';

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div
      style={{
        display:      'flex',
        gap:          'var(--space-3)',
        padding:      'var(--space-3) 0',
        borderBottom: '1px solid var(--color-gray-100)',
        alignItems:   'flex-start',
      }}
    >
      <span
        style={{
          fontSize:   'var(--text-xs)',
          fontWeight: 600,
          color:      'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          minWidth:   '140px',
          paddingTop: '2px',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-sm)', color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const params   = useParams<{ id: string }>();
  const router   = useRouter();
  const [student, setStudent]   = useState<Student | null>(null);
  const [attPct,  setAttPct]    = useState<number | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;

    void (async () => {
      setLoading(true);
      try {
        const [s, pct] = await Promise.all([
          getApiClient().getStudent(id),
          getApiClient().getStudentAttendancePct(id).catch(() => null),
        ]);
        setStudent(s);
        if (pct) setAttPct(pct.percentage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (error || !student) {
    return (
      <div
        style={{
          background:   'var(--color-error-50, #fef2f2)',
          border:       '1px solid var(--color-error-200, #fecaca)',
          borderRadius: 'var(--radius-md)',
          padding:      'var(--space-4)',
          color:        'var(--color-error-700, #b91c1c)',
          fontSize:     'var(--text-sm)',
        }}
      >
        {error ?? 'Student not found.'}
      </div>
    );
  }

  const fullName = `${student.firstName} ${student.lastName}`;
  const initials = (student.firstName[0] ?? '') + (student.lastName[0] ?? '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '720px' }}>

      {/* Back link */}
      <Link
        href="/students"
        style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
      >
        ← Students
      </Link>

      {/* Avatar + name card */}
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          'var(--space-5)',
          background:   'var(--surface-card)',
          border:       '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-lg)',
          padding:      'var(--space-6)',
        }}
      >
        <div
          style={{
            width:          '64px',
            height:         '64px',
            borderRadius:   '50%',
            background:     'var(--color-brand-500)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          '#fff',
            fontSize:       'var(--text-xl)',
            fontWeight:     700,
            flexShrink:     0,
          }}
        >
          {initials.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {fullName}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
            Admission: {student.admissionNumber}
            {student.className ? ` · ${student.className}` : ''}
          </p>
        </div>

        {/* Attendance pill */}
        {attPct !== null && (
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              padding:        'var(--space-3) var(--space-5)',
              borderRadius:   'var(--radius-lg)',
              background:     attPct >= 75
                ? 'var(--color-success-50, #f0fdf4)'
                : 'var(--color-error-50, #fef2f2)',
              border: `1px solid ${attPct >= 75 ? 'var(--color-success-200, #bbf7d0)' : 'var(--color-error-200, #fecaca)'}`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize:   'var(--text-2xl)',
                fontWeight: 700,
                color:      attPct >= 75 ? 'var(--color-success-700, #15803d)' : 'var(--color-error-700, #b91c1c)',
              }}
            >
              {attPct.toFixed(0)}%
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Attendance</span>
          </div>
        )}

        <button
          onClick={() => router.push(`/students/${student.id}/edit`)}
          style={{
            padding:      'var(--space-2) var(--space-4)',
            border:       '1px solid var(--color-gray-300)',
            borderRadius: 'var(--radius-md)',
            background:   'transparent',
            cursor:       'pointer',
            fontSize:     'var(--text-sm)',
            color:        'var(--text-secondary)',
          }}
        >
          Edit
        </button>
      </div>

      {/* Details */}
      <div
        style={{
          background:   'var(--surface-card)',
          border:       '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-lg)',
          padding:      'var(--space-5)',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 var(--space-3)' }}>
          Personal details
        </h2>
        <InfoRow label="Date of birth"   value={student.dateOfBirth} />
        <InfoRow label="Gender"          value={student.gender ?? undefined} />
        <InfoRow label="Phone"           value={student.phone ?? undefined} />
        <InfoRow label="Email"           value={student.email ?? undefined} />
        <InfoRow label="Address"         value={student.address ?? undefined} />
      </div>

      <div
        style={{
          background:   'var(--surface-card)',
          border:       '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-lg)',
          padding:      'var(--space-5)',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 var(--space-3)' }}>
          Parent / guardian
        </h2>
        <InfoRow label="Name"  value={student.parentName ?? undefined} />
        <InfoRow label="Phone" value={student.parentPhone ?? undefined} />
      </div>
    </div>
  );
}
