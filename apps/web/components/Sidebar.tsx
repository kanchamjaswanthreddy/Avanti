// Avanti — Sidebar Navigation
// Fixed left sidebar with nav links.
// Active link detected via usePathname (requires 'use client').
// Phase 2 school module links are present but lead to Phase 2 pages.
// Phase 3 Canvas link is active.

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  label:   string;
  href:    string;
  icon:    React.ReactNode;
  badge?:  string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href:  '/',
    icon:  <HomeIcon />,
  },
  {
    label: 'Students',
    href:  '/students',
    icon:  <StudentsIcon />,
  },
  {
    label: 'Classes',
    href:  '/classes',
    icon:  <ClassesIcon />,
  },
  {
    label: 'Attendance',
    href:  '/attendance',
    icon:  <AttendanceIcon />,
  },
  {
    label: 'Fees',
    href:  '/fees',
    icon:  <FeesIcon />,
  },
  {
    label: 'Timetable',
    href:  '/timetable',
    icon:  <TimetableIcon />,
  },
];

const BUILDER_ITEMS: NavItem[] = [
  {
    label: 'Canvas',
    href:  '/canvas',
    icon:  <CanvasIcon />,
  },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width:         'var(--sidebar-width)',
        minHeight:     '100vh',
        background:    'var(--surface-card)',
        borderRight:   '1px solid var(--color-gray-200)',
        flexShrink:    0,
        padding:       'var(--space-4)',
        display:       'flex',
        flexDirection: 'column',
        gap:           'var(--space-1)',
        position:      'fixed',
        top:           0,
        left:          0,
        bottom:        0,
        zIndex:        'var(--z-sticky)',
        overflowY:     'auto',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{ textDecoration: 'none' }}
      >
        <div
          style={{
            padding:      'var(--space-3) var(--space-2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div
            style={{
              fontSize:   'var(--text-lg)',
              fontWeight: 'var(--font-bold)',
              color:      'var(--color-brand-500)',
              letterSpacing: '-0.02em',
            }}
          >
            Avanti
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color:    'var(--text-muted)',
            }}
          >
            School Management
          </div>
        </div>
      </Link>

      {/* Main navigation */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           2,
        }}
      >
        <span
          style={{
            fontSize:      'var(--text-xs)',
            fontWeight:    'var(--font-semibold)',
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding:       'var(--space-2) var(--space-2) var(--space-1)',
          }}
        >
          School
        </span>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      {/* Builder section */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           2,
          marginTop:     'var(--space-4)',
        }}
      >
        <span
          style={{
            fontSize:      'var(--text-xs)',
            fontWeight:    'var(--font-semibold)',
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding:       'var(--space-2) var(--space-2) var(--space-1)',
          }}
        >
          Builder
        </span>
        {BUILDER_ITEMS.map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </aside>
  );
}

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          'var(--space-3)',
          padding:      'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          background:   isActive ? 'var(--color-brand-50)' : 'transparent',
          color:        isActive ? 'var(--color-brand-500)' : 'var(--text-secondary)',
          fontSize:     'var(--text-sm)',
          fontWeight:   isActive ? 'var(--font-medium)' : 'var(--font-normal)',
          cursor:       'pointer',
          transition:   'background 0.12s ease, color 0.12s ease',
        }}
      >
        <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>
          {item.icon}
        </span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.badge && (
          <span
            style={{
              fontSize:     10,
              color:        'var(--color-accent-700)',
              background:   'var(--color-warning-light)',
              padding:      '1px 5px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {item.badge}
          </span>
        )}
      </div>
    </Link>
  );
}

// ── Icon components (simple inline SVGs, 16×16) ───────────────────────────────

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5L8 2l6 4.5V14a.5.5 0 01-.5.5h-3V10H5.5v4.5h-3A.5.5 0 012 14V6.5z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function StudentsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function ClassesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 14h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 12v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5.5 7.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FeesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v1m0 4v1m-2-3.5h3a1 1 0 010 2H7a1 1 0 000 2h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function TimetableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function CanvasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="2" y="10" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="10" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4.5 6v2.5M11.5 6v2.5M4.5 8.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
