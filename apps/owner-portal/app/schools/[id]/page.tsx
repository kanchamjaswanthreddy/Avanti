// Avanti Owner Portal — School Detail
// Provision status, infrastructure details, subscription, usage metrics.

import Link from 'next/link';
import { controlApi, fmtDate, fmtDateTime, fmtRupees } from '../../../lib/api';

// ── Provision timeline ────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  STARTED:       'Provisioning started',
  DB_READY:      'Cloud SQL database ready',
  REDIS_READY:   'Redis (Memorystore) ready',
  STORAGE_READY: 'Cloud Storage bucket ready',
  SEEDED:        'Schema migrations complete',
  ADMIN_CREATED: 'Admin user created',
  COMPLETE:      'School live',
  FAILED:        'Provisioning failed',
};

const EVENT_ORDER = ['STARTED', 'DB_READY', 'REDIS_READY', 'STORAGE_READY', 'SEEDED', 'ADMIN_CREATED', 'COMPLETE'];

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '160px', paddingTop: '2px' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', color: value ? '#0f172a' : '#94a3b8', fontFamily: (value?.startsWith('avanti-') || value?.includes('/')) ? 'monospace' : 'inherit' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let school;
  let error: string | null = null;

  try {
    school = await controlApi.getSchool(id);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load school';
  }

  if (error || !school) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Link href="/schools" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Schools</Link>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#9a3412' }}>
          {error ?? 'School not found.'}
        </div>
      </div>
    );
  }

  const STATUS_COLOR: Record<string, string> = {
    ACTIVE: '#15803d', PROVISIONING: '#b45309', SUSPENDED: '#b91c1c', CANCELLED: '#64748b',
  };
  const STATUS_BG: Record<string, string> = {
    ACTIVE: '#dcfce7', PROVISIONING: '#fef9c3', SUSPENDED: '#fee2e2', CANCELLED: '#f1f5f9',
  };

  const sub         = school.subscription;
  const provLog     = school.provisionLog;
  const reachedEvents = new Set(provLog.map(e => e.event));
  const latestEvent = provLog.at(-1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      <Link href="/schools" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Schools</Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
          🏫
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{school.name}</h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>
            {school.slug} · {school.id}
          </p>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: '6px', background: STATUS_BG[school.status] ?? '#f1f5f9', color: STATUS_COLOR[school.status] ?? '#64748b', fontSize: '12px', fontWeight: 600 }}>
          {school.status}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Infrastructure */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Infrastructure
          </h2>
          <Row label="Region"      value={school.region} />
          <Row label="Cloud SQL"   value={school.dbInstanceId} />
          <Row label="GCS Bucket"  value={school.storageBucket} />
          <Row label="Provisioned" value={fmtDate(school.provisionedAt)} />
          <Row label="Created"     value={fmtDate(school.createdAt)} />
        </div>

        {/* Subscription */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Subscription
          </h2>
          {sub ? (
            <>
              <Row label="Tier"         value={sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} />
              <Row label="Billing"      value={sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1)} />
              <Row label="MRR"          value={fmtRupees(sub.amountPaise)} />
              <Row label="Sub Status"   value={sub.status} />
              <Row label="Period End"   value={fmtDate(sub.currentPeriodEnd)} />
              {sub.razorpaySubId && <Row label="Razorpay ID" value={sub.razorpaySubId} />}
            </>
          ) : (
            <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: '13px' }}>No subscription on record</div>
          )}
        </div>
      </div>

      {/* Provision timeline */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
          Provision pipeline
        </h2>
        {provLog.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>No provision events recorded.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {EVENT_ORDER.map((evt, i) => {
              const reached = reachedEvents.has(evt);
              const isLatest = latestEvent?.event === evt;
              const failed   = latestEvent?.event === 'FAILED' && i === EVENT_ORDER.indexOf(latestEvent.event ?? '');
              const logEntry = provLog.find(e => e.event === evt);
              return (
                <div key={evt} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: failed ? '#fee2e2' : reached ? '#dcfce7' : isLatest ? '#fef9c3' : '#f1f5f9',
                    border: `2px solid ${failed ? '#dc2626' : reached ? '#16a34a' : isLatest ? '#d97706' : '#e2e8f0'}`,
                    fontSize: '11px', fontWeight: 700,
                    color: failed ? '#dc2626' : reached ? '#15803d' : isLatest ? '#b45309' : '#94a3b8',
                  }}>
                    {reached ? '✓' : failed ? '✗' : isLatest ? '●' : '○'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', color: reached ? '#15803d' : '#94a3b8', fontWeight: reached ? 500 : 400 }}>
                      {EVENT_LABELS[evt] ?? evt}
                    </span>
                  </div>
                  {logEntry && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {fmtDateTime(logEntry.createdAt)}
                    </span>
                  )}
                </div>
              );
            })}
            {latestEvent?.event === 'FAILED' && (
              <div style={{ marginTop: '8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#b91c1c' }}>
                Error: {latestEvent.error ?? 'Unknown error'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <DangerZone schoolId={school.id} status={school.status} />
    </div>
  );
}

function DangerZone({ schoolId, status }: { schoolId: string; status: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px' }}>
      <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
        Danger zone
      </h2>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {status === 'ACTIVE' && (
          <form action={`/api/portal/schools/${schoolId}/suspend`} method="POST">
            <button type="submit" style={{ padding: '8px 16px', background: '#fff', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '13px', cursor: 'pointer' }}>
              Suspend school
            </button>
          </form>
        )}
        {status === 'SUSPENDED' && (
          <form action={`/api/portal/schools/${schoolId}/activate`} method="POST">
            <button type="submit" style={{ padding: '8px 16px', background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontSize: '13px', cursor: 'pointer' }}>
              Reactivate school
            </button>
          </form>
        )}
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Suspend/activate requires confirmation — add server actions when deploying.
        </span>
      </div>
    </div>
  );
}
