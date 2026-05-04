// Avanti API — Fastify Application Factory
// Builds and configures the Fastify instance with all plugins and routes.

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/ratelimit.js';
import tenantPlugin from './plugins/tenant.js';
import wsPlugin from './plugins/websocket.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth/index.js';
import { schoolRoutes } from './routes/school/index.js';
import { schemaRoutes } from './routes/schema/index.js';
import { canvasRoutes } from './routes/canvas/index.js';
import { aiRoutes } from './routes/ai/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      ...(process.env['NODE_ENV'] === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
    },
    trustProxy: true, // required behind GCP Cloud Run load balancer
  });

  // ── CORS ────────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: [
      'http://localhost:3000', // web app
      'http://localhost:3001', // owner portal
      ...(process.env['ALLOWED_ORIGINS']?.split(',') ?? []),
    ],
    credentials: true,
  });

  // ── Cookies (httpOnly refresh tokens) ────────────────────────────────────────
  await app.register(cookie, {
    secret: process.env['COOKIE_SECRET'] ?? process.env['JWT_SECRET'] ?? 'avanti-dev-cookie-secret',
  });

  // ── Plugins (order matters — rate limit → auth → tenant) ────────────────────
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);
  await app.register(tenantPlugin);

  // ── WebSocket (Socket.io) ─────────────────────────────────────────────────
  await app.register(wsPlugin);

  // ── Multipart (voice uploads) ─────────────────────────────────────────────
  await app.register(import('@fastify/multipart'), {
    limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB max audio
  });

  // ── Routes ───────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes,   { prefix: '/api/v1/auth' });
  await app.register(schoolRoutes, { prefix: '/api/v1/school' });
  await app.register(schemaRoutes, { prefix: '/api/v1/schema' });
  await app.register(canvasRoutes, { prefix: '/api/v1/canvas' });
  await app.register(aiRoutes,     { prefix: '/api/v1/ai' });

  // ── Global 404 ───────────────────────────────────────────────────────────────
  app.setNotFoundHandler((_req, reply) => {
    void reply.code(404).send({ error: 'NOT_FOUND', message: 'Route not found.' });
  });

  // ── Global error handler ─────────────────────────────────────────────────────
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    const fastifyErr = err as Error & { statusCode?: number };
    const statusCode = fastifyErr.statusCode ?? 500;
    void reply.code(statusCode).send({
      error:   statusCode === 500 ? 'INTERNAL_ERROR' : fastifyErr.name,
      message: statusCode === 500 ? 'An unexpected error occurred.' : fastifyErr.message,
    });
  });

  return app;
}
