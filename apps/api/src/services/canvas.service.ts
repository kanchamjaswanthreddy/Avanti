// Avanti API — Canvas Service
// Saves and loads canvas node positions (layout only).
// Schema data lives in _meta_schema; this stores WHERE nodes are positioned.

import type pg from 'pg';
import type { CanvasLayout } from '@avanti/types';

export async function loadCanvasLayout(
  db: pg.Pool,
  schoolId: string,
  canvasId: string
): Promise<CanvasLayout | null> {
  const result = await db.query<{
    positions: Record<string, { x: number; y: number }>;
    edges: import('@avanti/types').CanvasEdge[];
    saved_at: Date;
    saved_by: string;
  }>(
    `SELECT positions, edges, saved_at, saved_by
     FROM canvas_snapshots
     WHERE school_id = $1 AND canvas_id = $2`,
    [schoolId, canvasId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const positions = typeof row.positions === 'string'
    ? (JSON.parse(row.positions) as Record<string, { x: number; y: number }>)
    : row.positions;

  const edges = typeof row.edges === 'string'
    ? (JSON.parse(row.edges) as import('@avanti/types').CanvasEdge[])
    : (row.edges ?? []);

  return {
    canvasId,
    schoolId,
    positions,
    edges,
    savedAt:  row.saved_at.toISOString(),
    savedBy:  row.saved_by,
  };
}

export async function saveCanvasLayout(
  db: pg.Pool,
  schoolId: string,
  layout: CanvasLayout,
  savedBy: string
): Promise<CanvasLayout> {
  const edges = layout.edges ?? [];

  const result = await db.query<{ saved_at: Date }>(
    `INSERT INTO canvas_snapshots (school_id, canvas_id, positions, edges, saved_by)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
     ON CONFLICT (school_id, canvas_id)
     DO UPDATE SET
       positions = EXCLUDED.positions,
       edges     = EXCLUDED.edges,
       saved_at  = now(),
       saved_by  = EXCLUDED.saved_by
     RETURNING saved_at`,
    [schoolId, layout.canvasId, JSON.stringify(layout.positions), JSON.stringify(edges), savedBy]
  );

  const savedAt = result.rows[0]?.saved_at;
  return {
    ...layout,
    edges,
    savedAt: savedAt?.toISOString() ?? new Date().toISOString(),
    savedBy,
  };
}
