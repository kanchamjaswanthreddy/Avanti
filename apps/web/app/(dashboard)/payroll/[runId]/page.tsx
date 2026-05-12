'use client';

// Avanti — Payroll Run Detail Page
// Shows all payslips for a run with computed PF/ESI/TDS breakdown.
// Admin can adjust paid_days and mark individual payslips as paid.

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getApiClient } from '../../../../lib/api';
import type { PayrollRunDetail, Payslip } from '@avanti/types';

function fmt(r: number) {
  return `₹${r.toLocaleString('en-IN')}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split('-');
  if (!y || !m) return month;
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

// ── Status badge ──────────────────────────────────────────────────────────────

const SLIP_STATUS: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#F3F4F6', color: '#6B7280' },
  GENERATED: { bg: '#FEF9C3', color: '#92400E' },
  PAID:      { bg: '#D1FAE5', color: '#065F46' },
};

// ── Pay Modal ─────────────────────────────────────────────────────────────────

function PayModal({ slip, onClose, onPaid }: {
  slip: Payslip;
  onClose: () => void;
  onPaid: (updated: Payslip) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [paidAt, setPaidAt] = useState(today);
  const [mode, setMode]     = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('BANK_TRANSFER');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handlePay() {
    setSaving(true);
    setError(null);
    try {
      const updated = await getApiClient().markPayslipPaid(slip.id, { paidAt, paymentMode: mode });
      onPaid(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid.');
    } finally {
      setSaving(false);
    }
  }

  const sel: React.CSSProperties = { padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', background: '#fff', outline: 'none', height: 38, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Mark as Paid</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{slip.staffName} · {fmt(slip.netSalary)}</div>
        </div>
        <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: '#B91C1C' }}>{error}</div>}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Payment Date</label>
            <input type="date" style={sel} className="avanti-input" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Payment Mode</label>
            <select style={sel} value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
        </div>
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={() => { void handlePay(); }} disabled={saving} className="btn-brand" style={{ padding: 'var(--space-2) var(--space-5)', background: '#059669', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PayrollRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params);
  const [detail,    setDetail]    = useState<PayrollRunDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [paying,    setPaying]    = useState<Payslip | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    setLoading(true);
    getApiClient().getPayrollRun(runId)
      .then(setDetail)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load payroll run'))
      .finally(() => setLoading(false));
  }, [runId]);

  function handlePaid(updated: Payslip) {
    setPaying(null);
    setDetail(prev => prev ? {
      ...prev,
      payslips: prev.payslips.map(p => p.id === updated.id ? updated : p),
    } : prev);
  }

  async function handleFinalize() {
    if (!detail) return;
    setFinalizing(true);
    try {
      const run = await getApiClient().finalizePayrollRun(runId);
      setDetail(prev => prev ? { ...prev, ...run } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize run.');
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-8)' }}>
        <div style={{ width: 16, height: 16, border: '2px solid var(--color-brand-100)', borderTop: '2px solid var(--color-brand-500)', borderRadius: '50%', animation: 'avanti-spin 0.7s linear infinite' }} />
        Loading payroll run…
        <style>{`@keyframes avanti-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', color: '#B91C1C', fontSize: 'var(--text-sm)' }}>
          {error ?? 'Payroll run not found.'}
        </div>
      </div>
    );
  }

  const { run, payslips } = detail;
  const totalGross = payslips.reduce((s, p) => s + p.grossSalary, 0);
  const totalPF    = payslips.reduce((s, p) => s + p.pfEmployee + p.pfEmployer, 0);
  const totalESI   = payslips.reduce((s, p) => s + p.esiEmployee + p.esiEmployer, 0);
  const totalTDS   = payslips.reduce((s, p) => s + p.tds, 0);
  const totalNet   = payslips.reduce((s, p) => s + p.netSalary, 0);
  const paidCount  = payslips.filter(p => p.status === 'PAID').length;

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {paying && <PayModal slip={paying} onClose={() => setPaying(null)} onPaid={handlePaid} />}

      {/* Header */}
      <div>
        <Link href="/payroll" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 'var(--space-3)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Payroll
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {monthLabel(run.month)}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
              {payslips.length} staff · {paidCount} paid · {run.workingDays} working days · AY {run.academicYear}
            </p>
          </div>
          {run.status === 'DRAFT' && (
            <button
              onClick={() => { void handleFinalize(); }}
              disabled={finalizing}
              className="btn-brand"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', background: '#1A3C6B', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: finalizing ? 'not-allowed' : 'pointer', height: 38, opacity: finalizing ? 0.7 : 1 }}
            >
              {finalizing ? 'Finalizing…' : 'Finalize Run'}
            </button>
          )}
          {run.status === 'FINALISED' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', background: '#D1FAE5', color: '#065F46', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700 }}>
              Finalised
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
        {[
          { label: 'Gross Payroll', value: fmt(totalGross), color: '#1A3C6B' },
          { label: 'PF (Total)',    value: fmt(totalPF),    color: '#7C3AED' },
          { label: 'ESI (Total)',   value: fmt(totalESI),   color: '#0284C7' },
          { label: 'TDS (Total)',   value: fmt(totalTDS),   color: '#D97706' },
          { label: 'Net Payable',   value: fmt(totalNet),   color: '#059669' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.color, borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 'var(--space-1)' }}>{card.label}</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: card.color, marginTop: 'var(--space-1)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Payslip table */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-gray-100)', background: '#F8FAFC' }}>
                {['Employee', 'Designation', 'Basic', 'Days', 'Gross', 'PF (Emp)', 'ESI (Emp)', 'TDS', 'Net', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ padding: 'var(--space-3) var(--space-3)', textAlign: i >= 2 && i <= 8 ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 && (
                <tr><td colSpan={11} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>No payslips generated.</td></tr>
              )}
              {payslips.map((p, i) => {
                const st = SLIP_STATUS[p.status] ?? SLIP_STATUS['DRAFT']!;
                return (
                  <tr key={p.id} className="avanti-row" style={{ borderBottom: i < payslips.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{p.staffName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.employeeId}</div>
                    </td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 12 }}>{p.designation}</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.basicSalary)}</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', color: 'var(--text-muted)' }}>{p.paidDays}</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.grossSalary)}</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', color: '#7C3AED', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.pfEmployee)}</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', color: '#0284C7', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.esiEmployee)}</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.tds)}</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.netSalary)}</td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', background: st.bg, color: st.color, borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                      {p.status !== 'PAID' && (
                        <button
                          onClick={() => setPaying(p)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Pay
                        </button>
                      )}
                      {p.status === 'PAID' && p.paidAt && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`.avanti-row:hover td { background: #F9FAFB; }`}</style>
    </div>
  );
}
