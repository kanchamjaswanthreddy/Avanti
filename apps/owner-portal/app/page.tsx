// Avanti Owner Portal — Overview
// Platform-wide health summary. Server component — data fetched fresh on each request.

import Link from 'next/link';
import { controlApi, fmtRupees, type PlatformStats } from '../lib/api';

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

function NavCard({ label, description, href, icon }: {
  label: string; description: string; href: string; icon: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
        padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px',
        cursor: 'pointer',
      }}>
        <div style={{ fontSize: '20px', flexShrink: 0, width: 36, height: 36, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{label}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{description}</div>
        </div>
      </div>
    </Link>
  );
}

async function StatsSection() {
  let stats: PlatformStats | null = null;
  let error: string | null = null;

  try {
    stats = await controlApi.getStats();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load stats';
  }

  if (error) {
    return (
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#9a3412' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
      <KpiCard label="Active Schools"  value={String(stats!.activeSchools)}  sub={`${stats!.totalSchools} total`} color="#1d4ed8" />
      <KpiCard label="MRR"             value={fmtRupees(stats!.mrrPaise)}    sub="monthly recurring" color="#15803d" />
      <KpiCard label="Active Subs"     value={String(stats!.activeSubCount)} sub={stats!.pastDueCount > 0 ? `${stats!.pastDueCount} past due` : 'all current'} />
      <KpiCard label="Open Incidents"  value={String(stats!.openIncidents)}  sub="active alerts" color={stats!.openIncidents > 0 ? '#dc2626' : '#15803d'} />
    </div>
  );
}

export default function PortalHome() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Platform Overview
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          Live status — Avanti School Management Platform
        </p>
      </div>

      {/* @ts-expect-error async server component */}
      <StatsSection />

      <div>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Operations
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          <NavCard label="Schools"      description="All provisioned schools + status"     href="/schools"      icon="🏫" />
          <NavCard label="Provisioning" description="Provision monitor and pipeline logs"  href="/provisioning" icon="⚙️" />
          <NavCard label="Billing"      description="Subscriptions, revenue, dunning"      href="/billing"      icon="💳" />
          <NavCard label="Incidents"    description="Active incidents and history"          href="/incidents"    icon="🚨" />
        </div>
      </div>
    </div>
  );
}
