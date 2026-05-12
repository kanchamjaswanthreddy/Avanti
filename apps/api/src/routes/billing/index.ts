// Avanti API — Billing Webhook Routes
// POST /api/v1/billing/webhook — Razorpay webhook (no auth, HMAC-verified)
//
// This plugin scopes a raw-body content-type parser so the HMAC signature
// can be verified against the exact bytes Razorpay signed.
// It is intentionally separate from /api/v1/school/* (which requires JWT auth).

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { getControlPlanePool } from '../../lib/db.js';
import {
  verifyWebhookSignature,
  handleWebhook,
} from '../../services/billing.service.js';

interface RawBodyRequest extends FastifyRequest {
  rawBody?: string;
}

interface RazorpayWebhookPayload {
  id:      string;
  event:   string;
  payload: Record<string, unknown>;
}

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  // Capture raw body for HMAC verification — scoped to this plugin only.
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req: RawBodyRequest, body, done) => {
      req.rawBody = body as string;
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // POST /billing/webhook
  fastify.post<{ Body: RazorpayWebhookPayload }>(
    '/webhook',
    async (req, reply) => {
      const rawReq = req as RawBodyRequest;
      const signature = req.headers['x-razorpay-signature'];

      if (!signature || typeof signature !== 'string') {
        return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Missing signature header.' });
      }

      if (!rawReq.rawBody || !verifyWebhookSignature(rawReq.rawBody, signature)) {
        req.log.warn('Razorpay webhook signature verification failed');
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Signature mismatch.' });
      }

      const { id: eventId, event, payload } = req.body;

      if (!eventId || !event) {
        return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Malformed webhook payload.' });
      }

      const db = getControlPlanePool();

      // Check for duplicate — idempotency guard
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM billing_webhooks WHERE event_id = $1`,
        [eventId]
      );

      if (existing.rows.length > 0) {
        // Already processed — return 200 so Razorpay stops retrying
        req.log.info({ eventId }, 'Duplicate webhook received — skipping');
        return reply.send({ received: true });
      }

      // Extract schoolId from payload for logging (best-effort)
      const schoolId = (payload as {
        subscription?: { entity?: { notes?: { schoolId?: string } } }
      }).subscription?.entity?.notes?.schoolId ?? null;

      // Log the webhook
      await db.query(
        `INSERT INTO billing_webhooks (event_id, event_type, school_id, payload)
         VALUES ($1, $2, $3::uuid, $4)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, event, schoolId, JSON.stringify(payload)]
      );

      // Process asynchronously — always return 200 to Razorpay
      // If processing fails, error is recorded in billing_webhooks.error
      setImmediate(async () => {
        try {
          await handleWebhook(
            db,
            eventId,
            event,
            { id: eventId, event, payload } as Parameters<typeof handleWebhook>[3]
          );
        } catch (err) {
          req.log.error({ eventId, event, err }, 'Webhook processing failed');
          await db.query(
            `UPDATE billing_webhooks SET error = $1 WHERE event_id = $2`,
            [(err as Error).message, eventId]
          ).catch(() => {/* best effort */});
        }
      });

      return reply.send({ received: true });
    }
  );
};
