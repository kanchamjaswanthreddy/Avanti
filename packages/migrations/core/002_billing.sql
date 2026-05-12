-- Version:     002
-- Description: Billing — webhook event log + invoice records
-- Depends on:  001_init_schema.sql (schools, subscriptions tables)
--
-- Webhooks: idempotent log of every Razorpay event received.
-- Invoices: one row per successful charge cycle.

-- ── Webhook event log ───────────────────────────────────────────────────────
-- Stores every Razorpay webhook payload for auditing + replay safety.
-- event_id is Razorpay's unique ID — used for idempotency (do not process twice).
CREATE TABLE IF NOT EXISTS billing_webhooks (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT         NOT NULL UNIQUE,   -- razorpay "id" field from payload
  event_type  TEXT         NOT NULL,          -- e.g. 'subscription.charged'
  school_id   UUID         REFERENCES schools(id) ON DELETE SET NULL,
  payload     JSONB        NOT NULL,
  processed   BOOLEAN      NOT NULL DEFAULT false,
  error       TEXT,                           -- set if processing failed
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_school     ON billing_webhooks(school_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON billing_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed  ON billing_webhooks(processed) WHERE NOT processed;

-- ── Invoices ────────────────────────────────────────────────────────────────
-- One row per subscription charge cycle. Written by the webhook handler
-- when event_type = 'subscription.charged'.
CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID         NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subscription_id     UUID         REFERENCES subscriptions(id) ON DELETE SET NULL,
  razorpay_invoice_id TEXT         NOT NULL UNIQUE,
  razorpay_payment_id TEXT,
  amount_paise        BIGINT       NOT NULL CHECK (amount_paise > 0),
  status              TEXT         NOT NULL CHECK (status IN ('paid', 'failed', 'refunded')),
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_school   ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sub      ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);

-- ── Dunning log ─────────────────────────────────────────────────────────────
-- Tracks payment retries when a subscription goes past_due.
CREATE TABLE IF NOT EXISTS dunning_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID         NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subscription_id UUID         REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_type      TEXT         NOT NULL,   -- 'payment_failed' | 'subscription_halted' | 'subscription_resumed'
  attempt_count   INTEGER      NOT NULL DEFAULT 1,
  next_retry_at   TIMESTAMPTZ,
  resolved        BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_school    ON dunning_events(school_id);
CREATE INDEX IF NOT EXISTS idx_dunning_resolved  ON dunning_events(resolved) WHERE NOT resolved;

INSERT INTO _migration_history (version, name) VALUES (2, '002_billing')
  ON CONFLICT (version) DO NOTHING;
