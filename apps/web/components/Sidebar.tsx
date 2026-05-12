// Avanti — Sidebar Navigation
// Dark navy sidebar. Apple/Tesla style.

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href:  string;
  icon:  React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: '/',           icon: <HomeIcon /> },
  { label: 'Students',   href: '/students',   icon: <StudentsIcon /> },
  { label: 'Staff',      href: '/staff',      icon: <StaffIcon /> },
  { label: 'Classes',    href: '/classes',    icon: <ClassesIcon /> },
  { label: 'Attendance', href: '/attendance', icon: <AttendanceIcon /> },
  { label: 'Fees',       href: '/fees',       icon: <FeesIcon /> },
  { label: 'Timetable',  href: '/timetable',  icon: <TimetableIcon /> },
  { label: 'Payroll',    href: '/payroll',    icon: <PayrollIcon /> },
  { label: 'Reports',    href: '/reports',    icon: <ReportsIcon /> },
  { label: 'Billing',    href: '/billing',    icon: <BillingIcon /> },
];

const BUILDER_ITEMS: NavItem[] = [
  { label: 'Canvas',     href: '/canvas',     icon: <CanvasIcon /> },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width:         'var(--sidebar-width)',
        minHeight:     '100vh',
        background:    '#0A1A30',
        flexShrink:    0,
        display:       'flex',
        flexDirection: 'column',
        position:      'fixed',
        top:           0,
        left:          0,
        bottom:        0,
        zIndex:        'var(--z-sticky)',
        overflowY:     'auto',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div
          style={{
            padding:    'var(--space-5) var(--space-5) var(--space-4)',
            display:    'flex',
            alignItems: 'center',
            gap:        'var(--space-3)',
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width:          34,
              height:         34,
              borderRadius:   '10px',
              background:     'linear-gradient(135deg, #1e4a87 0%, #F59E0B 100%)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
              fontWeight:     800,
              fontSize:       16,
              color:          '#fff',
              letterSpacing:  '-0.02em',
            }}
          >
            A
          </div>
          <div>
            <div
              style={{
                fontSize:      'var(--text-base)',
                fontWeight:    700,
                color:         '#fff',
                letterSpacing: '-0.02em',
                lineHeight:    1.1,
              }}
            >
              Avanti
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              School OS
            </div>
          </div>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 var(--space-4)' }} />

      {/* Main nav */}
      <div style={{ padding: 'var(--space-4) var(--space-3)', flex: 1 }}>
        <NavSection label="School" items={NAV_ITEMS} pathname={pathname} />
        <div style={{ marginTop: 'var(--space-5)' }}>
          <NavSection label="Builder" items={BUILDER_ITEMS} pathname={pathname} />
        </div>
      </div>

      {/* Bottom watermark */}
      <div
        style={{
          padding:  'var(--space-4) var(--space-5)',
          fontSize: 10,
          color:    'rgba(255,255,255,0.15)',
        }}
      >
        Avanti v0.1 · Phase 3
      </div>
    </aside>
  );
}

// ── NavSection ────────────────────────────────────────────────────────────────

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div>
      <div
        style={{
          fontSize:      10,
          fontWeight:    600,
          color:         'rgba(255,255,255,0.28)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding:       'var(--space-1) var(--space-2) var(--space-2)',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));

  return (
    <Link href={item.href} style={{ textDecoration: 'none' }}>
      <div
        className="sidebar-item"
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          'var(--space-3)',
          padding:      'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          background:   isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
          color:        isActive ? '#fff' : 'rgba(255,255,255,0.55)',
          fontSize:     'var(--text-sm)',
          fontWeight:   isActive ? 600 : 400,
          borderLeft:   isActive ? '3px solid #F59E0B' : '3px solid transparent',
          paddingLeft:  isActive ? 'calc(var(--space-3) - 3px)' : 'var(--space-3)',
        }}
      >
        <span
          className="sidebar-icon"
          style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}
        >
          {item.icon}
        </span>
        <span>{item.label}</span>
      </div>
    </Link>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5L8 2l6 4.5V14a.5.5 0 01-.5.5h-3V10H5.5v4.5h-3A.5.5 0 012 14V6.5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function StudentsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6"  cy="5" r="2"   stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="11" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 13c0-2.21 2.239-4 5-4s5 1.79 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M11 9c1.657 0 3 1.12 3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function ClassesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 7.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FeesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 5v1m0 4v1m-2-3.5h3a1 1 0 010 2H7a1 1 0 000 2h3"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function TimetableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function PayrollIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 7h2m-2 2.5h4m2-2.5h-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 11V8m3 3V6m3 5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="4" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 10.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function CanvasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9.5" y="1.5" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1.5" y="10.5" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9.5" y="10.5" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4 5.5v3M12 5.5v3M4 8.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
