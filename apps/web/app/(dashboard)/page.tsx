// Avanti — Dashboard Home
// School-wide KPI cards + quick-action shortcuts.

import Link from 'next/link';

// ── Stat card component ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = 'var(--color-brand-500)',
  href,
}: {
  label: string;
  value: string | number;
  sub?:  string;
  color?: string;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        background:   'var(--surface-card)',
        border:       '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-lg)',
        padding:      'var(--space-5)',
        display:      'flex',
        flexDirection: 'column',
        gap:          'var(--space-2)',
        transition:   'box-shadow 150ms',
      }}
    >
      <span
        style={{
          fontSize:      'var(--text-xs)',
          fontWeight:    600,
          color:         'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize:   'var(--text-3xl)',
          fontWeight: 700,
          color,
          lineHeight: 1.1,
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
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  );
}

// ── Quick action ──────────────────────────────────────────────────────────────

function QuickAction({
  label,
  description,
  href,
  icon,
}: {
  label:       string;
  description: string;
  href:        string;
  icon:        React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          'var(--space-4)',
          padding:      'var(--space-4)',
          background:   'var(--surface-card)',
          border:       '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-lg)',
          cursor:       'pointer',
          transition:   'border-color 150ms',
        }}
      >
        <div
          style={{
            width:          '40px',
            height:         '40px',
            borderRadius:   'var(--radius-md)',
            background:     'var(--color-brand-50)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            color:          'var(--color-brand-500)',
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            {label}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
            {description}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--color-gray-400)' }}
        >
          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // In production these come from server-side data fetching.
  // Placeholder values until auth + real DB connections are wired in.
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

      {/* Page header */}
      <div>
        <h1
          style={{
            fontSize:   'var(--text-2xl)',
            fontWeight: 700,
            color:      'var(--text-primary)',
            margin:     0,
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          {today}
        </p>
      </div>

      {/* KPI row */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap:                 'var(--space-4)',
        }}
      >
        <StatCard
          label="Total Students"
          value="—"
          sub="across all classes"
          href="/students"
        />
        <StatCard
          label="Today's Attendance"
          value="—"
          sub="not yet marked"
          color="var(--color-success-600, #16a34a)"
          href="/attendance"
        />
        <StatCard
          label="Outstanding Fees"
          value="—"
          sub="current academic year"
          color="var(--color-warning-600, #d97706)"
          href="/fees"
        />
        <StatCard
          label="Classes"
          value="—"
          sub="active this year"
          href="/classes"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2
          style={{
            fontSize:     'var(--text-sm)',
            fontWeight:   600,
            color:        'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 'var(--space-3)',
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
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />
          <QuickAction
            label="View Students"
            description="Search and manage student records"
            href="/students"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            }
          />
          <QuickAction
            label="Fee Collections"
            description="Track payments and defaulters"
            href="/fees"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 6v1m0 6v1m-2.5-4.5h4a1.5 1.5 0 010 3H9.5a1.5 1.5 0 000 3h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            }
          />
          <QuickAction
            label="View Timetable"
            description="Weekly class schedule"
            href="/timetable"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 2v3M14 2v3M2 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            }
          />
          <QuickAction
            label="Schema Builder"
            description="Customise your school's data model"
            href="/canvas/schema"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="2" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="13" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="13" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5.5 7v3.5M14.5 7v3.5M5.5 10.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            }
          />
          <QuickAction
            label="Ask Avanti AI"
            description="Get insights about your school"
            href="#"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2l1.5 4.5H16l-3.75 2.75 1.43 4.4L10 11l-3.68 2.65 1.43-4.4L4 6.5h4.5L10 2z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
