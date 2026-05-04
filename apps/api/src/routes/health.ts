// Vidyut API — Health Check Route
// GET /api/v1/health

import type { FastifyPluginAsync } from 'fastify';
import { getControlPlanePool } from '../lib/db.js';
import { getControlRedis } from '../lib/redis.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/v1/health', {
    config: { rateLimit: { max: 300, timeWindow: '1 minute' } },
  }, async (_req, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    // Check Control Plane DB
    try {
      await getControlPlanePool().query('SELECT 1');
      checks['db'] = 'ok';
    } catch {
      checks['db'] = 'error';
    }

    // Check Redis
    try {
      await getControlRedis().ping();
      checks['redis'] = 'ok';
    } catch {
      checks['redis'] = 'error';
    }

    const allHealthy = Object.values(checks).every(v => v === 'ok');

    return reply.code(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ok' : 'degraded',
      version: process.env['npm_package_version'] ?? '0.1.0',
      env: process.env['NODE_ENV'] ?? 'development',
      checks,
    });
  });
};
