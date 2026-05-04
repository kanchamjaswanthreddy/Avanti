// Vidyut Owner Portal — Overview
// Platform-wide health summary.

import Link from 'next/link';

function KpiCard({ label, value, sub, color = '#1e293b' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color, marginTop: '8px', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function NavCard({ label, description, href, emoji }: {
  label: string; description: string; href: string; emoji: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
        padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px',
        cursor: 'pointer', transition: 'border-color 150ms',
      }}>
        <div style={{ fontSize: '24px', flexShrink: 0 }}>{emoji}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{label}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{description}</div>
        </div>
      </div>
    </Link>
  );
}

export default function PortalHome() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Platform Overview
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          Live status — Vidyut School Management Platform
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        <KpiCard label="Active Schools" value="—" sub="provisioned" color="#1d4ed8" />
        <KpiCard label="Total Students" value="—" sub="across all schools" />
        <KpiCard label="API Requests" value="—" sub="last 24h" />
        <KpiCard label="Incidents Open" value="—" sub="active alerts" color="#dc2626" />
      </div>

      {/* Navigation cards */}
      <div>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Operations
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          <NavCard label="Schools" description="All provisioned schools + status" href="/schools" emoji="🏫" />
          <NavCard label="Provisioning" description="Provision monitor and pipeline logs" href="/provisioning" emoji="⚙️" />
          <NavCard label="Billing" description="Subscriptions, revenue, dunning" href="/billing" emoji="💳" />
          <NavCard label="Incidents" description="Active incidents and history" href="/incidents" emoji="🚨" />
        </div>
      </div>
    </div>
  );
}
