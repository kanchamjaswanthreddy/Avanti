-- Avanti School Schema — Migration 004
-- Adds the `edges` column to canvas_snapshots for existing schools.
-- New schools already have it in 002_canvas.sql.
-- Stores CanvasEdge[] — the FK relationship arrows drawn on the schema canvas.

ALTER TABLE canvas_snapshots
  ADD COLUMN IF NOT EXISTS edges JSONB NOT NULL DEFAULT '[]';
