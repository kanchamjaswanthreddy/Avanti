-- Vidyut School Canvas Schema — Migration 002
-- Canvas layout storage and schema change audit log.
-- canvas_snapshots: stores node positions only (schema data is in _meta_schema)
-- _schema_change_log: immutable audit trail of every schema change applied

-- ── Canvas Layout (node positions) ───────────────────────────────────────────
-- Stores WHERE nodes are on the canvas, not WHAT they contain (that's _meta_schema).
CREATE TABLE canvas_snapshots (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID  NOT NULL,
  canvas_id   TEXT  NOT NULL,  -- 'schema' | 'role' | custom
  positions   JSONB NOT NULL DEFAULT '{}',  -- Record<tableId, {x, y}>
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_by    UUID NOT NULL REFERENCES users(id),
  UNIQUE (school_id, canvas_id)  -- one layout per canvas per school
);
CREATE INDEX canvas_snapshots_school_idx ON canvas_snapshots (school_id);

-- ── Schema Change Audit Log (immutable) ──────────────────────────────────────
-- Every batch of schema changes applied via the SME is recorded here.
CREATE TABLE _schema_change_log (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID    NOT NULL,
  changes_json JSONB   NOT NULL,   -- SchemaChangeDescriptor[]
  version      INTEGER NOT NULL,   -- meta-schema version AFTER this change
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by   TEXT    NOT NULL    -- userId
);
CREATE INDEX scl_school_idx   ON _schema_change_log (school_id);
CREATE INDEX scl_version_idx  ON _schema_change_log (school_id, version);
