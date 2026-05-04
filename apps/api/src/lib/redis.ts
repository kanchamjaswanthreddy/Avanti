// Vidyut API — Redis client management
// From TechnicalArchitecture_v1.docx Section 1.2

import { Redis } from 'ioredis';

// ── Shared Redis for Control Plane (sessions, global queues) ─────────────────

let _controlRedis: Redis | null = null;

export function getControlRedis(): Redis {
  if (!_controlRedis) {
    const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    _controlRedis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    _controlRedis.on('error', (err: Error) => {
      console.error('[redis] Control Redis error:', err);
    });
  }
  return _controlRedis;
}

// ── Per-school Redis clients ─────────────────────────────────────────────────
// In production: separate Redis per school (from Secret Manager).
// In local dev: same Redis, different key prefixes.

const schoolClients = new Map<string, Redis>();

export async function getSchoolRedis(
  schoolId: string,
  redisSecretId: string | null
): Promise<Redis> {
  const cached = schoolClients.get(schoolId);
  if (cached) return cached;

  const url = await resolveSchoolRedisUrl(schoolId, redisSecretId);

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    keyPrefix: `school:${schoolId}:`,  // namespace isolation in local dev
    lazyConnect: true,
  });

  client.on('error', (err: Error) => {
    console.error(`[redis] School client error (${schoolId}):`, err);
  });

  schoolClients.set(schoolId, client);
  return client;
}

async function resolveSchoolRedisUrl(
  schoolId: string,
  redisSecretId: string | null
): Promise<string> {
  if (process.env['NODE_ENV'] === 'production') {
    if (!redisSecretId) {
      throw new Error(`School ${schoolId} has no redisSecretId.`);
    }
    // TODO (GCP Phase): GCP Secret Manager lookup
    throw new Error('GCP Secret Manager not configured yet.');
  }
  // Local: same Redis instance, key prefix provides isolation
  return process.env['REDIS_URL'] ?? 'redis://localhost:6379';
}
