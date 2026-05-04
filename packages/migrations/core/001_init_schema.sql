-- Version:     001
-- Author:      engineering@vidyut.in
-- Description: Initial Control Plane schema — schools, subscriptions, provision_log
-- Rollback:    001_init_schema.rollback.sql
--
-- This migration applies to the CONTROL PLANE database only.
-- It does NOT run against school data plane databases.

-- ── Migration history tracker ───────────────────────────────────────────────
-- Every database (Control Plane + each school DB) has this table.
-- The migration runner checks this before applying any migration.
CREATE TABLE IF NOT EXISTS _migration_history (
  id          SERIAL       PRIMARY KEY,
  version     INTEGER      NOT NULL UNIQUE,
  name        TEXT         NOT NULL,
  applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Schools registry ────────────────────────────────────────────────────────
-- One row per subscribed school.
-- The Control Plane never stores school academic or financial data —
-- only operational metadata about the school's cloud resources.
CREATE TABLE schools (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT         NOT NULL,
  slug              TEXT         NOT NULL UNIQUE,  -- url-safe: 'delhi-public-school'
  tier              TEXT         NOT NULL CHECK (tier IN ('starter', 'growth', 'enterprise')),
  status            TEXT         NOT NULL DEFAULT 'PROVISIONING'
                                 CHECK (status IN ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'CANCELLED')),
  region            TEXT         NOT NULL DEFAULT 'asia-south1',
  db_secret_id      TEXT,        -- GCP Secret Manager key for school DB credentials
  redis_secret_id   TEXT,        -- GCP Secret Manager key for school Redis credentials
  storage_bucket    TEXT,        -- GCP Cloud Storage bucket name
  db_instance_id    TEXT,        -- GCP Cloud SQL instance name
  provisioned_at    TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_schools_status ON schools(status);
CREATE INDEX idx_schools_tier   ON schools(tier);
CREATE INDEX idx_schools_slug   ON schools(slug);

-- ── Provisioning event log ──────────────────────────────────────────────────
-- Audit trail for every step in the provisioning pipeline.
-- See TechnicalArchitecture_v1.docx Section 3 for the full state machine.
CREATE TABLE provision_log (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID         NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  event      TEXT         NOT NULL
             CHECK (event IN ('STARTED', 'DB_READY', 'REDIS_READY', 'STORAGE_READY',
                              'SEEDED', 'ADMIN_CREATED', 'COMPLETE', 'FAILED')),
  payload    JSONB,        -- event-specific metadata
  error      TEXT,         -- null unless event = 'FAILED'
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_provision_log_school ON provision_log(school_id);
CREATE INDEX idx_provision_log_event  ON provision_log(event);

-- ── Subscriptions ───────────────────────────────────────────────────────────
-- Billing records. Amounts stored in paise (1 INR = 100 paise).
CREATE TABLE subscriptions (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID         NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  tier                  TEXT         NOT NULL CHECK (tier IN ('starter', 'growth', 'enterprise')),
  billing_cycle         TEXT         NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_paise          BIGINT       NOT NULL CHECK (amount_paise > 0),
  status                TEXT         NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled')),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  razorpay_sub_id       TEXT,        -- Razorpay subscription ID
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_school ON subscriptions(school_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ── Pricing reference ───────────────────────────────────────────────────────
-- Locked pricing from SchoolPlatform_Brainstorm_v1.docx Section 16.1
-- Starter: ₹14,999/month  → 1,499,900 paise
-- Growth:  ₹34,999/month  → 3,499,900 paise
-- Enterprise: ₹74,999/month → 7,499,900 paise
-- Annual: 15% discount applied at billing service level
