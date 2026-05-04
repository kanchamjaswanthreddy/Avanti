-- Avanti School Core Schema — Migration 001
-- Runs against each school's isolated PostgreSQL database (NOT the control plane).
-- Called by: tools/provision-local.ts during school setup.
--
-- IMPORTANT: _migration_history must be created first so the migration
--            runner can record this migration within the same transaction.

-- ── Migration Tracking ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _migration_history (
  version    INTEGER     PRIMARY KEY,
  name       TEXT        NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Roles ─────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID    NOT NULL,
  name       TEXT    NOT NULL,
  is_system  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX roles_school_name_idx ON roles (school_id, name);

-- ── Role Permissions ──────────────────────────────────────────────────────────
CREATE TABLE role_permissions (
  id                UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id           UUID   NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource          TEXT   NOT NULL,
  actions           TEXT[] NOT NULL DEFAULT '{}',
  field_permissions JSONB  NOT NULL DEFAULT '[]',
  row_filter        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, resource)
);
CREATE INDEX role_permissions_role_id_idx ON role_permissions (role_id);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role_id       UUID REFERENCES roles(id),
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_school_email_idx ON users (school_id, email);
CREATE INDEX        users_school_id_idx    ON users (school_id);
CREATE INDEX        users_role_id_idx      ON users (role_id);

-- ── Refresh Tokens (30-day rotating with family tracking) ─────────────────────
CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  token_family UUID NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at   TIMESTAMPTZ
);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_idx  ON refresh_tokens (token_family);

-- ── Password Reset Tokens (1-hour TTL) ───────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX prt_user_id_idx ON password_reset_tokens (user_id);

-- ── Classes ───────────────────────────────────────────────────────────────────
CREATE TABLE classes (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID    NOT NULL,
  name          TEXT    NOT NULL,
  section       TEXT,
  academic_year TEXT    NOT NULL,
  grade_level   INTEGER,
  teacher_id    UUID    REFERENCES users(id),
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX classes_school_year_idx ON classes (school_id, academic_year) WHERE NOT is_deleted;

-- ── Students ──────────────────────────────────────────────────────────────────
CREATE TABLE students (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID    NOT NULL,
  class_id         UUID    REFERENCES classes(id),
  admission_number TEXT    NOT NULL,
  first_name       TEXT    NOT NULL,
  last_name        TEXT    NOT NULL,
  date_of_birth    DATE,
  gender           TEXT    CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  parent_name      TEXT,
  parent_phone     TEXT,
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX students_admission_idx    ON students (school_id, admission_number) WHERE NOT is_deleted;
CREATE INDEX        students_school_idx       ON students (school_id)  WHERE NOT is_deleted;
CREATE INDEX        students_class_idx        ON students (class_id)   WHERE NOT is_deleted;
CREATE INDEX        students_name_search_idx  ON students
  USING gin(to_tsvector('simple', first_name || ' ' || last_name || ' ' || admission_number))
  WHERE NOT is_deleted;

-- ── Staff ─────────────────────────────────────────────────────────────────────
CREATE TABLE staff (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID    NOT NULL,
  user_id       UUID    REFERENCES users(id),
  employee_id   TEXT    NOT NULL,
  designation   TEXT    NOT NULL,
  department    TEXT,
  joining_date  DATE,
  basic_salary  INTEGER NOT NULL DEFAULT 0,
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX staff_school_employee_idx ON staff (school_id, employee_id) WHERE NOT is_deleted;
CREATE INDEX        staff_school_idx          ON staff (school_id) WHERE NOT is_deleted;

-- ── Attendance ────────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL,
  class_id   UUID NOT NULL REFERENCES classes(id),
  student_id UUID NOT NULL REFERENCES students(id),
  date       DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE')),
  marked_by  UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id, date)
);
CREATE INDEX attendance_class_date_idx   ON attendance (school_id, class_id, date);
CREATE INDEX attendance_student_date_idx ON attendance (school_id, student_id, date);

-- ── Fee Structures ────────────────────────────────────────────────────────────
CREATE TABLE fee_structures (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID    NOT NULL,
  name           TEXT    NOT NULL,
  academic_year  TEXT    NOT NULL,
  total_amount   INTEGER NOT NULL,
  installments   INTEGER NOT NULL DEFAULT 1,
  late_fee_type  TEXT    CHECK (late_fee_type IN ('FLAT', 'PERCENTAGE')),
  late_fee_value INTEGER,
  is_deleted     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX fee_structures_school_year_idx ON fee_structures (school_id, academic_year) WHERE NOT is_deleted;

-- ── Fee Structure Line Items ──────────────────────────────────────────────────
CREATE TABLE fee_structure_items (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID    NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  label            TEXT    NOT NULL,
  amount           INTEGER NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX fsi_structure_idx ON fee_structure_items (fee_structure_id);

-- ── Fee Collections (payments) ────────────────────────────────────────────────
CREATE TABLE fee_collections (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID    NOT NULL,
  student_id       UUID    NOT NULL REFERENCES students(id),
  fee_structure_id UUID    NOT NULL REFERENCES fee_structures(id),
  installment_no   INTEGER NOT NULL DEFAULT 1,
  amount_paid      INTEGER NOT NULL,
  payment_date     DATE    NOT NULL DEFAULT CURRENT_DATE,
  payment_mode     TEXT    NOT NULL DEFAULT 'CASH'
                     CHECK (payment_mode IN ('CASH', 'CHEQUE', 'ONLINE', 'DD')),
  receipt_number   TEXT    NOT NULL UNIQUE,
  remarks          TEXT,
  recorded_by      UUID    NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX fc_school_student_idx   ON fee_collections (school_id, student_id);
CREATE INDEX fc_school_structure_idx ON fee_collections (school_id, fee_structure_id);

-- ── Timetable Slots ───────────────────────────────────────────────────────────
CREATE TABLE timetable_slots (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID    NOT NULL,
  class_id      UUID    NOT NULL REFERENCES classes(id),
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_number INTEGER NOT NULL,
  start_time    TIME    NOT NULL,
  end_time      TIME    NOT NULL,
  subject       TEXT    NOT NULL,
  teacher_id    UUID    REFERENCES users(id),
  room          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, class_id, day_of_week, period_number),
  CONSTRAINT valid_slot_time CHECK (start_time < end_time)
);
CREATE INDEX timetable_class_day_idx ON timetable_slots (school_id, class_id, day_of_week);
-- Prevent teacher double-booking at the same time on the same day
CREATE UNIQUE INDEX timetable_teacher_clash_idx
  ON timetable_slots (school_id, teacher_id, day_of_week, start_time)
  WHERE teacher_id IS NOT NULL;

-- ── Counters (receipt numbers, admission numbers, etc.) ───────────────────────
CREATE TABLE counters (
  id            UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID   NOT NULL,
  name          TEXT   NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 0,
  UNIQUE (school_id, name)
);

-- ── Meta-Schema Registry (single row per school, updated by SME in Phase 3) ──
CREATE TABLE _meta_schema (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID    NOT NULL UNIQUE,
  schema_json JSONB   NOT NULL DEFAULT '{"tables":[]}',
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES users(id)
);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _avanti_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'role_permissions', 'users', 'classes', 'students',
    'staff', 'attendance', 'fee_structures', 'timetable_slots'
  ]) LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION _avanti_update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
