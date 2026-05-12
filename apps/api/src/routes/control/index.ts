// Avanti API — Control Plane Routes
// Internal-only. Protected by X-Internal-Key header (INTERNAL_API_KEY env var).
// Owner portal at localhost:3001 calls these.
//
// GET  /api/v1/control/stats
// GET  /api/v1/control/schools
// GET  /api/v1/control/schools/:id
// POST /api/v1/control/schools/:id/suspend
// POST /api/v1/control/schools/:id/activate
// GET  /api/v1/control/provisioning
// GET  /api/v1/control/billing

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { getControlPlanePool } from '../../lib/db.js';
import * as ctrl from '../../services/control.service.js';

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireInternalKey(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const key = process.env['INTERNAL_API_KEY'];
  if (!key) {
    return reply.code(503).send({ error: 'NOT_CONFIGURED', message: 'INTERNAL_API_KEY not set.' });
  }
  const provided = req.headers['x-internal-key'];
  if (!provided || provided !== key) {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid internal API key.' });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export const controlRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireInternalKey);

  // GET /control/stats — platform-wide KPIs
  fastify.get('/stats', async (_req, reply) => {
    const db    = getControlPlanePool();
    const stats = await ctrl.getPlatformStats(db);
    return reply.send(stats);
  });

  // GET /control/schools — list all schools
  fastify.get('/schools', async (_req, reply) => {
    const db      = getControlPlanePool();
    const schools = await ctrl.listSchools(db);
    return reply.send(schools);
  });

  // GET /control/schools/:id — school detail with subscription + provision log
  fastify.get<{ Params: { id: string } }>('/schools/:id', async (req, reply) => {
    const db     = getControlPlanePool();
    const school = await ctrl.getSchool(db, req.params.id);
    if (!school) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'School not found.' });
    }
    const [subscription, provisionLog] = await Promise.all([
      ctrl.getSchoolSubscription(db, school.id),
      ctrl.getSchoolProvisionLog(db, school.id),
    ]);
    return reply.send({ ...school, subscription, provisionLog });
  });

  // POST /control/schools/:id/suspend
  fastify.post<{ Params: { id: string } }>('/schools/:id/suspend', async (req, reply) => {
    const db = getControlPlanePool();
    const ok = await ctrl.suspendSchool(db, req.params.id);
    if (!ok) {
      return reply.code(409).send({ error: 'CONFLICT', message: 'School is not ACTIVE.' });
    }
    return reply.send({ success: true });
  });

  // POST /control/schools/:id/activate
  fastify.post<{ Params: { id: string } }>('/schools/:id/activate', async (req, reply) => {
    const db = getControlPlanePool();
    const ok = await ctrl.activateSchool(db, req.params.id);
    if (!ok) {
      return reply.code(409).send({ error: 'CONFLICT', message: 'School is not SUSPENDED.' });
    }
    return reply.send({ success: true });
  });

  // GET /control/provisioning — recent provision log across all schools
  fastify.get('/provisioning', async (_req, reply) => {
    const db  = getControlPlanePool();
    const log = await ctrl.getRecentProvisionLog(db, 30);
    return reply.send(log);
  });

  // GET /control/billing — subscriptions + MRR/ARR summary
  fastify.get('/billing', async (_req, reply) => {
    const db = getControlPlanePool();
    const [stats, subs] = await Promise.all([
      ctrl.getPlatformStats(db),
      ctrl.listSubscriptions(db),
    ]);
    return reply.send({ stats, subscriptions: subs });
  });
};
