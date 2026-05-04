'use client';

// Vidyut — Fees Dashboard Page
// Fee structures list → select one → show collection stats + defaulters.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getApiClient } from '../../../lib/api';
import type { FeeStructure, FeeDefaulter } from '@vidyut/types';

function rupee(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub, color = 'var(--text-primary)' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color, marginTop: 'var(--space-2)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>{sub}</div>}
    </div>
  );
}

export default function FeesPage() {
  const [structures,  setStructures]  = useState<FeeStructure[]>([]);
  const [selected,    setSelected]    = useState('');
  const [defaulters,  setDefaulters]  = useState<FeeDefaulter[]>([]);
  const [loadingS,    setLoadingS]    = useState(true);
  const [loadingD,    setLoadingD]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoadingS(true);
      try {
        const structs = await getApiClient().getFeeStructures();
        setStructures(structs);
        if (structs[0]) setSelected(structs[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load fee structures');
      } finally {
        setLoadingS(false);
      }
    })();
  }, []);

  const loadDefaulters = useCallback(async (structureId: string) => {
    if (!structureId) return;
    setLoadingD(true);
    try {
      const d = await getApiClient().getFeeDefaulters(structureId);
      setDefaulters(d);
    } catch {
      setDefaulters([]);
    } finally {
      setLoadingD(false);
    }
  }, []);

  useEffect(() => {
    if (selected) void loadDefaulters(selected);
  }, [loadDefaulters, selected]);

  const currentStructure = structures.find(s => s.id === selected);

  const totalDue      = defaulters.reduce((a, d) => a + d.totalDue, 0);
  const totalPaid     = defaulters.reduce((a, d) => a + d.totalPaid, 0);
  const totalBalance  = defaulters.reduce((a, d) => a + d.balance, 0);
  const collectionPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Fees
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            Collection overview and defaulters
          </p>
        </div>

        {/* Structure selector */}
        {structures.length > 0 && (
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{
              padding:      'var(--space-2) var(--space-3)',
              border:       '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize:     'var(--text-sm)',
              background:   'var(--surface-card)',
              color:        'var(--text-primary)',
              minWidth:     '220px',
            }}
          >
            {structures.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.academicYear})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div style={{
          background: 'var(--color-error-50, #fef2f2)', border: '1px solid var(--color-error-200, #fecaca)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: 'var(--text-sm)',
          color: 'var(--color-error-700, #b91c1c)',
        }}>
          {error}
        </div>
      )}

      {loadingS ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      ) : structures.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--space-10)', background: 'var(--surface-card)',
          border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)',
          color: 'var(--text-muted)', fontSize: 'var(--text-sm)',
        }}>
          No fee structures created yet.
          <br />
          <span style={{ opacity: 0.6 }}>Create one via the Canvas builder or API.</span>
        </div>
      ) : (
        <>
          {/* Structure meta */}
          {currentStructure && (
            <div style={{
              background: 'var(--surface-card)', border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
              display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total fee</div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{rupee(currentStructure.totalAmount)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Installments</div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{currentStructure.installments}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic year</div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{currentStructure.academicYear}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
                {currentStructure.items.map(item => (
                  <span key={item.label} style={{
                    fontSize: '12px', background: 'var(--color-gray-100)', borderRadius: '6px',
                    padding: '3px 8px', color: 'var(--text-secondary)',
                  }}>
                    {item.label}: {rupee(item.amount)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Collection stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
            <StatCard label="Total Due"        value={rupee(totalDue)}     sub={`${defaulters.length} students`} />
            <StatCard label="Collected"        value={rupee(totalPaid)}    color="var(--color-success-600, #16a34a)" sub={`${collectionPct}% of due`} />
            <StatCard label="Outstanding"      value={rupee(totalBalance)} color="var(--color-error-600, #dc2626)" />
            <StatCard label="Defaulters"       value={String(defaulters.length)} color="var(--color-warning-600, #d97706)" sub="with balance > 0" />
          </div>

          {/* Defaulters table */}
          <div>
            <h2 style={{
              fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)',
            }}>
              Defaulters
            </h2>

            {loadingD ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Loading…</div>
            ) : defaulters.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 'var(--space-8)', background: 'var(--surface-card)',
                border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)',
                color: 'var(--color-success-600, #16a34a)', fontSize: 'var(--text-sm)', fontWeight: 600,
              }}>
                All fees collected. No defaulters.
              </div>
            ) : (
              <div style={{
                background: 'var(--surface-card)', border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)' }}>
                      {['Student', 'Class', 'Total Due', 'Paid', 'Balance', ''].map(h => (
                        <th key={h} style={{
                          padding: 'var(--space-3) var(--space-4)', textAlign: 'left',
                          fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.map((d, i) => (
                      <tr key={d.studentId} style={{ borderBottom: i < defaulters.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>
                          <Link href={`/students/${d.studentId}`} style={{ color: 'var(--color-brand-600)', textDecoration: 'none' }}>
                            {d.firstName} {d.lastName}
                          </Link>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', fontFamily: 'monospace' }}>
                            {d.admissionNumber}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-secondary)' }}>{d.className ?? '—'}</td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{rupee(d.totalDue)}</td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-success-600, #16a34a)' }}>{rupee(d.totalPaid)}</td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-error-600, #dc2626)', fontWeight: 600 }}>{rupee(d.balance)}</td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                          <Link href={`/students/${d.studentId}`} style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
