// Avanti API — Rate Limiting
// From TechnicalArchitecture_v1.docx Section 6.2

import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Rate limits per endpoint type:
// Standard routes:      100 req/min per user, 1000 req/min per school
// Schema change:         10 req/min per user
// AI agent:              30 req/min per user
// Auth endpoints:        10 req/min per IP
// File upload:            5 req/min per user
// Report generation:      5 req/min per user

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(import('@fastify/rate-limit'), {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      // Rate limit by user ID if authenticated, otherwise by IP
      const session = (req as unknown as { session?: { userId?: string } }).session;
      return session?.userId ?? req.ip;
    },
    errorResponseBuilder: () => ({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
    }),
  });
};

export default fp(rateLimitPlugin, { name: 'ratelimit' });
