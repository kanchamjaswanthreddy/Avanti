// Vidyut Web — Auth Store (Zustand)
// Holds access token + session user in memory.
// Access token set via setAuthToken() on login; cleared on logout.

import { create } from 'zustand';
import { setAuthToken, clearAuthToken } from '../lib/api';

interface AuthUser {
  id:       string;
  name:     string;
  email:    string;
  role:     string;
  schoolId: string;
}

interface AuthStore {
  user:        AuthUser | null;
  accessToken: string | null;

  setAuth:   (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>(set => ({
  user:        null,
  accessToken: null,

  setAuth(token, user) {
    setAuthToken(token);
    set({ accessToken: token, user });
  },

  clearAuth() {
    clearAuthToken();
    set({ accessToken: null, user: null });
  },
}));
