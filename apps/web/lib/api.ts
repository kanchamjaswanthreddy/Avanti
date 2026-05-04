// Avanti Web — API Client Singleton
// Single AvantiApiClient instance per browser session.
// Access token held in memory only; the httpOnly refresh token cookie
// handles silent token renewal without touching localStorage.

import { AvantiApiClient } from '@avanti/api-client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

let _client: AvantiApiClient | null = null;

export function getApiClient(): AvantiApiClient {
  if (!_client) {
    _client = new AvantiApiClient({ baseUrl: API_URL });
  }
  return _client;
}

export function setAuthToken(token: string): void {
  getApiClient().setToken(token);
}

export function clearAuthToken(): void {
  getApiClient().clearToken();
}
