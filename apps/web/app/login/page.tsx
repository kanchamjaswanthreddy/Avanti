'use client';

// Vidyut — Login Page
// School ID + email + password → POST /api/v1/auth/login → store token + redirect.

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const router      = useRouter();
  const setAuth     = useAuthStore(s => s.setAuth);
  const accessToken = useAuthStore(s => s.accessToken);

  // Already authenticated — bounce to dashboard
  useEffect(() => {
    if (accessToken) {
      router.replace('/');
    }
  }, [accessToken, router]);

  const [schoolId,  setSchoolId]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await getApiClient().login(email.trim(), password, schoolId.trim());
      setAuth(result.accessToken, {
        id:       result.user.id,
        name:     result.user.name,
        email:    result.user.email,
        role:     result.user.role,
        schoolId: result.user.schoolId,
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'var(--surface-page)',
        padding:        'var(--space-6)',
      }}
    >
      <div
        style={{
          width:        '100%',
          maxWidth:     '400px',
          background:   'var(--surface-card)',
          border:       '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-xl)',
          padding:      'var(--space-8)',
          boxShadow:    'var(--shadow-lg)',
        }}
      >
        {/* Logo / wordmark */}
        <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
          <div
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          '48px',
              height:         '48px',
              borderRadius:   'var(--radius-lg)',
              background:     'var(--color-brand-500)',
              color:          '#fff',
              fontSize:       '22px',
              fontWeight:     800,
              marginBottom:   'var(--space-3)',
            }}
          >
            V
          </div>
          <h1
            style={{
              fontSize:   'var(--text-2xl)',
              fontWeight: 700,
              color:      'var(--text-primary)',
              margin:     0,
            }}
          >
            Vidyut
          </h1>
          <p
            style={{
              fontSize:   'var(--text-sm)',
              color:      'var(--text-muted)',
              marginTop:  'var(--space-1)',
            }}
          >
            Sign in to your school
          </p>
        </div>

        {error && (
          <div
            style={{
              background:   'var(--color-error-50, #fef2f2)',
              border:       '1px solid var(--color-error-200, #fecaca)',
              borderRadius: 'var(--radius-md)',
              padding:      'var(--space-3)',
              fontSize:     'var(--text-sm)',
              color:        'var(--color-error-700, #b91c1c)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={e => { void handleSubmit(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label
              htmlFor="schoolId"
              style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              School ID
            </label>
            <input
              id="schoolId"
              type="text"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label
              htmlFor="email"
              style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@school.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label
              htmlFor="password"
              style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop:    'var(--space-2)',
              padding:      'var(--space-3)',
              background:   loading ? 'var(--color-gray-300)' : 'var(--color-brand-500)',
              color:        '#fff',
              border:       'none',
              borderRadius: 'var(--radius-md)',
              fontSize:     'var(--text-sm)',
              fontWeight:   600,
              cursor:       loading ? 'not-allowed' : 'pointer',
              transition:   'background 150ms ease',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding:      'var(--space-2) var(--space-3)',
  border:       '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-md)',
  fontSize:     'var(--text-sm)',
  background:   'var(--surface-page)',
  color:        'var(--text-primary)',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
};
