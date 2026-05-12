'use client';

// Avanti — Payroll Runs List Page
// Lists all monthly payroll runs. "New Run" opens a modal to create one.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiClient } from '../../../lib/api';
import type { PayrollRun } from '@avanti/types';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#FEF9C3', color: '#92400E' },
  FINALISED: { bg: '#D1FAE5', color: '#065F46' },
};

function fmt(rupees: number) {
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split('-');
  if (!y || !m) return month;
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

// ── New Run Modal ─────────────────────────────────────────────────────────────

function NewRunModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (run: PayrollRun) => void;
}) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const calYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const defaultYear = `${calYear}-${String(calYear + 1).slice(2)}`;

  const [month,        setMonth]        = useState(defaultMonth);
  const [academicYear, setAcademicYear] = useState(defaultYear);
  const [workingDays,  setWorkingDays]  = useState('26');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  async function handleCreate() {
    if (!month || !academicYear) return;
    setSaving(true);
    setError(null);
    try {
      const detail = await getApiClient().createPayrollRun({
        month,
        academicYear,
        workingDays: parseInt(workingDays, 10) || 26,
      });
      onCreate(detail.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payroll run.');
    } finally {
      setSaving(false);
    }
  }

  const INPUT_STYLE: React.CSSProperties = {
    width: '100%', padding: 'var(--space-2) var(--space-3)',
    border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)', background: '#fff', color: 'var(--text-primary)',
    outline: 'none', height: 38, boxSizing: 'border-box',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>New Payroll Run</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            Creates draft payslips for all active staff
          </div>
        </div>
        <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: '#B91C1C' }}>
              {error}
            </div>
          )}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Month</label>
            <input type="month" style={INPUT_STYLE} className="avanti-input" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Academic Year</label>
            <input style={INPUT_STYLE} className="avanti-input" placeholder="e.g. 2024-25" value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Working Days</label>
            <input type="number" min="1" max="31" style={INPUT_STYLE} className="avanti-input" value={workingDays} onChange={e => setWorkingDays(e.target.value)} />
          </div>
        </div>
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          <button
            onClick={() => { void handleCreate(); }}
            disabled={!month || !academicYear || saving}
            className="btn-brand"
            style={{ padding: 'var(--space-2) var(--space-5)', background: 'var(--color-brand-500)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Creating…' : 'Create Run'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const router = useRouter();
  const [runs,    setRuns]    = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [modal,   setModal]   = useState(false);

  useEffect(() => {
    setLoading(true);
    getApiClient().listPayrollRuns()
      .then(setRuns)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load payroll runs'))
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(run: PayrollRun) {
    setModal(false);
    router.push(`/payroll/${run.id}`);
  }

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {modal && <NewRunModal onClose={() => setModal(false)} onCreate={handleCreated} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Payroll
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
            {loading ? 'Loading…' : `${runs.length} payroll run${runs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="btn-brand"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', background: 'var(--color-brand-500)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', height: 38 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          New Run
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
              {['Month', 'Academic Year', 'Staff', 'Total Payroll', 'Status', ''].map((h, i) => (
                <th key={i} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ width: 16, height: 16, border: '2px solid var(--color-brand-100)', borderTop: '2px solid var(--color-brand-500)', borderRadius: '50%', animation: 'avanti-spin 0.7s linear infinite' }} />
                  Loading…
                </div>
              </td></tr>
            )}
            {!loading && runs.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No payroll runs yet. Click <strong>New Run</strong> to generate the first one.
              </td></tr>
            )}
            {runs.map((run, i) => {
              const st = STATUS_STYLE[run.status] ?? STATUS_STYLE['DRAFT']!;
              return (
                <tr key={run.id} className="avanti-row" style={{ borderBottom: i < runs.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--text-primary)' }}>{monthLabel(run.month)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{run.academicYear}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-primary)' }}>{run.staffCount ?? 0}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(run.totalNet ?? 0)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <span style={{ display: 'inline-block', padding: '2px 10px', background: st.bg, color: st.color, borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <Link href={`/payroll/${run.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-brand-500)', fontSize: 'var(--text-xs)', fontWeight: 500, textDecoration: 'none', opacity: 0.7 }}>
                      View
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 9l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes avanti-spin { to { transform: rotate(360deg); } } .avanti-row:hover td { background: #F9FAFB; }`}</style>
    </div>
  );
}
