// Avanti Owner Portal — Incidents
// Shows platform health. Incident tracking system is a future addition;
// this page currently monitors schools table for SUSPENDED/PROVISIONING states
// that might indicate problems.

import Link from 'next/link';
import { controlApi, fmtDate, type School } from '../../lib/api';

export default async function IncidentsPage() {
  let schools: School[] = [];
  let error: string | null = null;

  try {
    schools = await controlApi.getSchools();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load data';
  }

  const suspended    = schools.filter(s => s.status === 'SUSPENDED');
  const provisioning = schools.filter(s => s.status === 'PROVISIONING');
  const healthy      = !error && suspended.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Incidents</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          Active alerts and platform health
        </p>
      </div>

      {error && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#9a3412' }}>
          {error}
        </div>
      )}

      {/* System health banner */}
      <div style={{
        background: healthy ? '#f0fdf4' : '#fff7ed',
        border: `1px solid ${healthy ? '#bbf7d0' : '#fed7aa'}`,
        borderRadius: '12px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: healthy ? '#16a34a' : '#f59e0b', flexShrink: 0,
        }} />
        <span style={{ fontSize: '13px', color: healthy ? '#15803d' : '#b45309', fontWeight: 600 }}>
          {healthy
            ? 'All systems operational — no active incidents'
            : `${suspended.length} school${suspended.length !== 1 ? 's' : ''} suspended${provisioning.length > 0 ? `, ${provisioning.length} still provisioning` : ''}`
          }
        </span>
      </div>

      {/* Suspended schools */}
      {suspended.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Suspended schools ({suspended.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {suspended.map(school => (
              <div key={school.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#fff5f5', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{school.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{school.slug}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Since {fmtDate(school.createdAt)}</div>
                <Link href={`/schools/${school.id}`} style={{ color: '#1d4ed8', fontSize: '12px', textDecoration: 'none' }}>
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schools still provisioning (might be stuck) */}
      {provisioning.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Provisioning in progress ({provisioning.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {provisioning.map(school => (
              <div key={school.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{school.name}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Started {fmtDate(school.createdAt)}</span>
                <Link href={`/schools/${school.id}`} style={{ color: '#1d4ed8', fontSize: '12px', textDecoration: 'none' }}>View →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History placeholder */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Incident history
        </h2>
        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Dedicated incident tracking system planned for Phase 4.
          See Provisioning page for pipeline failure logs.
        </div>
      </div>
    </div>
  );
}
