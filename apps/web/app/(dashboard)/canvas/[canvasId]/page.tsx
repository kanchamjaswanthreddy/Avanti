// Vidyut — Canvas Editor Page
// Server component: validates canvasId, renders CanvasEditor client component.
// Data fetching happens in the client (requires auth token in memory).

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CanvasEditor } from '../../../../components/canvas/CanvasEditor';

interface PageProps {
  params: Promise<{ canvasId: string }>;
}

const VALID_CANVAS_IDS = new Set(['schema', 'roles', 'workflow']);

const CANVAS_TITLES: Record<string, string> = {
  schema:   'Schema Builder',
  roles:    'Role Builder',
  workflow: 'Workflow Automation',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { canvasId } = await params;
  const title = CANVAS_TITLES[canvasId] ?? 'Canvas';
  return { title: `${title} — Vidyut` };
}

export default async function CanvasEditorPage({ params }: PageProps) {
  const { canvasId } = await params;

  if (!VALID_CANVAS_IDS.has(canvasId)) {
    notFound();
  }

  const title = CANVAS_TITLES[canvasId] ?? canvasId;

  return (
    <div
      style={{
        position: 'fixed',
        inset:    0,
        // Bypass dashboard padding — canvas fills viewport
        marginLeft: 'var(--sidebar-width)',
        marginTop:  'var(--topbar-height)',
        display:    'flex',
        flexDirection: 'column',
        background: 'var(--surface-page)',
        overflow:   'hidden',
      }}
    >
      <CanvasEditor
        canvasId={canvasId}
        title={title}
      />
    </div>
  );
}
