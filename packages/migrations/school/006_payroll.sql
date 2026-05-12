-- Avanti — Migration 006: Payroll
-- payroll_runs: one per school per month (DRAFT → FINALISED)
-- payslips:     one per staff per run, stores all computed values for audit trail
-- All monetary amounts in whole rupees (INR).

-- ── Payroll Runs ──────────────────────────────────────────────────────────────
CREATE TABLE payroll_runs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID    NOT NULL,
  month         TEXT    NOT NULL,  -- 'YYYY-MM'
  academic_year TEXT    NOT NULL,  -- '2024-25'
  working_days  INTEGER NOT NULL DEFAULT 26,
  status        TEXT    NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT', 'FINALISED')),
  created_by    UUID    NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at  TIMESTAMPTZ,
  finalized_by  UUID    REFERENCES users(id),
  UNIQUE (school_id, month)
);
CREATE INDEX payroll_runs_school_idx ON payroll_runs (school_id);

-- ── Payslips ──────────────────────────────────────────────────────────────────
CREATE TABLE payslips (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID    NOT NULL,
  payroll_run_id  UUID    NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  staff_id        UUID    NOT NULL REFERENCES staff(id),

  -- Salary inputs (can be adjusted after generation)
  basic_salary    INTEGER NOT NULL DEFAULT 0,   -- rupees/month
  paid_days       INTEGER NOT NULL DEFAULT 26,  -- days paid (≤ working_days)
  allowances      JSONB   NOT NULL DEFAULT '[]', -- [{label, amount}]

  -- Computed breakdowns (stored for audit trail)
  earned_basic    INTEGER NOT NULL DEFAULT 0,
  gross_salary    INTEGER NOT NULL DEFAULT 0,
  pf_employee     INTEGER NOT NULL DEFAULT 0,   -- 12% of basic (cap ₹15k)
  pf_employer     INTEGER NOT NULL DEFAULT 0,   -- 12% of basic (cap ₹15k)
  esi_employee    INTEGER NOT NULL DEFAULT 0,   -- 0.75% of gross (if gross < ₹21k)
  esi_employer    INTEGER NOT NULL DEFAULT 0,   -- 3.25% of gross (if gross < ₹21k)
  tds             INTEGER NOT NULL DEFAULT 0,   -- monthly TDS (annualized slabs)
  other_deductions INTEGER NOT NULL DEFAULT 0,
  total_deductions INTEGER NOT NULL DEFAULT 0,
  net_salary      INTEGER NOT NULL DEFAULT 0,

  -- Payment tracking
  status          TEXT    NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'GENERATED', 'PAID')),
  paid_at         DATE,
  payment_mode    TEXT    CHECK (payment_mode IN ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI')),
  remarks         TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (payroll_run_id, staff_id)
);
CREATE INDEX payslips_run_idx   ON payslips (payroll_run_id);
CREATE INDEX payslips_staff_idx ON payslips (school_id, staff_id);

-- Auto-update updated_at
CREATE TRIGGER trg_payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION _avanti_update_updated_at();
