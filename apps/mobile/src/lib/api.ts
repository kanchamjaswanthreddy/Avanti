// Avanti Mobile — API Client Singleton
// Wraps AvantiApiClient with token injection from authStore.

import { AvantiApiClient } from '@avanti/api-client';
import { useAuthStore } from '../store/authStore';

const API_BASE = process.env['VIDYUT_API_URL'] ?? 'http://10.0.2.2:4000'; // Android emulator localhost

let _client: AvantiApiClient | null = null;

export function getApiClient(): AvantiApiClient {
  if (!_client) {
    _client = new AvantiApiClient({ baseUrl: API_BASE });
  }
  // Always sync token from store
  const token = useAuthStore.getState().accessToken;
  if (token) _client.setToken(token);
  else _client.clearToken();
  return _client;
}
