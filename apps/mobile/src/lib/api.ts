// Vidyut Mobile — API Client Singleton
// Wraps VidyutApiClient with token injection from authStore.

import { VidyutApiClient } from '@vidyut/api-client';
import { useAuthStore } from '../store/authStore';

const API_BASE = process.env['VIDYUT_API_URL'] ?? 'http://10.0.2.2:4000'; // Android emulator localhost

let _client: VidyutApiClient | null = null;

export function getApiClient(): VidyutApiClient {
  if (!_client) {
    _client = new VidyutApiClient({ baseUrl: API_BASE });
  }
  // Always sync token from store
  const token = useAuthStore.getState().accessToken;
  if (token) _client.setToken(token);
  else _client.clearToken();
  return _client;
}
