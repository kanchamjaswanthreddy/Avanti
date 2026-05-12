// Avanti — Billing Service
// Razorpay subscription management + webhook processing.
// Razorpay REST API called directly via fetch (no SDK dependency).
//
// Pricing (locked from CLAUDE.md):
//   Starter:    ₹14,999/month  | ₹12,749/month billed annually (15% off)
//   Growth:     ₹34,999/month  | ₹29,749/month billed annually
//   Enterprise: ₹74,999/month  | ₹63,749/month billed annually
//
// Webhook events handled:
//   subscription.activated  → set subscription active, set school ACTIVE
//   subscription.charged    → write invoice row
//   subscription.halted     → set past_due, write dunning event
//   subscription.cancelled  → set cancelled
//   payment.failed          → write dunning event

import { createHmac, timingSafeEqual } from 'crypto';
import type pg from 'pg';

// ── Pricing constants ─────────────────────────────────────────────────────────

export const PRICING: Record<string, Record<string, number>> = {
  starter:    { monthly: 1_499_900, annual: 12_749_00 * 12 },   // paise
  growth:     { monthly: 3_499_900, annual: 29_749_00 * 12 },
  enterprise: { monthly: 7_499_900, annual: 63_749_00 * 12 },
};

// Monthly amount used for display (annual stored as total)
export const MRR_PAISE: Record<string, Record<string, number>> = {
  starter:    { monthly: 1_499_900, annual: 1_274_900 },
  growth:     { monthly: 3_499_900, annual: 2_974_900 },
  enterprise: { monthly: 7_499_900, annual: 6_374_900 },
};

// Plan IDs are created once in Razorpay dashboard and stored in env vars
function getPlanId(tier: string, cycle: string): string {
  const key = `RAZORPAY_PLAN_${tier.toUpperCase()}_${cycle.toUpperCase()}`;
  const id  = process.env[key];
  if (!id) throw new Error(`Razorpay plan ID not configured: ${key}`);
  return id;
}

// ── Razorpay API client ────────────────────────────────────────────────────────

interface RazorpaySubscriptionResponse {
  id:        string;
  status:    string;
  short_url: string;
  plan_id:   string;
  quantity:  number;
  total_count: number;
  paid_count:  number;
  current_start: number | null;
  current_end:   number | null;
  charge_at:     number | null;
}

async function razorpayFetch<T>(
  method: string,
  path:   string,
  body?:  Record<string, unknown>
): Promise<T> {
  const keyId     = process.env['RAZORPAY_KEY_ID'];
  const keySecret = process.env['RAZORPAY_KEY_SECRET'];
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured');
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json() as T | { error: { description: string } };
  if (!res.ok) {
    const err = data as { error: { description: string } };
    throw new Error(`Razorpay API error ${res.status}: ${err.error?.description ?? res.statusText}`);
  }

  return data as T;
}

// ── Subscription management ────────────────────────────────────────────────────

export async function createSubscription(
  db:           pg.Pool,
  schoolId:     string,
  tier:         string,
  billingCycle: 'monthly' | 'annual',
  customerInfo: { name: string; email: string; contact?: string }
): Promise<{ subscriptionId: string; paymentUrl: string }> {

  const planId     = getPlanId(tier, billingCycle);
  const mrrPaise   = MRR_PAISE[tier]?.[billingCycle] ?? 0;
  const totalCount = billingCycle === 'monthly' ? 120 : 10;  // 10 years / 10 annual cycles

  // Create subscription in Razorpay
  const rzpSub = await razorpayFetch<RazorpaySubscriptionResponse>(
    'POST',
    '/subscriptions',
    {
      plan_id:     planId,
      total_count: totalCount,
      quantity:    1,
      customer_notify: 1,
      addons: [],
      notes: { schoolId, tier, billingCycle },
    }
  );

  // Upsert subscription record in our control plane DB
  await db.query(
    `INSERT INTO subscriptions
       (school_id, tier, billing_cycle, amount_paise, status, razorpay_sub_id)
     VALUES ($1, $2, $3, $4, 'active', $5)
     ON CONFLICT (school_id)
     DO UPDATE SET
       tier             = EXCLUDED.tier,
       billing_cycle    = EXCLUDED.billing_cycle,
       amount_paise     = EXCLUDED.amount_paise,
       status           = 'active',
       razorpay_sub_id  = EXCLUDED.razorpay_sub_id`,
    [schoolId, tier, billingCycle, mrrPaise, rzpSub.id]
  );

  return { subscriptionId: rzpSub.id, paymentUrl: rzpSub.short_url };
}

export async function cancelSubscription(
  db:       pg.Pool,
  schoolId: string
): Promise<void> {
  const subRes = await db.query<{ razorpay_sub_id: string | null }>(
    `SELECT razorpay_sub_id FROM subscriptions WHERE school_id = $1 AND status = 'active'`,
    [schoolId]
  );
  const rzpSubId = subRes.rows[0]?.razorpay_sub_id;
  if (!rzpSubId) throw new Error('No active subscription found');

  await razorpayFetch('POST', `/subscriptions/${rzpSubId}/cancel`, { cancel_at_cycle_end: 1 });

  await db.query(
    `UPDATE subscriptions SET status = 'cancelled' WHERE school_id = $1`,
    [schoolId]
  );
}

