-- Avanti — Migration 005: Add name/contact fields to staff table
-- The original staff table links to users via user_id (optional).
-- Many staff members (non-teaching, support) won't have login accounts,
-- so we store name/contact directly on the staff record.

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS first_name  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT;

-- Full-text search index on staff name + employee_id
CREATE INDEX IF NOT EXISTS staff_name_search_idx
  ON staff USING GIN (
    to_tsvector('simple', first_name || ' ' || last_name || ' ' || employee_id)
  )
  WHERE NOT is_deleted;
