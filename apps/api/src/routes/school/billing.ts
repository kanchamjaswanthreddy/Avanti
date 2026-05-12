// Avanti API — School Billing Routes
// GET  /api/v1/school/billing            — current subscription
// POST /api/v1/school/billing/subscribe  — create subscription → returns Razorpay payment URL
// POST /api/v1/school/billing/cancel     — cancel at cycle end
// GET  /api/v1/school/billing/invoices   — last 24 invoices
//
// All routes are school-scoped (JWT auth required, schoolId from tenantCtx).
// Subscription data lives in the control plane DB — getControlPlanePool() used directly.

import type { FastifyPluginAsync } from 'fastify';
import { checkPermission } from '../../plugins/auth.js';
import { getControlPlanePool } from '../../lib/db.js';
import * as billing from '../../services/billing.service.js';

export const schoolBillingRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /billing — current subscription
  fastify.get(
    '/',
    { preHandler: [checkPermission('billing', 'READ')] },
    async (req, reply) => {
      const { schoolId } = req.tenantCtx!;
      const db = getControlPlanePool();
      const sub = await billing.getSubscription(db, schoolId);
      if (!sub) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'No subscription found.' });
      }
      return reply.send(sub);
    }
  );

  // POST /billing/subscribe — create a new Razorpay subscription
  fastify.post<{
    Body: {
      tier:         'starter' | 'growth' | 'enterprise';
      billingCycle: 'monthly' | 'annual';
      customerName:    string;
      customerEmail:   string;
      customerContact?: string;
    };
  }>(
    '/subscribe',
    {
      preHandler: [checkPermission('billing', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['tier', 'billingCycle', 'customerName', 'customerEmail'],
          properties: {
            tier:             { type: 'string', enum: ['starter', 'growth', 'enterprise'] },
            billingCycle:     { type: 'string', enum: ['monthly', 'annual'] },
            customerName:     { type: 'string', minLength: 1, maxLength: 200 },
            customerEmail:    { type: 'string', format: 'email' },
            customerContact:  { type: 'string', maxLength: 20 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { schoolId } = req.tenantCtx!;
      const { tier, billingCycle, customerName, customerEmail, customerContact } = req.body;

      const db = getControlPlanePool();

      // Prevent duplicate subscriptions
      const existing = await billing.getSubscription(db, schoolId);
      if (existing && existing.status === 'active') {
        return reply.code(409).send({
          error: 'CONFLICT',
          message: 'School already has an active subscription. Cancel it before subscribing to a new plan.',
        });
      }

      const result = await billing.createSubscription(
        db,
        schoolId,
        tier,
        billingCycle,
        {
          name:    customerName,
          email:   customerEmail,
          ...(customerContact ? { contact: customerContact } : {}),
        }
      );

      return reply.code(201).send(result);
    }
  );

  // POST /billing/cancel — cancel at end of billing cycle
  fastify.post(
    '/cancel',
    { preHandler: [checkPermission('billing', 'CREATE')] },
    async (req, reply) => {
      const { schoolId } = req.tenantCtx!;
      const db = getControlPlanePool();

      try {
        await billing.cancelSubscription(db, schoolId);
        return reply.send({ success: true, message: 'Subscription will cancel at the end of the current billing cycle.' });
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'No active subscription found') {
          return reply.code(404).send({ error: 'NOT_FOUND', message: msg });
        }
        throw err;
      }
    }
  );

  // GET /billing/invoices — last 24 invoices
  fastify.get(
    '/invoices',
    { preHandler: [checkPermission('billing', 'READ')] },
    async (req, reply) => {
      const { schoolId } = req.tenantCtx!;
      const db = getControlPlanePool();
      const invoices = await billing.listInvoices(db, schoolId);
      return reply.send(invoices);
    }
  );
};
