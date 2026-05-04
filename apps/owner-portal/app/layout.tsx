// Avanti Owner Portal — App Shell
// Fixed sidebar + top bar. Internal-only access.

import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Avanti — Owner Portal',
  description: 'Internal operations portal — Avanti platform team only.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc' }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          {/* Sidebar */}
          <aside style={{
            width: '220px',
            flexShrink: 0,
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 12px',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 100,
          }}>
            {/* Logo */}
            <div style={{ padding: '8px 12px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em' }}>
                Avanti
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Owner Portal
              </div>
            </div>

            {/* Warning badge */}
            <div style={{
              margin: '12px 0',
              padding: '5px 10px',
              background: 'rgba(245,158,11,0.15)',
              borderRadius: '6px',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign: 'center',
            }}>
              Internal Only
            </div>

            {/* Nav */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' }}>
              {[
                { label: 'Overview',     href: '/' },
                { label: 'Schools',      href: '/schools' },
                { label: 'Provisioning', href: '/provisioning' },
                { label: 'Billing',      href: '/billing' },
                { label: 'Incidents',    href: '/incidents' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    color: 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    transition: 'background 120ms, color 120ms',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <div style={{ flex: 1, marginLeft: '220px', display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <header style={{
              height: '52px',
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              position: 'sticky',
              top: 0,
              zIndex: 50,
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Avanti Operations Console</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </header>

            {/* Content */}
            <main style={{ flex: 1, padding: '32px 32px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
