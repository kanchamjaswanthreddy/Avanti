// Avanti Owner Portal — Provisioning Monitor
// Active and recent provisioning jobs. Server component.

import { controlApi, fmtDateTime, type ProvisionLogEntry } from '../../lib/api';

const EVENT_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  STARTED:       { bg: '#eff6ff', dot: '#3b82f6', text: '#1d4ed8' },
  DB_READY:      { bg: '#f0fdf4', dot: '#16a34a', text: '#15803d' },
  REDIS_READY:   { bg: '#f0fdf4', dot: '#16a34a', text: '#15803d' },
  STORAGE_READY: { bg: '#f0fdf4', dot: '#16a34a', text: '#15803d' },
  SEEDED:        { bg: '#f0fdf4', dot: '#16a34a', text: '#15803d' },
  ADMIN_CREATED: { bg: '#f0fdf4', dot: '#16a34a', text: '#15803d' },
  COMPLETE:      { bg: '#dcfce7', dot: '#16a34a', text: '#15803d' },
  FAILED:        { bg: '#fee2e2', dot: '#dc2626', text: '#b91c1c' },
};

const EVENT_LABELS: Record<string, string> = {
  STARTED:       'Provisioning started',
  DB_READY:      'Database ready',
  REDIS_READY:   'Redis ready',
  STORAGE_READY: 'Storage bucket ready',
  SEEDED:        'Schema seeded',
  ADMIN_CREATED: 'Admin user created',
  COMPLETE:      'School live',
  FAILED:        'Provisioning failed',
};

// Group log entries by school, most recent event per school = "active" if not COMPLETE/FAILED
function groupBySchool(log: ProvisionLogEntry[]): Map<string, { name: string; entries: ProvisionLogEntry[] }> {
  const map = new Map<string, { name: string; entries: ProvisionLogEntry[] }>();
  for (const entry of log) {
    if (!map.has(entry.schoolId)) {
      map.set(entry.schoolId, { name: entry.schoolName, entries: [] });
    }
    map.get(entry.schoolId)!.entries.push(entry);
  }
  return map;
}

export default async function ProvisioningPage() {
  let log: ProvisionLogEntry[] = [];
  let error: string | null = null;

  try {
    log = await controlApi.getProvisioning();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load provisioning data';
  }

  const bySchool = groupBySchool(log);

  // Active = has events but latest is not COMPLETE or FAILED
  const active   = [...bySchool.entries()].filter(([, { entries }]) => {
    const last = entries.at(-1);
    return last && last.event !== 'COMPLETE' && last.event !== 'FAILED';
  });
  const recent   = [...bySchool.entries()].filter(([, { entries }]) => {
    const last = entries.at(-1);
    return last && (last.event === 'COMPLETE' || last.event === 'FAILED');
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Provisioning</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          New school provisioning pipeline monitor
        </p>
      </div>

      {error && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#9a3412' }}>
          {error}
        </div>
      )}

      {/* Active jobs */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Active jobs ({active.length})
        </h2>
        {active.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No active provisioning jobs.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {active.map(([schoolId, { name, entries }]) => {
              const lastEntry = entries.at(-1)!;
              const c = EVENT_COLORS[lastEntry.event] ?? EVENT_COLORS['STARTED']!;
              return (
                <div key={schoolId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: c.bg, borderRadius: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.dot, flexShrink: 0, animation: 'pulse 2s infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{name}</div>
                    <div style={{ fontSize: '12px', color: c.text, marginTop: '1px' }}>
                      {EVENT_LABELS[lastEntry.event] ?? lastEntry.event}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {fmtDateTime(lastEntry.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent completions */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Recent completions ({recent.length})
        </h2>
        {recent.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No completed provisioning jobs yet.
          </div>
        ) : (
          <div>
            {recent.map(([schoolId, { name, entries }]) => {
              const lastEntry = entries.at(-1)!;
              const success   = lastEntry.event === 'COMPLETE';
              const startedAt = entries[0]?.createdAt;
              const endedAt   = lastEntry.createdAt;
              let duration = '';
              if (startedAt) {
                const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
                const mins = Math.floor(ms / 60000);
                const secs = Math.floor((ms % 60000) / 1000);
                duration = `${mins}m ${secs}s`;
              }
              return (
                <div key={schoolId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: success ? '#16a34a' : '#dc2626' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{name}</span>
                  {duration && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{duration}</span>}
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{fmtDateTime(endedAt)}</span>
                  {!success && lastEntry.error && (
                    <span style={{ fontSize: '11px', color: '#b91c1c', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lastEntry.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full event log */}
      {log.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Event log (last 30)
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['Time', 'School', 'Event', 'Error'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map(entry => {
                const c = EVENT_COLORS[entry.event] ?? { dot: '#94a3b8' };
                return (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '5px 12px', fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDateTime(entry.createdAt)}</td>
                    <td style={{ padding: '5px 12px', color: '#0f172a', fontWeight: 500 }}>{entry.schoolName}</td>
                    <td style={{ padding: '5px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                        {EVENT_LABELS[entry.event] ?? entry.event}
                      </span>
                    </td>
                    <td style={{ padding: '5px 12px', color: '#b91c1c', fontSize: '11px' }}>{entry.error ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
