// Vidyut Owner Portal — Incidents

export default function IncidentsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Incidents</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          Active alerts and incident history
        </p>
      </div>

      {/* Active */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
          All systems operational — no active incidents
        </span>
      </div>

      {/* History */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Incident history
        </h2>
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No incidents recorded.
        </div>
      </div>
    </div>
  );
}
