'use client';

// Avanti — User Menu (Top Bar)
// Shows logged-in user's name + role, with a logout action.

import { useRouter } from 'next/navigation';
import { getApiClient } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function UserMenu() {
  const router    = useRouter();
  const user      = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);

  if (!user) return null;

  async function handleLogout() {
    try {
      await getApiClient().logout(user!.schoolId);
    } catch {
      // Ignore logout errors — clear session regardless
    }
    clearAuth();
    router.replace('/login');
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div
          style={{
            width:          '30px',
            height:         '30px',
            borderRadius:   '50%',
            background:     'var(--color-brand-500)',
            color:          '#fff',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '12px',
            fontWeight:     700,
            flexShrink:     0,
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {user.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.2 }}>
            {user.role}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'var(--color-gray-200)' }} />

      {/* Logout */}
      <button
        onClick={() => { void handleLogout(); }}
        style={{
          padding:      'var(--space-1) var(--space-3)',
          border:       '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-md)',
          background:   'transparent',
          cursor:       'pointer',
          fontSize:     'var(--text-xs)',
          color:        'var(--text-muted)',
          fontWeight:   500,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
