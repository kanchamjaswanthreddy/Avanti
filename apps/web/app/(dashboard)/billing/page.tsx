'use client';

// Avanti — School Billing Page
// Shows active subscription plan, next billing date, invoice history.
// If no subscription: shows pricing cards to subscribe.
// Subscribe flow: tier/cycle select → POST → redirect to Razorpay payment URL.

import { useState, useEffect } from 'react';
import { getApiClient } from '../../../lib/api';
import type { BillingSubscription, BillingInvoice } from '@avanti/api-client';

// ── Pricing display constants ──────────────────────────────────────────────────

const PLANS = [
  {
    tier:       'starter' as const,
    label:      'Starter',
    monthly:    14999,
    annual:     12749,
    students:   'Up to 500 students',
    color:      '#1A3C6B',
    highlight:  false,
  },
  {
    tier:       'growth' as const,
    label:      'Growth',
    monthly:    34999,
    annual:     29749,
    students:   'Up to 2,000 students · 3 branches',
    color:      '#F59E0B',
    highlight:  true,
  },
  {
    tier:       'enterprise' as const,
    label:      'Enterprise',
    monthly:    74999,
    annual:     63749,
    students:   'Unlimited students + branches',
    color:      '#0A1A30',
    highlight:  false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function statusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case 'active':    return { bg: '#D1FAE5', color: '#065F46', label: 'Active' };
    case 'past_due':  return { bg: '#FEF3C7', color: '#92400E', label: 'Past Due' };
    case 'cancelled': return { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelled' };
    default:          return { bg: '#F3F4F6', color: '#374151', label: status };
  }
}

// ── Subscribe Modal ────────────────────────────────────────────────────────────

function SubscribeModal({ onClose }: { onClose: () => void }) {
  const [cycle,    setCycle]    = useState<'monthly' | 'annual'>('monthly');
  const [tier,     setTier]     = useState<'starter' | 'growth' | 'enterprise'>('growth');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [step,     setStep]     = useState<'plan' | 'contact'>('plan');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubscribe() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await getApiClient().createSubscription({
        tier,
        billingCycle: cycle,
        customerName:  name.trim(),
        customerEmail: email.trim(),
        ...(phone.trim() ? { customerContact: phone.trim() } : {}),
      });
      // Redirect to Razorpay hosted payment page
      window.location.href = result.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription.');
      setSaving(false);
    }
  }

  const INPUT: React.CSSProperties = {
    width: '100%', padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)', background: '#fff', color: 'var(--text-primary)',
    outline: 'none', height: 38, boxSizing: 'border-box',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', width: 560, maxWidth: '92vw', boxShadow: '0 24px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
              {step === 'plan' ? 'Choose your plan' : 'Contact details'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
              {step === 'plan'
                ? 'You\'ll be redirected to Razorpay to complete payment'
                : 'We\'ll send receipts and billing notifications here'}
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {step === 'plan' && (
          <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Billing cycle toggle */}
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 'var(--radius-lg)', padding: 3, gap: 2 }}>
              {(['monthly', 'annual'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  style={{
                    flex: 1, padding: 'var(--space-2)', border: 'none', borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)',
                    background: cycle === c ? '#fff' : 'transparent',
                    color: cycle === c ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: cycle === c ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {c === 'monthly' ? 'Monthly' : 'Annual (15% off)'}
                </button>
              ))}
            </div>

            {/* Plan cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {PLANS.map(plan => {
                const price = cycle === 'monthly' ? plan.monthly : plan.annual;
                const selected = tier === plan.tier;
                return (
                  <button
                    key={plan.tier}
                    onClick={() => setTier(plan.tier)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--space-3) var(--space-4)',
                      border: selected ? `2px solid ${plan.color}` : '2px solid var(--color-gray-200)',
                      borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                      background: selected ? `${plan.color}08` : '#fff',
                      transition: 'all 0.12s', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        border: selected ? `3px solid ${plan.color}` : '2px solid var(--color-gray-300)',
                        background: selected ? plan.color : 'transparent',
                        flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{plan.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{plan.students}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: plan.color, fontVariantNumeric: 'tabular-nums' }}>
                        ₹{price.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>/month</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'contact' && (
          <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: '#B91C1C' }}>
                {error}
              </div>
            )}
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Contact name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Principal / Finance head name" />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Email <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input style={INPUT} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="billing@yourschool.in" />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Phone (optional)
              </label>
              <input style={INPUT} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>

            {/* Summary */}
            <div style={{ background: '#F8FAFC', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)' }}>
              {(() => {
                const plan = PLANS.find(p => p.tier === tier)!;
                const price = cycle === 'monthly' ? plan.monthly : plan.annual;
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{plan.label} · {cycle === 'monthly' ? 'Monthly' : 'Annual'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Billed {cycle === 'monthly' ? 'every month' : 'once per year'}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: '#1A3C6B' }}>
                      ₹{price.toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          {step === 'contact' && (
            <button
              onClick={() => setStep('plan')}
              style={{ padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}
            >
              Back
            </button>
          )}
          <button onClick={onClose} style={{ padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          {step === 'plan' ? (
            <button
              onClick={() => setStep('contact')}
              style={{ padding: 'var(--space-2) var(--space-5)', background: '#1A3C6B', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => { void handleSubscribe(); }}
              disabled={!name.trim() || !email.trim() || saving}
              style={{
                padding: 'var(--space-2) var(--space-5)', background: '#1A3C6B', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
                fontWeight: 600, cursor: saving || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !name.trim() || !email.trim() ? 0.6 : 1,
              }}
            >
              {saving ? 'Redirecting…' : 'Pay with Razorpay'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cancel Confirm ─────────────────────────────────────────────────────────────

function CancelConfirmModal({ onClose, onDone }: {
  onClose: () => void;
  onDone:  () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await getApiClient().cancelSubscription();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription.');
      setCancelling(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>Cancel subscription?</div>
        </div>
        <div style={{ padding: 'var(--space-5) var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: '#B91C1C', marginBottom: 'var(--space-3)' }}>
              {error}
            </div>
          )}
          Your subscription will remain active until the end of the current billing cycle.
          After that, the school will be deactivated and no further charges will occur.
        </div>
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Keep subscription
          </button>
          <button
            onClick={() => { void handleCancel(); }}
            disabled={cancelling}
            style={{ padding: 'var(--space-2) var(--space-5)', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.7 : 1 }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel subscription'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Row ───────────────────────────────────────────────────────────────

function InvoiceRow({ inv, last }: { inv: BillingInvoice; last: boolean }) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    paid:     { bg: '#D1FAE5', color: '#065F46' },
    failed:   { bg: '#FEE2E2', color: '#991B1B' },
    refunded: { bg: '#EDE9FE', color: '#5B21B6' },
  };
  const st = statusColors[inv.status] ?? { bg: '#F3F4F6', color: '#374151' };

  return (
    <tr className="avanti-row" style={{ borderBottom: last ? 'none' : '1px solid var(--color-gray-100)' }}>
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        {inv.razorpayInvoiceId}
      </td>
      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {fmtRupees(inv.amountPaise)}
      </td>
      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <span style={{ display: 'inline-block', padding: '2px 10px', background: st.bg, color: st.color, borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
          {inv.status}
        </span>
      </td>
      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
        {fmtDate(inv.paidAt ?? inv.createdAt)}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [sub,         setSub]         = useState<BillingSubscription | null>(null);
  const [invoices,    setInvoices]    = useState<BillingInvoice[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showSub,     setShowSub]     = useState(false);
  const [showCancel,  setShowCancel]  = useState(false);
  const [noSub,       setNoSub]       = useState(false);

  function loadData() {
    setLoading(true);
    setError(null);
    Promise.all([
      getApiClient().getSubscription().catch(err => {
        if ((err as { status?: number }).status === 404) {
          setNoSub(true);
          return null;
        }
        throw err;
      }),
      getApiClient().listBillingInvoices(),
    ])
      .then(([s, inv]) => {
        setSub(s);
        setInvoices(inv);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load billing data.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ss = sub ? statusStyle(sub.status) : null;

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {showSub   && <SubscribeModal   onClose={() => setShowSub(false)} />}
      {showCancel && <CancelConfirmModal onClose={() => setShowCancel(false)} onDone={() => { setShowCancel(false); loadData(); }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Billing
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
            Subscription plan and invoice history
          </p>
        </div>
        {(noSub || (sub && sub.status !== 'active')) && (
          <button
            onClick={() => setShowSub(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', background: '#1A3C6B', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', height: 38 }}
          >
            Subscribe
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-12)', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--color-brand-100)', borderTop: '2px solid var(--color-brand-500)', borderRadius: '50%', animation: 'avanti-spin 0.7s linear infinite' }} />
          Loading…
        </div>
      )}

      {/* No subscription CTA */}
      {!loading && noSub && (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {/* Pricing grid */}
          <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-gray-100)' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>No active subscription</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Choose a plan to unlock full platform access.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
            {PLANS.map((plan, i) => (
              <div
                key={plan.tier}
                style={{
                  padding: 'var(--space-6)',
                  borderRight: i < 2 ? '1px solid var(--color-gray-100)' : 'none',
                  background: plan.highlight ? '#FFFBEB' : '#fff',
                }}
              >
                {plan.highlight && (
                  <div style={{ display: 'inline-block', background: '#F59E0B', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-2)' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>{plan.label}</div>
                <div style={{ fontWeight: 800, fontSize: 28, color: plan.color, fontVariantNumeric: 'tabular-nums', marginBottom: 2, lineHeight: 1.1 }}>
                  ₹{plan.monthly.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>/month · or ₹{plan.annual.toLocaleString('en-IN')}/mo billed annually</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>{plan.students}</div>
                <button
                  onClick={() => setShowSub(true)}
                  style={{
                    width: '100%', padding: 'var(--space-2)', border: `2px solid ${plan.color}`,
                    borderRadius: 'var(--radius-md)', background: plan.highlight ? plan.color : 'transparent',
                    color: plan.highlight ? '#fff' : plan.color,
                    fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Get started
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active subscription card */}
      {!loading && sub && ss && (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
                  {sub.tier}
                </div>
                <span style={{ display: 'inline-block', padding: '3px 12px', background: ss.bg, color: ss.color, borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {ss.label}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Monthly amount</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-xl)', color: '#1A3C6B', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtRupees(sub.amountPaise)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Billing cycle</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {sub.billingCycle}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Next billing date</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    {fmtDate(sub.currentPeriodEnd)}
                  </div>
                </div>
              </div>
            </div>

            {sub.status === 'active' && (
              <button
                onClick={() => setShowCancel(true)}
                style={{ padding: 'var(--space-2) var(--space-4)', border: '1px solid #FECACA', color: '#DC2626', background: '#fff', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', cursor: 'pointer', flexShrink: 0 }}
              >
                Cancel plan
              </button>
            )}
          </div>

          {/* Razorpay sub ID */}
          {sub.razorpaySubId && (
            <div style={{ borderTop: '1px solid var(--color-gray-100)', padding: 'var(--space-3) var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Razorpay subscription:</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{sub.razorpaySubId}</div>
            </div>
          )}
        </div>
      )}

      {/* Invoice table */}
      {!loading && invoices.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-gray-100)' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Invoices</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                {['Invoice ID', 'Amount', 'Status', 'Date'].map((h, i) => (
                  <th key={i} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <InvoiceRow key={inv.id} inv={inv} last={i === invoices.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !noSub && !sub && !error && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          No billing data found.
        </div>
      )}

      <style>{`@keyframes avanti-spin { to { transform: rotate(360deg); } } .avanti-row:hover td { background: #F9FAFB; }`}</style>
    </div>
  );
}
