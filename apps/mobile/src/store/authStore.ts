// Vidyut Mobile — Auth Store (Zustand)
// Holds access token + session user. Persists to SecureStore in RN.

import { create } from 'zustand';

interface AuthUser {
  userId:   string;
  schoolId: string;
  role:     string;
  email:    string;
  name:     string;
}

interface AuthStore {
  user:        AuthUser | null;
  accessToken: string | null;

  setAuth:  (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>(set => ({
  user:        null,
  accessToken: null,

  setAuth(token, user) {
    set({ accessToken: token, user });
  },

  clearAuth() {
    set({ accessToken: null, user: null });
  },
}));
