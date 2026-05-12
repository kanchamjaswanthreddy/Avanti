// Avanti Owner Portal — Schools List
// All provisioned schools with status, tier, and quick actions.

import Link from 'next/link';
import { controlApi, fmtDate, type School } from '../../lib/api';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:       { bg: '#dcfce7', color: '#15803d', label: 'Active' },
  PROVISIONING: { bg: '#fef9c3', color: '#92400e', label: 'Provisioning' },
  SUSPENDED:    { bg: '#fee2e2', color: '#b91c1c', label: 'Suspended' },
  CANCELLED:    { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
};

const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  starter:    { bg: '#eff6ff', color: '#1d4ed8' },
  growth:     { bg: '#f5f3ff', color: '#7c3aed' },
  enterprise: { bg: '#fff7ed', color: '#c2410c' },
};

export default async function SchoolsPage() {
  let schools: School[] = [];
  let error: string | null = null;

  try {
    schools = await controlApi.getSchools();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load schools';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Schools</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
            {error ? 'Error loading data' : `${schools.length} school${schools.length !== 1 ? 's' : ''} · control plane`}
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

      {error && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#9a3412' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {['School', 'Slug', 'Tier', 'Status', 'Region', 'Provisioned', ''].map(h => (
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
            {!error && schools.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No schools provisioned yet. Click <strong>+ Provision school</strong> to add the first one.
                </td>
              </tr>
            )}
            {schools.map((school, i) => {
              const statusStyle = STATUS_STYLE[school.status] ?? STATUS_STYLE['ACTIVE']!;
              const tierStyle   = TIER_STYLE[school.tier]   ?? TIER_STYLE['starter']!;
              return (
                <tr key={school.id} style={{ borderBottom: i < schools.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{school.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{school.slug}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: tierStyle.bg, color: tierStyle.color, borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {school.tier}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{school.region}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>{fmtDate(school.provisionedAt)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link href={`/schools/${school.id}`} style={{ color: '#1d4ed8', fontSize: '12px', textDecoration: 'none' }}>
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
