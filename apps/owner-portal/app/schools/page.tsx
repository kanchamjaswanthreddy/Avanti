// Vidyut Owner Portal — Schools List
// All provisioned schools with status, tier, and quick actions.

import Link from 'next/link';
import type { SchoolStatus, Tier } from '@vidyut/types';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<SchoolStatus, { bg: string; color: string; label: string }> = {
  ACTIVE:       { bg: '#dcfce7', color: '#15803d', label: 'Active' },
  PROVISIONING: { bg: '#fef9c3', color: '#92400e', label: 'Provisioning' },
  SUSPENDED:    { bg: '#fee2e2', color: '#b91c1c', label: 'Suspended' },
  CANCELLED:    { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
};

const TIER_STYLE: Record<Tier, { bg: string; color: string }> = {
  starter:    { bg: '#eff6ff', color: '#1d4ed8' },
  growth:     { bg: '#f5f3ff', color: '#7c3aed' },
  enterprise: { bg: '#fff7ed', color: '#c2410c' },
};

// ── Mock data (replace with real DB query when control plane DB is wired) ─────

interface SchoolRow {
  id:            string;
  name:          string;
  slug:          string;
  tier:          Tier;
  status:        SchoolStatus;
  region:        string;
  studentCount:  number;
  provisionedAt: string | null;
}

const MOCK_SCHOOLS: SchoolRow[] = [
  {
    id:            'sch_001',
    name:          'Delhi Public School — Hyderabad',
    slug:          'dps-hyderabad',
    tier:          'growth',
    status:        'ACTIVE',
    region:        'asia-south1',
    studentCount:  1247,
    provisionedAt: '2025-08-15',
  },
  {
    id:            'sch_002',
    name:          'Sri Chaitanya High School',
    slug:          'sri-chaitanya',
    tier:          'enterprise',
    status:        'ACTIVE',
    region:        'asia-south1',
    studentCount:  3840,
    provisionedAt: '2025-09-01',
  },
  {
    id:            'sch_003',
    name:          'Narayana English Medium',
    slug:          'narayana-em',
    tier:          'starter',
    status:        'PROVISIONING',
    region:        'asia-south1',
    studentCount:  0,
    provisionedAt: null,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SchoolsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Schools</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
            {MOCK_SCHOOLS.length} schools · control plane data
          </p>
        </div>
        <Link
          href="/provisioning/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', background: '#1d4ed8', color: '#fff',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          + Provision school
        </Link>
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {['School', 'Slug', 'Tier', 'Status', 'Region', 'Students', 'Provisioned', ''].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                  color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_SCHOOLS.map((school, i) => {
              const statusStyle = STATUS_STYLE[school.status];
              const tierStyle   = TIER_STYLE[school.tier];
              return (
                <tr
                  key={school.id}
                  style={{ borderBottom: i < MOCK_SCHOOLS.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {school.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>
                    {school.slug}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: tierStyle.bg, color: tierStyle.color,
                      borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                      textTransform: 'capitalize',
                    }}>
                      {school.tier}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: statusStyle.bg, color: statusStyle.color,
                      borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                    }}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>
                    {school.region}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {school.studentCount > 0
                      ? new Intl.NumberFormat('en-IN').format(school.studentCount)
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                    {school.provisionedAt ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/schools/${school.id}`}
                      style={{ color: '#1d4ed8', fontSize: '12px', textDecoration: 'none' }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
