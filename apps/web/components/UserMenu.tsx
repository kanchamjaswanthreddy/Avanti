'use client';

// Avanti — User Menu (Top Bar)

import { useRouter } from 'next/navigation';
import { getApiClient } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function UserMenu() {
  const router    = useRouter();
  const user      = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);

  if (!user) return null;

  async function handleLogout() {
    try { await getApiClient().logout(user!.schoolId); } catch { /* ignore */ }
    clearAuth();
    router.replace('/login');
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      {/* Name + role */}
      <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {user.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {user.role}
        </div>
      </div>

      {/* Avatar */}
      <div
        style={{
          width:          34,
          height:         34,
          borderRadius:   '50%',
          background:     'linear-gradient(135deg, #1A3C6B 0%, #4F7AC7 100%)',
          color:          '#fff',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       12,
          fontWeight:     700,
          flexShrink:     0,
          letterSpacing:  '0.02em',
        }}
      >
        {initials}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--color-gray-200)' }} />

      {/* Sign out */}
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
