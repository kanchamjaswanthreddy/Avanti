// Vidyut Web — API Client Singleton
// Single VidyutApiClient instance per browser session.
// Access token held in memory only; the httpOnly refresh token cookie
// handles silent token renewal without touching localStorage.

import { VidyutApiClient } from '@vidyut/api-client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

let _client: VidyutApiClient | null = null;

export function getApiClient(): VidyutApiClient {
  if (!_client) {
    _client = new VidyutApiClient({ baseUrl: API_URL });
  }
  return _client;
}

export function setAuthToken(token: string): void {
  getApiClient().setToken(token);
}

export function clearAuthToken(): void {
  getApiClient().clearToken();
}
