'use client';

// Avanti — Reports Dashboard
// Generate + download school reports: Attendance Summary, Fee Collection,
// Student List, Class Performance. Jobs are async via BullMQ; polls until done.

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiClient } from '../../../lib/api';
import type { ReportType, ReportJobResult, SchoolClass, FeeStructure } from '@avanti/types';

// ── Report catalogue ──────────────────────────────────────────────────────────

interface ReportMeta {
  type:        ReportType;
  label:       string;
  description: string;
  icon:        string;
  color:       string;
  bg:          string;
}

const REPORTS: ReportMeta[] = [
  {
    type:        'attendance_summary',
    label:       'Attendance Summary',
    description: 'Per-student attendance counts and percentage for a date range.',
    icon:        'AT',
    color:       '#1A3C6B',
    bg:          '#EFF6FF',
  },
  {
    type:        'fee_collection',
    label:       'Fee Collection',
    description: 'All fee payment receipts for an academic year with totals by mode.',
    icon:        'FC',
    color:       '#065F46',
    bg:          '#ECFDF5',
  },
  {
    type:        'student_list',
    label:       'Student List',
    description: 'Complete student roster with contact info and class assignment.',
    icon:        'SL',
    color:       '#7C3AED',
    bg:          '#F5F3FF',
  },
  {
    type:        'class_performance',
    label:       'Class Performance',
    description: 'Class-wise attendance aggregates and performance overview.',
    icon:        'CP',
    color:       '#92400E',
    bg:          '#FFFBEB',
  },
];

// ── CSV download ──────────────────────────────────────────────────────────────

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const keys  = Object.keys(rows[0]!);
  const lines = [
    keys.join(','),
    ...rows.map(r =>
      keys.map(k => {
        const v = r[k] ?? '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Param forms ───────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', padding: '7px 12px',
  border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)', background: '#fff', color: 'var(--text-primary)',
  outline: 'none', height: 36, boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 4,
};

function AttendanceParams({ params, onChange }: {
  params: Record<string, string>;
  onChange: (p: Record<string, string>) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
      <div>
        <label style={LABEL}>From Date</label>
        <input type="date" style={INPUT} value={params['from'] ?? ''} onChange={e => onChange({ ...params, from: e.target.value })} />
      </div>
      <div>
        <label style={LABEL}>To Date</label>
        <input type="date" style={INPUT} value={params['to'] ?? ''} onChange={e => onChange({ ...params, to: e.target.value })} />
      </div>
    </div>
  );
}

function FeeCollectionParams({ params, onChange, structures }: {
  params: Record<string, string>;
  onChange: (p: Record<string, string>) => void;
  structures: FeeStructure[];
}) {
  const years = Array.from(new Set(structures.map(s => s.academicYear))).sort().reverse();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
      <div>
        <label style={LABEL}>Academic Year</label>
        <select style={INPUT} value={params['academicYear'] ?? ''} onChange={e => onChange({ ...params, academicYear: e.target.value })}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label style={LABEL}>Fee Structure</label>
        <select style={INPUT} value={params['feeStructureId'] ?? ''} onChange={e => onChange({ ...params, feeStructureId: e.target.value })}>
          <option value="">All structures</option>
          {structures.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academicYear})</option>)}
        </select>
      </div>
    </div>
  );
}

