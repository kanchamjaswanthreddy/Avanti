// Avanti — Dashboard Home

import Link from 'next/link';

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = '#1A3C6B',
  href,
}: {
  label:   string;
  value:   string | number;
  sub?:    string;
  accent?: string;
  href?:   string;
}) {
  const inner = (
    <div
      className="avanti-card"
      style={{
        background:    '#fff',
        borderRadius:  'var(--radius-xl)',
        padding:       'var(--space-6)',
        display:       'flex',
        flexDirection: 'column',
        gap:           'var(--space-3)',
        boxShadow:     '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        position:      'relative',
        overflow:      'hidden',
        cursor:        href ? 'pointer' : 'default',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position:     'absolute',
          top:          0,
          left:         0,
          right:        0,
          height:       3,
          background:   accent,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}
      />
      <span
        style={{
          fontSize:      'var(--text-xs)',
          fontWeight:    600,
          color:         'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginTop:     'var(--space-1)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize:      '2.25rem',
          fontWeight:    700,
          color:         accent,
          lineHeight:    1,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {sub}
        </span>
      )}
    </div>
  );

  if (!href) return inner;
  return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>;
}

// ── Quick Action ──────────────────────────────────────────────────────────────

function QuickAction({
  label,
  description,
  href,
  icon,
  accent = '#1A3C6B',
}: {
  label:       string;
  description: string;
  href:        string;
  icon:        React.ReactNode;
  accent?:     string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        className="avanti-action"
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          'var(--space-4)',
          padding:      'var(--space-4) var(--space-5)',
          background:   '#fff',
          border:       '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-xl)',
          cursor:       'pointer',
          boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            width:          42,
            height:         42,
            borderRadius:   'var(--radius-md)',
            background:     `${accent}12`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            color:          accent,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {label}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            {description}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-gray-400)', flexShrink: 0 }}>
          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

      {/* Header */}
      <div>
        <h1
          style={{
            fontSize:      'var(--text-2xl)',
            fontWeight:    700,
            color:         'var(--text-primary)',
            margin:        0,
            letterSpacing: '-0.02em',
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', margin: 'var(--space-1) 0 0' }}>
          Welcome back. Here's what's happening today.
        </p>
      </div>

      {/* KPI row */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap:                 'var(--space-4)',
        }}
      >
        <StatCard label="Total Students"      value="—" sub="across all classes"    accent="#1A3C6B" href="/students" />
        <StatCard label="Today's Attendance"  value="—" sub="not yet marked"        accent="#059669" href="/attendance" />
        <StatCard label="Outstanding Fees"    value="—" sub="current academic year" accent="#D97706" href="/fees" />
        <StatCard label="Active Classes"      value="—" sub="this academic year"    accent="#7C3AED" href="/classes" />
      </div>

      {/* Quick actions */}
      <div>
        <h2
          style={{
            fontSize:      'var(--text-xs)',
            fontWeight:    600,
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom:  'var(--space-3)',
            margin:        '0 0 var(--space-3)',
          }}
        >
          Quick actions
        </h2>
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap:                 'var(--space-3)',
          }}
        >
          <QuickAction
            label="Mark Attendance"
            description="Record today's class attendance"
            href="/attendance"
            accent="#059669"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <QuickAction
            label="View Students"
            description="Search and manage student records"
            href="/students"
            accent="#1A3C6B"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
          <QuickAction
            label="Fee Collections"
            description="Track payments and defaulters"
            href="/fees"
            accent="#D97706"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v1m0 6v1m-2.5-4.5h4a1.5 1.5 0 010 3H9.5a1.5 1.5 0 000 3h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
          <QuickAction
            label="View Timetable"
            description="Weekly class schedule"
            href="/timetable"
            accent="#0EA5E9"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 2v3M14 2v3M2 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
          <QuickAction
            label="Schema Builder"
            description="Customise your school's data model"
            href="/canvas/schema"
            accent="#7C3AED"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="13" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="13" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 7v3.5M14.5 7v3.5M5.5 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
          <QuickAction
            label="Ask Avanti AI"
            description="Get insights in your language"
            href="#"
            accent="#F59E0B"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l1.5 4.5H16l-3.75 2.75 1.43 4.4L10 11l-3.68 2.65 1.43-4.4L4 6.5h4.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>}
          />
        </div>
      </div>
    </div>
  );
}