export async function getSubscription(
  db:       pg.Pool,
  schoolId: string
): Promise<{
  tier: string; billingCycle: string; amountPaise: number;
  status: string; currentPeriodEnd: string | null;
  razorpaySubId: string | null;
} | null> {
  const res = await db.query<{
    tier: string; billing_cycle: string; amount_paise: string;
    status: string; current_period_end: Date | null; razorpay_sub_id: string | null;
  }>(
    `SELECT tier, billing_cycle, amount_paise, status, current_period_end, razorpay_sub_id
     FROM subscriptions WHERE school_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [schoolId]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    tier:             r.tier,
    billingCycle:     r.billing_cycle,
    amountPaise:      Number(r.amount_paise),
    status:           r.status,
    currentPeriodEnd: r.current_period_end ? r.current_period_end.toISOString() : null,
    razorpaySubId:    r.razorpay_sub_id,
  };
}

export async function listInvoices(
  db:       pg.Pool,
  schoolId: string
): Promise<Array<{
  id: string; razorpayInvoiceId: string; amountPaise: number;
  status: string; paidAt: string | null; createdAt: string;
}>> {
  const res = await db.query<{
    id: string; razorpay_invoice_id: string; amount_paise: string;
    status: string; paid_at: Date | null; created_at: Date;
  }>(
    `SELECT id, razorpay_invoice_id, amount_paise, status, paid_at, created_at
     FROM invoices WHERE school_id = $1 ORDER BY created_at DESC LIMIT 24`,
    [schoolId]
  );
  return res.rows.map(r => ({
    id:               r.id,
    razorpayInvoiceId: r.razorpay_invoice_id,
    amountPaise:      Number(r.amount_paise),
    status:           r.status,
    paidAt:           r.paid_at ? r.paid_at.toISOString() : null,
    createdAt:        r.created_at.toISOString(),
  }));
}

// ── Webhook handling ──────────────────────────────────────────────────────────

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env['RAZORPAY_WEBHOOK_SECRET'];
  if (!secret) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

interface RazorpayWebhookPayload {
  id:        string;
  event:     string;
  payload:   {
    subscription?: {
      entity: {
        id:            string;
        status:        string;
        plan_id:       string;
        notes?:        { schoolId?: string };
        current_start: number | null;
        current_end:   number | null;
      };
    };
    payment?: {
      entity: {
        id:     string;
        amount: number;
        invoice_id?: string;
        subscription_id?: string;
      };
    };
  };
}

export async function handleWebhook(
  db:      pg.Pool,
  eventId: string,
  event:   string,
  payload: RazorpayWebhookPayload
): Promise<void> {
  const sub     = payload.payload.subscription?.entity;
  const payment = payload.payload.payment?.entity;

  // Extract schoolId from subscription notes
  const schoolId = sub?.notes?.schoolId;

  switch (event) {
    case 'subscription.activated': {
      if (!sub || !schoolId) break;
      const start = sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null;
      const end   = sub.current_end   ? new Date(sub.current_end   * 1000).toISOString() : null;
      await db.query(
        `UPDATE subscriptions
         SET status = 'active', current_period_start = $1, current_period_end = $2
         WHERE school_id = $3`,
        [start, end, schoolId]
      );
      // Ensure school is ACTIVE
      await db.query(
        `UPDATE schools SET status = 'ACTIVE', updated_at = now() WHERE id = $1`,
        [schoolId]
      );
      break;
    }

    case 'subscription.charged': {
      if (!sub || !payment || !schoolId) break;
      const end = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;
      // Advance period
      await db.query(
        `UPDATE subscriptions SET status = 'active', current_period_end = $1 WHERE school_id = $2`,
        [end, schoolId]
      );
      // Record invoice
      const subRes = await db.query<{ id: string }>(
        `SELECT id FROM subscriptions WHERE school_id = $1 LIMIT 1`,
        [schoolId]
      );
      const subscriptionDbId = subRes.rows[0]?.id ?? null;
      await db.query(
        `INSERT INTO invoices
           (school_id, subscription_id, razorpay_invoice_id, razorpay_payment_id, amount_paise, status, paid_at)
         VALUES ($1, $2, $3, $4, $5, 'paid', now())
         ON CONFLICT (razorpay_invoice_id) DO NOTHING`,
        [schoolId, subscriptionDbId, payment.invoice_id ?? eventId, payment.id, payment.amount]
      );
      break;
    }

    case 'subscription.halted': {
      // Razorpay halts after all retry attempts fail → dunning failure
      if (!schoolId) break;
      await db.query(
        `UPDATE subscriptions SET status = 'past_due' WHERE school_id = $1`,
        [schoolId]
      );
      const subRes = await db.query<{ id: string }>(
        `SELECT id FROM subscriptions WHERE school_id = $1 LIMIT 1`,
        [schoolId]
      );
      await db.query(
        `INSERT INTO dunning_events (school_id, subscription_id, event_type)
         VALUES ($1, $2, 'subscription_halted')`,
        [schoolId, subRes.rows[0]?.id ?? null]
      );
      break;
    }

    case 'subscription.cancelled': {
      if (!schoolId) break;
      await db.query(
        `UPDATE subscriptions SET status = 'cancelled' WHERE school_id = $1`,
        [schoolId]
      );
      break;
    }

    case 'payment.failed': {
      if (!schoolId) break;
      const subRes = await db.query<{ id: string }>(
        `SELECT id FROM subscriptions WHERE school_id = $1 LIMIT 1`,
        [schoolId]
      );
      await db.query(
        `INSERT INTO dunning_events (school_id, subscription_id, event_type)
         VALUES ($1, $2, 'payment_failed')`,
        [schoolId, subRes.rows[0]?.id ?? null]
      );
      break;
    }
  }

  // Mark webhook as processed
  await db.query(
    `UPDATE billing_webhooks SET processed = true WHERE event_id = $1`,
    [eventId]
  );
}