function StudentListParams({ params, onChange, classes }: {
  params: Record<string, string>;
  onChange: (p: Record<string, string>) => void;
  classes: SchoolClass[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
      <div>
        <label style={LABEL}>Class (optional)</label>
        <select style={INPUT} value={params['classId'] ?? ''} onChange={e => onChange({ ...params, classId: e.target.value })}>
          <option value="">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
        </select>
      </div>
      <div>
        <label style={LABEL}>Academic Year (optional)</label>
        <input style={INPUT} placeholder="e.g. 2024-25" value={params['academicYear'] ?? ''} onChange={e => onChange({ ...params, academicYear: e.target.value })} />
      </div>
    </div>
  );
}

function ClassPerformanceParams({ params, onChange, classes }: {
  params: Record<string, string>;
  onChange: (p: Record<string, string>) => void;
  classes: SchoolClass[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
      <div>
        <label style={LABEL}>Academic Year</label>
        <input style={INPUT} placeholder="e.g. 2024-25" value={params['academicYear'] ?? ''} onChange={e => onChange({ ...params, academicYear: e.target.value })} />
      </div>
      <div>
        <label style={LABEL}>Class (optional)</label>
        <select style={INPUT} value={params['classId'] ?? ''} onChange={e => onChange({ ...params, classId: e.target.value })}>
          <option value="">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Result table ──────────────────────────────────────────────────────────────

function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]!);
  return (
    <div style={{ overflowX: 'auto', marginTop: 'var(--space-4)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
            {keys.map(k => (
              <th key={k} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {k.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 500).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
              {keys.map(k => {
                const v = row[k];
                const display = v === null || v === undefined ? '—' : String(v);
                return (
                  <td key={k} style={{ padding: '5px 12px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 500 && (
        <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--color-gray-100)' }}>
          Showing first 500 of {rows.length} rows. Download CSV for full data.
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selected,   setSelected]   = useState<ReportType>('attendance_summary');
  const [params,     setParams]     = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [jobResult,  setJobResult]  = useState<ReportJobResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  // Context data for param forms
  const [classes,    setClasses]    = useState<SchoolClass[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef  = useRef<string | null>(null);

  useEffect(() => {
    const api = getApiClient();
    api.getClasses().then(setClasses).catch(() => {});
    api.getFeeStructures().then(setStructures).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Reset result when switching report type
  useEffect(() => {
    setJobResult(null);
    setError(null);
    setParams({});
  }, [selected]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pollJob = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const result = await getApiClient().getReportJob(jobId);
        setJobResult(result);
        if (result.status === 'completed' || result.status === 'failed') {
          stopPolling();
          setGenerating(false);
          if (result.status === 'failed') {
            setError(result.error ?? 'Report generation failed.');
          }
        }
      } catch {
        stopPolling();
        setGenerating(false);
        setError('Failed to check report status.');
      }
    }, 1500);
  }, [stopPolling]);

  async function handleGenerate() {
    stopPolling();
    setGenerating(true);
    setJobResult(null);
    setError(null);

    // Build clean params (strip empty strings)
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '')
    );

    try {
      const { jobId } = await getApiClient().generateReport({
        reportType: selected,
        params:     cleanParams,
      });
      jobIdRef.current = jobId;
      setJobResult({ jobId, reportType: selected, status: 'queued', progress: 0, generatedAt: null, rowCount: 0, rows: [], summary: null, error: null });
      pollJob(jobId);
    } catch (err) {
      setGenerating(false);
      setError(err instanceof Error ? err.message : 'Failed to generate report.');
    }
  }

  function handleDownload() {
    if (!jobResult?.rows.length) return;
    const meta = REPORTS.find(r => r.type === selected);
    const ts   = new Date().toISOString().slice(0, 10);
    downloadCsv(jobResult.rows, `avanti-${meta?.type ?? 'report'}-${ts}.csv`);
  }

  const meta = REPORTS.find(r => r.type === selected)!;
  const isDone = jobResult?.status === 'completed';

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Reports
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
          Generate and download school reports as CSV
        </p>
      </div>

      {/* Report type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
        {REPORTS.map(r => (
          <button
            key={r.type}
            onClick={() => setSelected(r.type)}
            style={{
              textAlign: 'left', padding: 'var(--space-4)', background: '#fff',
              border: `2px solid ${selected === r.type ? r.color : 'var(--color-gray-200)'}`,
              borderRadius: 'var(--radius-xl)', cursor: 'pointer',
              boxShadow: selected === r.type ? `0 0 0 3px ${r.color}22` : 'none',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: r.bg, color: r.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              marginBottom: 'var(--space-2)',
            }}>
              {r.icon}
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>
              {r.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {r.description}
            </div>
          </button>
        ))}
      </div>

      {/* Config + result panel */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>

        {/* Panel header */}
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Configure filters and generate</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {isDone && jobResult.rows.length > 0 && (
              <button
                onClick={handleDownload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Download CSV
              </button>
            )}
            <button
              onClick={() => { void handleGenerate(); }}
              disabled={generating}
              className="btn-brand"
              style={{ padding: '7px 16px', background: 'var(--color-brand-500)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}
            >
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Params form */}
        <div style={{ padding: 'var(--space-5)' }}>
          {selected === 'attendance_summary' && (
            <AttendanceParams params={params} onChange={setParams} />
          )}
          {selected === 'fee_collection' && (
            <FeeCollectionParams params={params} onChange={setParams} structures={structures} />
          )}
          {selected === 'student_list' && (
            <StudentListParams params={params} onChange={setParams} classes={classes} />
          )}
          {selected === 'class_performance' && (
            <ClassPerformanceParams params={params} onChange={setParams} classes={classes} />
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 var(--space-5) var(--space-4)', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {/* Status + progress */}
        {jobResult && jobResult.status !== 'completed' && jobResult.status !== 'failed' && (
          <div style={{ margin: '0 var(--space-5) var(--space-4)', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: 16, height: 16, border: '2px solid #BFDBFE', borderTop: '2px solid var(--color-brand-500)', borderRadius: '50%', animation: 'avanti-spin 0.7s linear infinite', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#1E40AF' }}>
                {jobResult.status === 'queued' ? 'Queued — waiting for worker…' : 'Generating report…'}
              </div>
              <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 1 }}>
                {jobResult.progress}% complete
              </div>
            </div>
          </div>
        )}

        {/* Result summary */}
        {isDone && (
          <div style={{ margin: '0 var(--space-5) var(--space-3)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <SummaryChip label="Rows" value={String(jobResult.rowCount)} />
            {jobResult.summary && Object.entries(jobResult.summary).map(([k, v]) => (
              <SummaryChip key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={String(v)} />
            ))}
            {jobResult.generatedAt && (
              <SummaryChip label="Generated" value={new Date(jobResult.generatedAt).toLocaleTimeString('en-IN')} />
            )}
          </div>
        )}

        {/* Result table */}
        {isDone && jobResult.rows.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-gray-100)' }}>
            <ResultTable rows={jobResult.rows} />
          </div>
        )}

        {isDone && jobResult.rows.length === 0 && (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', borderTop: '1px solid var(--color-gray-100)' }}>
            No data found for the selected filters.
          </div>
        )}
      </div>

      <style>{`
        @keyframes avanti-spin { to { transform: rotate(360deg); } }
        select.avanti-input, input.avanti-input { transition: border-color 0.15s; }
        select:focus, input[type="date"]:focus, input[type="text"]:focus { border-color: var(--color-brand-500) !important; }
      `}</style>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F9FAFB', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', padding: '4px 10px', display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
