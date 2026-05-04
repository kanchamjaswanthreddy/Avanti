// Vidyut API — Database connection management
// From TechnicalArchitecture_v1.docx Section 1.2
//
// In production: credentials come from GCP Secret Manager.
// In local development: credentials come from environment variables.
//
// Connection pools are cached in-process with a 5-minute TTL (as per spec).

import pg from 'pg';

const { Pool } = pg;

// ── Control Plane DB ─────────────────────────────────────────────────────────

let _controlPool: pg.Pool | null = null;

export function getControlPlanePool(): pg.Pool {
  if (!_controlPool) {
    const url = process.env['CONTROL_PLANE_DB_URL'];
    if (!url) {
      throw new Error('CONTROL_PLANE_DB_URL environment variable is required.');
    }
    _controlPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    _controlPool.on('error', (err) => {
      console.error('[db] Control Plane pool error:', err);
    });
  }
  return _controlPool;
}

// ── Per-school DB pool cache ─────────────────────────────────────────────────
// Pools cached by schoolId. TTL enforced via lastUsed timestamp.
// In production: connection strings come from GCP Secret Manager (secretId).
// In local dev: schoolId maps directly to a database name.

interface CachedPool {
  pool: pg.Pool;
  lastUsed: number;
}

const schoolPools = new Map<string, CachedPool>();
const POOL_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns a connection pool for a school's database.
 * In production: resolves credentials from GCP Secret Manager using dbSecretId.
 * In local dev: constructs connection string from DATABASE_URL + school slug.
 */
export async function getSchoolPool(
  schoolId: string,
  dbSecretId: string | null
): Promise<pg.Pool> {
  const cached = schoolPools.get(schoolId);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.pool;
  }

  const connectionString = await resolveSchoolConnectionString(schoolId, dbSecretId);
  const pool = new Pool({
    connectionString,
    max: 5,                              // per-school pool is smaller
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error(`[db] School pool error (${schoolId}):`, err);
    schoolPools.delete(schoolId); // force re-creation on next request
  });

  schoolPools.set(schoolId, { pool, lastUsed: Date.now() });
  evictStalePools();
  return pool;
}

async function resolveSchoolConnectionString(
  schoolId: string,
  dbSecretId: string | null
): Promise<string> {
  if (process.env['NODE_ENV'] === 'production') {
    if (!dbSecretId) {
      throw new Error(`School ${schoolId} has no dbSecretId — provisioning may have failed.`);
    }
    // TODO (GCP Phase): Replace with actual Secret Manager lookup
    // const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    // const client = new SecretManagerServiceClient();
    // const [version] = await client.accessSecretVersion({ name: dbSecretId });
    // return version.payload?.data?.toString() ?? '';
    throw new Error('GCP Secret Manager not configured yet. Set NODE_ENV=development for local.');
  }

  // Local development: use postgres on Docker Compose, separate DB per school
  const baseUrl = process.env['CONTROL_PLANE_DB_URL'] ??
    'postgresql://dev_user:dev_password@localhost:5432';
  const url = new URL(baseUrl);
  url.pathname = `/vidyut_school_${schoolId.replace(/-/g, '_').slice(0, 20)}`;
  return url.toString();
}

function evictStalePools(): void {
  const now = Date.now();
  for (const [id, cached] of schoolPools.entries()) {
    if (now - cached.lastUsed > POOL_TTL_MS) {
      void cached.pool.end();
      schoolPools.delete(id);
    }
  }
}
