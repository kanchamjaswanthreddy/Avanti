// Vidyut Owner Portal — Billing Overview

export default function BillingPage() {
  const TIER_PRICES = {
    starter:    { monthly: 14999, annual: 12749 },
    growth:     { monthly: 34999, annual: 29749 },
    enterprise: { monthly: 74999, annual: 63749 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Billing</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
          Subscriptions and revenue overview
        </p>
      </div>

      {/* MRR cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'MRR',          value: '₹3,29,990', color: '#15803d' },
          { label: 'ARR',          value: '₹39,59,880', color: '#1d4ed8' },
          { label: 'Active subs',  value: '2',          color: '#0f172a' },
          { label: 'Past due',     value: '0',          color: '#dc2626' },
        ].map(card => (
          <div key={card.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: card.color, marginTop: '6px' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Pricing table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
          Pricing schedule
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              {['Tier', 'Monthly', 'Annual (15% off)', 'Limit'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: 'left',
                  fontWeight: 600, color: '#64748b', fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(TIER_PRICES).map(([tier, prices]) => (
              <tr key={tier} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize', color: '#0f172a' }}>
                  {tier}
                </td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>
                  ₹{new Intl.NumberFormat('en-IN').format(prices.monthly)}/mo
                </td>
                <td style={{ padding: '10px 12px', color: '#15803d', fontWeight: 500 }}>
                  ₹{new Intl.NumberFormat('en-IN').format(prices.annual)}/mo
                </td>
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
