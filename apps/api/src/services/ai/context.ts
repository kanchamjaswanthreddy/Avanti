// Vidyut AI — Context Builder
// From TechnicalArchitecture_v1.docx Section 8
//
// Assembles the system prompt for each request:
//   school name + user profile + permission summary + meta-schema
//
// The meta-schema section gives the agent awareness of all tables/fields
// it can query or modify, filtered to what the user is allowed to see.

import type pg from 'pg';
import { getMetaSchema } from '@vidyut/schema-engine';
import type { PermissionSet, MetaSchema } from '@vidyut/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentContext {
  db:          pg.Pool;
  schoolId:    string;
  userId:      string;
  role:        string;
  permissions: PermissionSet;
  screen?:     string;   // current page the user is on (e.g. "students", "attendance")
}

// ── System prompt builder ─────────────────────────────────────────────────────

export async function buildSystemPrompt(ctx: AgentContext): Promise<string> {
  const [schoolInfo, userInfo, metaSchema] = await Promise.all([
    getSchoolInfo(ctx.db, ctx.schoolId),
    getUserInfo(ctx.db, ctx.schoolId, ctx.userId),
    getMetaSchema(ctx.db, ctx.schoolId),
  ]);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const screenSection = ctx.screen
    ? `\n## Current Screen\nThe user is currently on the **${screenLabel(ctx.screen)}** page.\n`
    : '';

  return `You are Vidyut AI, an intelligent assistant for ${schoolInfo.name}.

## Context
- User: ${userInfo.name} (${ctx.role.replace(/_/g, ' ')})
- Today: ${today} (IST)
- School ID: ${ctx.schoolId}
${screenSection}
## Permissions
${buildPermissionSummary(ctx.permissions, ctx.role)}

## School Data Model (v${metaSchema.version})
${buildSchemaSection(metaSchema)}

## Behaviour
- Be concise and professional; answer in the language the user writes in
- Format money as ₹ with Indian number system (₹1,00,000 = one lakh)
- Academic year runs April–March
- When showing tabular data (3+ rows), use markdown tables
- Proactively use tools to fetch live data rather than saying "I don't have access"
- Never expose raw SQL, table UUIDs, or internal system fields
- Do not hallucinate data — if you're uncertain, query first`.trim();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSchoolInfo(db: pg.Pool, schoolId: string): Promise<{ name: string }> {
  try {
    // Stored in app_settings if configured, otherwise fall back to schoolId prefix
    const r = await db.query<{ name: string }>(
      `SELECT COALESCE(
         (SELECT value FROM app_settings WHERE key = 'school_name' AND school_id = $1 LIMIT 1),
         'Your School'
       ) AS name`,
      [schoolId]
    );
    return { name: r.rows[0]?.name ?? 'Your School' };
  } catch {
    return { name: 'Your School' };
  }
}

async function getUserInfo(db: pg.Pool, schoolId: string, userId: string): Promise<{ name: string }> {
  try {
    const r = await db.query<{ name: string }>(
      'SELECT name FROM users WHERE id = $1 AND school_id = $2 LIMIT 1',
      [userId, schoolId]
    );
    return { name: r.rows[0]?.name ?? 'User' };
  } catch {
    return { name: 'User' };
  }
}

function buildPermissionSummary(permissions: PermissionSet, role: string): string {
  if (role === 'SUPER_ADMIN') return '- Full access to all school data and settings';

  if (permissions.permissions.length === 0) {
    return '- No explicit permissions configured';
  }

  return permissions.permissions
    .map(p => `- ${p.resource}: ${p.actions.join(', ')}`)
    .join('\n');
}

// Maps raw pathname / screen keys to human-readable labels
function screenLabel(screen: string): string {
  const MAP: Record<string, string> = {
    students:    'Students List',
    attendance:  'Attendance',
    fees:        'Fee Management',
    timetable:   'Timetable',
    canvas:      'Schema Builder',
    dashboard:   'Dashboard',
    '/':         'Dashboard',
    '/students': 'Students List',
    '/attendance': 'Attendance',
    '/fees':     'Fee Management',
    '/timetable': 'Timetable',
  };
  // Strip leading slash + trailing segments: "/students/abc123" → "students"
  const key = screen.replace(/^\//, '').split('/')[0] ?? screen;
  return MAP[key] ?? MAP[screen] ?? screen;
}

function buildSchemaSection(meta: MetaSchema): string {
  const tables = meta.tables.filter(t => !t.isHidden);
  if (tables.length === 0) return 'No tables defined yet.';

  return tables.map(t => {
    const fields = t.fields
      .filter(f => !f.isHidden)
      .map(f => `${f.columnName}:${f.type}`)
      .join(', ');
    return `- ${t.tableName} (${t.displayName})${t.isCore ? ' [system]' : ''}: ${fields || 'no fields'}`;
  }).join('\n');
}
