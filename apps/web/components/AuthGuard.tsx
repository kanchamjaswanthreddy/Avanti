'use client';

// Avanti — Auth Guard
// Client component that redirects unauthenticated users to /login.
// Used in the dashboard layout.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router      = useRouter();
  const accessToken = useAuthStore(s => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    }
  }, [accessToken, router]);

  if (!accessToken) {
    // Render nothing while redirect is in flight
    return null;
  }

  return <>{children}</>;
}
