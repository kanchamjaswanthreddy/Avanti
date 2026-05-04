// Vidyut API — Tenant Routing Middleware
// From TechnicalArchitecture_v1.docx Section 1.2
//
// Every request to /api/v1/school/*, /api/v1/schema/*, /api/v1/canvas/*, /api/v1/ai/*
// passes through this middleware. It resolves the school from the JWT and attaches
// a tenant context (school DB + Redis connections) to req.tenantCtx.

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type pg from 'pg';
import type { Redis } from 'ioredis';
import type { PermissionSet } from '@vidyut/types';
import { getControlPlanePool, getSchoolPool } from '../lib/db.js';
import { getSchoolRedis } from '../lib/redis.js';

// ── Extend Fastify request type ───────────────────────────────────────────────

export interface TenantCtx {
  schoolId: string;
  db: pg.Pool;
  redis: Redis;
  permissions: PermissionSet;
  role: string;
  userId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenantCtx?: TenantCtx;
  }
}

// Routes that require tenant context
const TENANT_PREFIXES = [
  '/api/v1/school',
  '/api/v1/schema',
  '/api/v1/canvas',
  '/api/v1/ai',
];

const tenantPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const needsTenant = TENANT_PREFIXES.some(prefix => req.url.startsWith(prefix));
    if (!needsTenant) return;

    if (!req.session) {
      await reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
      return;
    }

    const controlDB = getControlPlanePool();

    // Look up school in Control Plane
    // ALL DB queries are scoped by school_id from JWT — never from request params
    const result = await controlDB.query<{
      id: string;
      db_secret_id: string | null;
      redis_secret_id: string | null;
      status: string;
    }>(
      `SELECT id, db_secret_id, redis_secret_id, status
       FROM schools
       WHERE id = $1`,
      [req.session.schoolId]
    );

    const school = result.rows[0];

    if (!school) {
      await reply.code(403).send({ error: 'FORBIDDEN', message: 'School not found.' });
      return;
    }

    if (school.status !== 'ACTIVE') {
      await reply.code(403).send({
        error: 'FORBIDDEN',
        message: `School account is ${school.status.toLowerCase()}.`,
      });
      return;
    }

    // Get pooled connections (cached with TTL — see db.ts and redis.ts)
    const [db, redis] = await Promise.all([
      getSchoolPool(school.id, school.db_secret_id),
      getSchoolRedis(school.id, school.redis_secret_id),
    ]);

    // Load permissions from Redis cache or DB
    const permissions = await loadPermissions(db, redis, req.session.userId, req.session.role);

    req.tenantCtx = {
      schoolId: school.id,
      db,
      redis,
      permissions,
      role:   req.session.role,
      userId: req.session.userId,
    };
  });
};

async function loadPermissions(
  db: pg.Pool,
  redis: Redis,
  userId: string,
  role: string
): Promise<PermissionSet> {
  if (role === 'SUPER_ADMIN') {
    return { roleId: 'SUPER_ADMIN', permissions: [] }; // bypasses all checks
  }

  const cacheKey = `perm:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as PermissionSet;
  }

  const result = await db.query<{ role_id: string; resource: string; actions: string[]; field_permissions: string; row_filter: string | null }>(
    `SELECT rp.role_id, rp.resource, rp.actions, rp.field_permissions, rp.row_filter
     FROM role_permissions rp
     JOIN users u ON u.role_id = rp.role_id
     WHERE u.id = $1`,
    [userId]
  );

  const permissionSet: PermissionSet = {
    roleId: result.rows[0]?.role_id ?? '',
    permissions: result.rows.map(r => {
      const perm: import('@vidyut/types').ResourcePermission = {
        resource: r.resource,
        actions: r.actions as import('@vidyut/types').ActionType[],
        fieldPermissions: JSON.parse(r.field_permissions ?? '[]') as Array<{ fieldId: string; readable: boolean; writable: boolean }>,
      };
      if (r.row_filter) perm.rowFilter = r.row_filter;
      return perm;
    }),
  };

  // Cache for 5 minutes — invalidated on role change or password reset
  await redis.setex(cacheKey, 300, JSON.stringify(permissionSet));
  return permissionSet;
}

export default fp(tenantPlugin, { name: 'tenant', dependencies: ['auth'] });
