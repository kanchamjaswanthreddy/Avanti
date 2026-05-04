// Avanti — Dashboard Shell Layout
// Left sidebar: 240px fixed, with navigation links.
// Top bar: 56px fixed.
// Main content: fluid, max-width 1440px.

import type { Metadata } from 'next';
import { Sidebar } from '../../components/Sidebar';
import { AiChatOverlay } from '../../components/ai/AiChatOverlay';
import { AuthGuard } from '../../components/AuthGuard';
import { UserMenu } from '../../components/UserMenu';

export const metadata: Metadata = {
  title: 'Avanti',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
    <div
      style={{
        display:   'flex',
        minHeight: '100vh',
        background: 'var(--surface-page)',
      }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* AI chat overlay — floating button + slide-in panel */}
      <AiChatOverlay />

      {/* Main area */}
      <div
        style={{
          flex:          1,
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
          marginLeft:    'var(--sidebar-width)',
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height:       'var(--topbar-height)',
            background:   'var(--surface-card)',
            borderBottom: '1px solid var(--color-gray-200)',
            display:      'flex',
            alignItems:   'center',
            padding:      '0 var(--space-6)',
            flexShrink:   0,
            position:     'fixed',
            top:          0,
            left:         'var(--sidebar-width)',
            right:        0,
            zIndex:       'var(--z-sticky)',
            boxShadow:    'var(--shadow-xs)',
          }}
        >
          <div style={{ flex: 1 }} />
          <UserMenu />
        </header>

        {/* Content */}
        <main
          style={{
            flex:      1,
            padding:   'var(--space-8)',
            paddingTop: 'calc(var(--topbar-height) + var(--space-8))',
            maxWidth:  'var(--content-max-width)',
            width:     '100%',
            margin:    '0 auto',
            overflow:  'auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
