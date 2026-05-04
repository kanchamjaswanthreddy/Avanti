// Vidyut — Canvas Selector Page
// Lists the available canvases for this school.
// Schema Canvas is the primary canvas for Phase 3.
// Role Builder and Workflow Builder are placeholders for Phase 3+.

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Canvas — Vidyut',
};

interface CanvasCard {
  id: string;
  title: string;
  description: string;
  badge?: string;
  available: boolean;
}

const CANVASES: CanvasCard[] = [
  {
    id: 'schema',
    title: 'Schema Builder',
    description: 'Design your school\'s data model visually. Add custom tables and fields that appear across all modules.',
    available: true,
  },
  {
    id: 'roles',
    title: 'Role Builder',
    description: 'Define fine-grained permissions for each role — what they can read, write, or delete across every module.',
    badge: 'Phase 3+',
    available: false,
  },
  {
    id: 'workflow',
    title: 'Workflow Automation',
    description: 'Build trigger-based automations: auto-notify parents on absence, generate fee reminders, assign approval tasks.',
    badge: 'Phase 4',
    available: false,
  },
];

export default function CanvasPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize:   'var(--text-2xl)',
            fontWeight: 'var(--font-semibold)',
            color:      'var(--text-primary)',
            margin:     0,
          }}
        >
          Canvas
        </h1>
        <p
          style={{
            fontSize:   'var(--text-sm)',
            color:      'var(--text-secondary)',
            marginTop:  'var(--space-1)',
          }}
        >
          Design your school&apos;s data model, permissions, and automations visually.
        </p>
      </div>

      {/* Canvas cards */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap:                 'var(--space-5)',
        }}
      >
        {CANVASES.map(canvas => (
          <CanvasCardItem key={canvas.id} canvas={canvas} />
        ))}
      </div>
    </div>
  );
}

function CanvasCardItem({ canvas }: { canvas: CanvasCard }) {
  const cardContent = (
    <div
      style={{
        background:   'var(--surface-card)',
        border:       `1px solid ${canvas.available ? 'var(--color-gray-200)' : 'var(--color-gray-100)'}`,
        borderRadius: 'var(--radius-lg)',
        padding:      'var(--space-6)',
        display:      'flex',
        flexDirection: 'column',
        gap:           'var(--space-4)',
        opacity:       canvas.available ? 1 : 0.6,
        cursor:        canvas.available ? 'pointer' : 'default',
        transition:    'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2
          style={{
            fontSize:   'var(--text-base)',
            fontWeight: 'var(--font-semibold)',
            color:      canvas.available ? 'var(--text-primary)' : 'var(--text-secondary)',
            margin:     0,
          }}
        >
          {canvas.title}
        </h2>
        {canvas.badge && (
          <span
            style={{
              fontSize:     'var(--text-xs)',
              fontWeight:   'var(--font-medium)',
              color:        'var(--color-accent-700)',
              background:   'var(--color-warning-light)',
              padding:      '2px var(--space-2)',
              borderRadius: 'var(--radius-full)',
              flexShrink:   0,
            }}
          >
            {canvas.badge}
          </span>
        )}
      </div>

      <p
        style={{
          fontSize:   'var(--text-sm)',
          color:      'var(--text-secondary)',
          lineHeight: 'var(--leading-relaxed)',
          margin:     0,
        }}
      >
        {canvas.description}
      </p>

      {/* CTA */}
      <div
        style={{
          fontSize:   'var(--text-sm)',
          fontWeight: 'var(--font-medium)',
          color:      canvas.available ? 'var(--color-brand-500)' : 'var(--text-muted)',
          marginTop:  'auto',
        }}
      >
        {canvas.available ? 'Open canvas →' : 'Coming soon'}
      </div>
    </div>
  );

  if (!canvas.available) return cardContent;

  return (
    <Link
      href={`/canvas/${canvas.id}`}
      style={{ textDecoration: 'none' }}
    >
      {cardContent}
    </Link>
  );
}
