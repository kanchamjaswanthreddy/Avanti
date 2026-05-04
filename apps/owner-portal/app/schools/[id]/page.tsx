// Vidyut Owner Portal — School Detail
// Provision status, infrastructure details, subscription, usage metrics.

import Link from 'next/link';
import type { ProvisionState } from '@vidyut/types';

// ── Provision timeline ────────────────────────────────────────────────────────

const PROVISION_STEPS: { state: ProvisionState; label: string }[] = [
  { state: 'PENDING',              label: 'Request received' },
  { state: 'DB_PROVISIONING',      label: 'Provisioning Cloud SQL' },
  { state: 'DB_READY',             label: 'Database ready' },
  { state: 'REDIS_PROVISIONING',   label: 'Provisioning Memorystore' },
  { state: 'REDIS_READY',          label: 'Redis ready' },
  { state: 'STORAGE_PROVISIONING', label: 'Creating Cloud Storage bucket' },
  { state: 'STORAGE_READY',        label: 'Storage bucket ready' },
  { state: 'SCHEMA_SEEDING',       label: 'Running migrations' },
  { state: 'SCHEMA_SEEDED',        label: 'Schema seeded' },
  { state: 'ADMIN_CREATING',       label: 'Creating admin user' },
  { state: 'ACTIVE',               label: 'School live' },
];

const STATE_ORDER = PROVISION_STEPS.map(s => s.state);

function ProvisionTimeline({ current }: { current: ProvisionState }) {
  const idx = STATE_ORDER.indexOf(current);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {PROVISION_STEPS.map((step, i) => {
        const done    = i < idx || current === 'ACTIVE';
        const active  = i === idx && current !== 'ACTIVE' && current !== 'PROVISION_FAILED';
        const failed  = current === 'PROVISION_FAILED' && i === idx;

        return (
          <div key={step.state} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: failed ? '#fee2e2' : done ? '#dcfce7' : active ? '#fef9c3' : '#f1f5f9',
              border: `2px solid ${failed ? '#dc2626' : done ? '#16a34a' : active ? '#d97706' : '#e2e8f0'}`,
              fontSize: '11px', fontWeight: 700,
              color: failed ? '#dc2626' : done ? '#15803d' : active ? '#b45309' : '#94a3b8',
            }}>
              {done ? '✓' : failed ? '✗' : active ? '●' : '○'}
            </div>
            <span style={{
              fontSize: '13px',
              color: done ? '#15803d' : active ? '#b45309' : failed ? '#dc2626' : '#94a3b8',
              fontWeight: active || done ? 500 : 400,
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '160px', paddingTop: '2px' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', color: value ? '#0f172a' : '#94a3b8', fontFamily: value?.startsWith('sch_') || value?.includes('/') ? 'monospace' : 'inherit' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SchoolDetailPage({ params }: { params: { id: string } }) {
  // Mock data — replace with control plane DB query
  const school = {
    id:              params.id,
    name:            'Delhi Public School — Hyderabad',
    slug:            'dps-hyderabad',
    tier:            'growth' as const,
    status:          'ACTIVE' as const,
    provisionState:  'ACTIVE' as ProvisionState,
    region:          'asia-south1',
    dbInstanceId:    'vidyut-dps-hyderabad-pg16',
    storageBucket:   'vidyut-dps-hyderabad-assets',
    studentCount:    1247,
    apiCallsToday:   3_841,
    provisionedAt:   '2025-08-15T10:30:00Z',
    subscriptionTier: 'Growth',
    billingCycle:    'Annual',
    mrr:             '₹2,97,491',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      {/* Back */}
      <Link href="/schools" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>
        ← Schools
      </Link>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '10px',
          background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', flexShrink: 0,
        }}>
          🏫
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {school.name}
          </h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>
            {school.slug} · {params.id}
          </p>
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: '6px',
          background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 600,
        }}>
          Active
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Infrastructure */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Infrastructure
          </h2>
          <Row label="Region"       value={school.region} />
          <Row label="Cloud SQL"    value={school.dbInstanceId} />
          <Row label="GCS Bucket"   value={school.storageBucket} />
          <Row label="Provisioned"  value={new Date(school.provisionedAt).toLocaleDateString('en-IN')} />
        </div>

        {/* Subscription */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Subscription
          </h2>
          <Row label="Tier"         value={school.subscriptionTier} />
          <Row label="Billing"      value={school.billingCycle} />
          <Row label="MRR"          value={school.mrr} />

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {new Intl.NumberFormat('en-IN').format(school.studentCount)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Students</div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {new Intl.NumberFormat('en-IN').format(school.apiCallsToday)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>API calls today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Provision timeline */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Provision pipeline
        </h2>
        <ProvisionTimeline current={school.provisionState} />
      </div>

      {/* Danger zone */}
      <div style={{
        background: '#fff', border: '1px solid #fecaca',
        borderRadius: '12px', padding: '20px',
      }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Danger zone
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button style={{
            padding: '8px 16px', background: '#fff', border: '1px solid #fca5a5',
            borderRadius: '8px', color: '#dc2626', fontSize: '13px', cursor: 'pointer',
          }}>
            Suspend school
          </button>
          <button style={{
            padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: '8px', color: '#475569', fontSize: '13px', cursor: 'pointer',
          }}>
            Rebuild schema
          </button>
          <button style={{
            padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: '8px', color: '#475569', fontSize: '13px', cursor: 'pointer',
          }}>
            Flush Redis cache
          </button>
        </div>
      </div>
    </div>
  );
}
