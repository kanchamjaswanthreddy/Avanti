// Avanti Owner Portal — Provisioning Monitor
// Active provisioning jobs, recent completions, pipeline logs.

export default function ProvisioningPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Provisioning</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          New school provisioning pipeline monitor
        </p>
      </div>

      {/* Active jobs */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Active jobs
        </h2>
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No active provisioning jobs.
        </div>
      </div>

      {/* Recent completions */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Recent completions
        </h2>
        {[
          { name: 'DPS Hyderabad',       completedAt: '2025-08-15 10:47', duration: '12m 33s', status: 'success' },
          { name: 'Sri Chaitanya',        completedAt: '2025-09-01 09:22', duration: '11m 05s', status: 'success' },
        ].map(job => (
          <div key={job.name} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 0', borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: job.status === 'success' ? '#16a34a' : '#dc2626',
            }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{job.name}</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{job.duration}</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{job.completedAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
