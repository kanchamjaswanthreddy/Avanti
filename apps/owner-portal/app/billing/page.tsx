// Avanti Owner Portal — Billing Overview
// MRR, ARR, subscriptions. Server component.

import { controlApi, fmtRupees, fmtDate, type BillingData } from '../../lib/api';

const TIER_PRICES = {
  starter:    { monthly: 1_499_900, annual: 1_274_915 },   // paise
  growth:     { monthly: 3_499_900, annual: 2_974_915 },
  enterprise: { monthly: 7_499_900, annual: 6_374_915 },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#dcfce7', color: '#15803d' },
  past_due:  { bg: '#fee2e2', color: '#b91c1c' },
  cancelled: { bg: '#f1f5f9', color: '#64748b' },
};

function KpiCard({ label, value, color = '#0f172a' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color, marginTop: '6px' }}>
        {value}
      </div>
    </div>
  );
}

export default async function BillingPage() {
  let data: BillingData | null = null;
  let error: string | null = null;

  try {
    data = await controlApi.getBilling();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load billing data';
  }

  const stats = data?.stats;
  const subs  = data?.subscriptions ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Billing</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          Subscriptions and revenue overview
        </p>
      </div>

      {error && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#9a3412' }}>
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        <KpiCard label="MRR"         value={stats ? fmtRupees(stats.mrrPaise)    : '—'} color="#15803d" />
        <KpiCard label="ARR"         value={stats ? fmtRupees(stats.arrPaise)    : '—'} color="#1d4ed8" />
        <KpiCard label="Active subs" value={stats ? String(stats.activeSubCount) : '—'} />
        <KpiCard label="Past due"    value={stats ? String(stats.pastDueCount)   : '—'} color={stats?.pastDueCount ? '#dc2626' : '#0f172a'} />
      </div>

      {/* Active subscriptions */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Subscriptions ({subs.length})
          </h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {['School', 'Tier', 'Billing', 'MRR', 'Status', 'Period ends', 'Razorpay ID'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No subscriptions on record.
                </td>
              </tr>
            )}
            {subs.map((sub, i) => {
              const statusStyle = STATUS_STYLE[sub.status] ?? STATUS_STYLE['cancelled']!;
              return (
                <tr key={sub.id} style={{ borderBottom: i < subs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: '#0f172a' }}>{sub.schoolName}</td>
                  <td style={{ padding: '10px 16px', textTransform: 'capitalize', color: '#475569' }}>{sub.tier}</td>
                  <td style={{ padding: '10px 16px', textTransform: 'capitalize', color: '#64748b' }}>{sub.billingCycle}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>{fmtRupees(sub.amountPaise)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: '12px' }}>{fmtDate(sub.currentPeriodEnd)}</td>
                  <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>{sub.razorpaySubId ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pricing schedule */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
          Pricing schedule
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              {['Tier', 'Monthly', 'Annual (15% off)', 'Limit'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(TIER_PRICES).map(([tier, prices]) => (
              <tr key={tier} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize', color: '#0f172a' }}>{tier}</td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>{fmtRupees(prices.monthly)}/mo</td>
                <td style={{ padding: '10px 12px', color: '#15803d', fontWeight: 500 }}>{fmtRupees(prices.annual)}/mo</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>
                  {tier === 'starter' ? '500 students' : tier === 'growth' ? '2,000 students · 3 branches' : 'Unlimited'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
