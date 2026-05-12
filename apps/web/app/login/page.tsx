'use client';

// Avanti — Login Page

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const router      = useRouter();
  const setAuth     = useAuthStore(s => s.setAuth);
  const accessToken = useAuthStore(s => s.accessToken);

  useEffect(() => {
    if (accessToken) router.replace('/');
  }, [accessToken, router]);

  const [schoolId, setSchoolId] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

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
        background:     '#0A1A30',
      }}
    >
      {/* Left panel — brand */}
      <div
        style={{
          flex:           '0 0 420px',
          background:     'linear-gradient(160deg, #0A1A30 0%, #142F56 60%, #1A3C6B 100%)',
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'space-between',
          padding:        'var(--space-12)',
          position:       'relative',
          overflow:       'hidden',
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(245,158,11,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(79,122,199,0.08)', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', position: 'relative' }}>
          <div
            style={{
              width:          40,
              height:         40,
              borderRadius:   12,
              background:     'linear-gradient(135deg, #1e4a87 0%, #F59E0B 100%)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontWeight:     800,
              fontSize:       18,
              color:          '#fff',
            }}
          >
            A
          </div>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Avanti
          </span>
        </div>

        {/* Brand copy */}
        <div style={{ position: 'relative' }}>
          <h2
            style={{
              fontSize:      'var(--text-3xl)',
              fontWeight:    700,
              color:         '#fff',
              lineHeight:    1.2,
              margin:        '0 0 var(--space-4)',
              letterSpacing: '-0.02em',
            }}
          >
            India's smartest school platform
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
            AI-native school management built for the way Indian schools actually work.
          </p>
          <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {['Students · Attendance · Fees', 'AI Agent in your language', 'Live schema builder'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.55)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#F9FAFB',
          padding:        'var(--space-8)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h1
              style={{
                fontSize:      'var(--text-2xl)',
                fontWeight:    700,
                color:         'var(--text-primary)',
                margin:        '0 0 var(--space-2)',
                letterSpacing: '-0.02em',
              }}
            >
              Sign in
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Enter your school credentials to continue
            </p>
          </div>

          {error && (
            <div
              style={{
                background:    '#FEF2F2',
                border:        '1px solid #FECACA',
                borderRadius:  'var(--radius-md)',
                padding:       'var(--space-3) var(--space-4)',
                fontSize:      'var(--text-sm)',
                color:         '#B91C1C',
                marginBottom:  'var(--space-5)',
                display:       'flex',
                alignItems:    'center',
                gap:           'var(--space-2)',
              }}
            >
              <span style={{ fontSize: 16 }}>⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={e => { void handleSubmit(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Field label="School ID" htmlFor="schoolId">
              <input
                id="schoolId"
                type="text"
                value={schoolId}
                onChange={e => setSchoolId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
                className="avanti-input"
                style={inputStyle}
              />
            </Field>

            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@school.com"
                required
                autoComplete="email"
                className="avanti-input"
                style={inputStyle}
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="avanti-input"
                style={inputStyle}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="btn-brand"
              style={{
                marginTop:    'var(--space-2)',
                height:       46,
                background:   loading ? 'var(--color-gray-300)' : 'var(--color-brand-500)',
                color:        '#fff',
                border:       'none',
                borderRadius: 'var(--radius-md)',
                fontSize:     'var(--text-sm)',
                fontWeight:   600,
                cursor:       loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize:      'var(--text-xs)',
          fontWeight:    600,
          color:         'var(--text-secondary)',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding:      'var(--space-3) var(--space-3)',
  border:       '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-md)',
  fontSize:     'var(--text-sm)',
  background:   '#fff',
  color:        'var(--text-primary)',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
  height:       42,
};
