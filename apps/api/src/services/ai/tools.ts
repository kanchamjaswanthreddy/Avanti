// Vidyut AI — Tool Definitions & Executors
// From TechnicalArchitecture_v1.docx Section 8
//
// 7 tools, each permission-checked before execution.
// All DB queries are scoped by school_id and use parameterized values only.
// Table/column names are validated against the live meta-schema before use in SQL.

import type pg from 'pg';
import type Anthropic from '@anthropic-ai/sdk';
import { getMetaSchema } from '@vidyut/schema-engine';
import { validateIdentifier, sanitizeIdentifier } from '@vidyut/utils';
import type { PermissionSet, MetaSchema, MetaTable, SchemaChangeDescriptor } from '@vidyut/types';
import { executeSchemaChanges } from '@vidyut/schema-engine';
import { getReportsQueue, redisConnectionFromEnv } from '@vidyut/queue';
import type { ReportType } from '@vidyut/queue';

// ── Tool execution context ────────────────────────────────────────────────────

export interface ToolContext {
  db:          pg.Pool;
  schoolId:    string;
  userId:      string;
  role:        string;
  permissions: PermissionSet;
  io?:         import('socket.io').Server;
}

// ── Tool definitions (Claude tool_use schema) ─────────────────────────────────

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name:        'query_school_data',
    description: 'Read records from school database tables. Returns up to 100 rows.',
    input_schema: {
      type: 'object',
      properties: {
        table:   { type: 'string', description: 'Table name (PostgreSQL name, e.g. "students")' },
        filters: { type: 'object', description: 'Key-value pairs for WHERE conditions' },
        columns: { type: 'array', items: { type: 'string' }, description: 'Columns to return; omit for all' },
        limit:   { type: 'integer', description: 'Max rows (1–100, default 50)' },
      },
      required: ['table'],
    },
  },
  {
    name:        'create_record',
    description: 'Insert a new record into a school database table.',
    input_schema: {
      type: 'object',
      properties: {
        table:  { type: 'string', description: 'Target table name' },
        record: { type: 'object', description: 'Field values for the new record' },
      },
      required: ['table', 'record'],
    },
  },
  {
    name:        'update_record',
    description: 'Update an existing record in a school database table.',
    input_schema: {
      type: 'object',
      properties: {
        table:   { type: 'string', description: 'Target table name' },
        id:      { type: 'string', description: 'UUID of the record to update' },
        updates: { type: 'object', description: 'Fields and their new values' },
      },
      required: ['table', 'id', 'updates'],
    },
  },
  {
    name:        'apply_schema_change',
    description: 'Apply structural changes to the school database schema (add/remove tables or columns). Requires canvas admin permission.',
    input_schema: {
      type: 'object',
      properties: {
        changes: {
          type:  'array',
          items: { type: 'object' },
          description: 'Array of SchemaChangeDescriptor objects',
        },
      },
      required: ['changes'],
    },
  },
  {
    name:        'send_notification',
    description: 'Send a real-time notification to users or a class.',
    input_schema: {
      type: 'object',
      properties: {
        to:       { type: 'string', enum: ['user', 'class', 'school'], description: 'Audience scope' },
        targetId: { type: 'string', description: 'userId or classId depending on "to" field; omit for "school"' },
        message:  { type: 'string', description: 'Notification message text' },
        notificationType: { type: 'string', enum: ['info', 'warning', 'urgent'], description: 'Visual style' },
      },
      required: ['to', 'message', 'notificationType'],
    },
  },
  {
    name:        'generate_report',
    description: 'Queue a background report generation job and return a job ID.',
    input_schema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: ['attendance_summary', 'fee_collection', 'student_performance', 'payroll'],
          description: 'Type of report to generate',
        },
        params: { type: 'object', description: 'Report parameters (date range, class, etc.)' },
      },
      required: ['reportType'],
    },
  },
  {
    name:        'get_screen_data',
    description: 'Fetch live data for a specific school module screen.',
    input_schema: {
      type: 'object',
      properties: {
        screen: {
          type: 'string',
          enum: ['students', 'classes', 'attendance_today', 'fee_defaulters', 'timetable'],
          description: 'Screen to fetch data for',
        },
        params: { type: 'object', description: 'Optional filter params (e.g. classId, date)' },
      },
      required: ['screen'],
    },
  },
];

// ── Tool executor dispatcher ──────────────────────────────────────────────────

export async function executeTool(
  name:  string,
  input: Record<string, unknown>,
  ctx:   ToolContext
): Promise<string> {
  switch (name) {
    case 'query_school_data':    return querySchoolData(input, ctx);
    case 'create_record':        return createRecord(input, ctx);
    case 'update_record':        return updateRecord(input, ctx);
    case 'apply_schema_change':  return applySchemaChange(input, ctx);
    case 'send_notification':    return sendNotification(input, ctx);
    case 'generate_report':      return generateReport(input, ctx);
    case 'get_screen_data':      return getScreenData(input, ctx);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── Validation helpers ────────────────────────────────────────────────────────

function hasReadPermission(permissions: PermissionSet, resource: string, role: string): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const p = permissions.permissions.find(pp => pp.resource === resource);
  return p?.actions.includes('READ') ?? false;
}

function hasWritePermission(permissions: PermissionSet, resource: string, role: string, action: 'CREATE' | 'UPDATE'): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const p = permissions.permissions.find(pp => pp.resource === resource);
  return p?.actions.includes(action) ?? false;
}

function findTable(meta: MetaSchema, tableName: string): MetaTable {
  const table = meta.tables.find(t => t.tableName === tableName && !t.isHidden);
  if (!table) throw new Error(`Table "${tableName}" does not exist or is not accessible.`);
  return table;
}

function safeColName(col: string, table: MetaTable): string {
  const result = validateIdentifier(col);
  if (!result.ok) throw new Error(`Invalid column name: "${col}"`);

  // Allow system columns + schema columns
  const systemCols = new Set(['id', 'school_id', 'created_at', 'updated_at', 'is_deleted']);
  const schemaCols = new Set(table.fields.filter(f => !f.isHidden).map(f => f.columnName));

  if (!systemCols.has(col) && !schemaCols.has(col)) {
    throw new Error(`Column "${col}" not found in table "${table.tableName}".`);
  }
  return sanitizeIdentifier(col);
}

// ── query_school_data ─────────────────────────────────────────────────────────

async function querySchoolData(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const tableName = String(input['table'] ?? '');
  const meta = await getMetaSchema(ctx.db, ctx.schoolId);
  const table = findTable(meta, tableName);

  if (!hasReadPermission(ctx.permissions, tableName, ctx.role)) {
    throw new Error(`You don't have READ permission on "${tableName}".`);
  }

  const requestedCols = input['columns'] as string[] | undefined;
  const filters       = input['filters'] as Record<string, unknown> | undefined;
  const limit         = Math.min(Math.max(1, Number(input['limit'] ?? 50)), 100);

  // Build SELECT list
  let colList = '*';
  if (requestedCols && requestedCols.length > 0) {
    const safeList = requestedCols.map(c => `"${safeColName(c, table)}"`).join(', ');
    colList = safeList;
  }

  const tn     = `"${sanitizeIdentifier(tableName)}"`;
  const params: unknown[] = [ctx.schoolId];
  let where = 'school_id = $1';
  let paramIdx = 2;

  if (filters && typeof filters === 'object') {
    for (const [key, value] of Object.entries(filters)) {
      const safeCk = safeColName(key, table);
      where += ` AND "${safeCk}" = $${paramIdx}`;
      params.push(value);
      paramIdx++;
    }
  }

  const result = await ctx.db.query(
    `SELECT ${colList} FROM ${tn} WHERE ${where} LIMIT ${limit}`,
    params
  );

  return JSON.stringify({ table: table.displayName, count: result.rows.length, rows: result.rows });
}

// ── create_record ─────────────────────────────────────────────────────────────

async function createRecord(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const tableName = String(input['table'] ?? '');
  const record    = input['record'] as Record<string, unknown> | undefined;

  if (!record || typeof record !== 'object' || Object.keys(record).length === 0) {
    throw new Error('record must be a non-empty object.');
  }

  const meta  = await getMetaSchema(ctx.db, ctx.schoolId);
  const table = findTable(meta, tableName);

  if (!hasWritePermission(ctx.permissions, tableName, ctx.role, 'CREATE')) {
    throw new Error(`You don't have CREATE permission on "${tableName}".`);
  }

  const tn = `"${sanitizeIdentifier(tableName)}"`;
  const entries = Object.entries(record);
  const cols   = entries.map(([k]) => `"${safeColName(k, table)}"`).join(', ');
  const ph     = entries.map((_, i) => `$${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  const result = await ctx.db.query<{ id: string }>(
    `INSERT INTO ${tn} (school_id, ${cols}) VALUES ($1, ${ph}) RETURNING id`,
    [ctx.schoolId, ...values]
  );

  return JSON.stringify({ success: true, id: result.rows[0]?.id, table: table.displayName });
}

// ── update_record ─────────────────────────────────────────────────────────────

async function updateRecord(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const tableName = String(input['table'] ?? '');
  const recordId  = String(input['id']    ?? '');
  const updates   = input['updates'] as Record<string, unknown> | undefined;

  if (!recordId) throw new Error('id is required.');
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    throw new Error('updates must be a non-empty object.');
  }

  const meta  = await getMetaSchema(ctx.db, ctx.schoolId);
  const table = findTable(meta, tableName);

  if (!hasWritePermission(ctx.permissions, tableName, ctx.role, 'UPDATE')) {
    throw new Error(`You don't have UPDATE permission on "${tableName}".`);
  }

  const tn      = `"${sanitizeIdentifier(tableName)}"`;
  const entries = Object.entries(updates);
  let paramIdx = 3;
  const setClauses = entries.map(([k]) => {
    const col = `"${safeColName(k, table)}"`;
    return `${col} = $${paramIdx++}`;
  });

  const result = await ctx.db.query(
    `UPDATE ${tn} SET ${setClauses.join(', ')} WHERE id = $1 AND school_id = $2 RETURNING id`,
    [recordId, ctx.schoolId, ...entries.map(([, v]) => v)]
  );

  if (result.rowCount === 0) {
    throw new Error(`Record ${recordId} not found in "${tableName}".`);
  }

  return JSON.stringify({ success: true, updated: result.rowCount, table: table.displayName });
}

// ── apply_schema_change ───────────────────────────────────────────────────────

async function applySchemaChange(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  // Requires CANVAS_EDIT permission (represented as CREATE on 'canvas')
  if (!hasWritePermission(ctx.permissions, 'canvas', ctx.role, 'CREATE')) {
    throw new Error('You need canvas admin permission to apply schema changes.');
  }

  const changes = (input['changes'] as SchemaChangeDescriptor[] | undefined);
  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    throw new Error('changes must be a non-empty array.');
  }

  const stamped = changes.map(c => ({ ...c, requestedBy: ctx.userId }));
  const result  = await executeSchemaChanges(ctx.db, ctx.schoolId, stamped);

  if (!result.success) {
    throw new Error(result.error ?? 'Schema change failed.');
  }

  return JSON.stringify({ success: true, newVersion: result.newVersion, changeCount: changes.length });
}

// ── send_notification ─────────────────────────────────────────────────────────

async function sendNotification(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const to       = String(input['to'] ?? 'user');
  const targetId = input['targetId'] ? String(input['targetId']) : undefined;
  const message  = String(input['message'] ?? '');
  const nType    = String(input['notificationType'] ?? 'info');

  if (!message.trim()) throw new Error('message cannot be empty.');

  const payload = {
    message,
    type:      nType,
    sentBy:    ctx.userId,
    timestamp: new Date().toISOString(),
  };

  if (ctx.io) {
    const room = to === 'user'   ? `user:${targetId ?? ctx.userId}:notifications`
               : to === 'class'  ? `school:${ctx.schoolId}:attendance:${targetId}`
               : `school:${ctx.schoolId}:dashboard`;

    ctx.io.to(room).emit('notification', payload);
  }

  return JSON.stringify({ success: true, sent: true, to, message: message.slice(0, 100) });
}

// ── generate_report ───────────────────────────────────────────────────────────

async function generateReport(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const reportType = String(input['reportType'] ?? 'attendance_summary') as ReportType;
  const params     = (input['params'] as Record<string, unknown> | undefined) ?? {};
  const jobId      = crypto.randomUUID();

  const queue = getReportsQueue(redisConnectionFromEnv());
  await queue.add(reportType, {
    jobId,
    schoolId:    ctx.schoolId,
    requestedBy: ctx.userId,
    reportType,
    params,
  }, { jobId });
  await queue.close();

  return JSON.stringify({
    jobId,
    reportType,
    status:      'queued',
    message:     `Report "${reportType}" has been queued. Job ID: ${jobId}`,
    estimatedMs: 15_000,
  });
}

// ── get_screen_data ───────────────────────────────────────────────────────────

async function getScreenData(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const screen = String(input['screen'] ?? '');
  const params = (input['params'] ?? {}) as Record<string, unknown>;

  switch (screen) {
    case 'students': {
      const limit = Math.min(Number(params['limit'] ?? 20), 50);
      const r = await ctx.db.query<{ id: string; name: string; roll_number: string; class_id: string }>(
        `SELECT id, name, roll_number, class_id FROM students WHERE school_id = $1 AND NOT is_deleted LIMIT $2`,
        [ctx.schoolId, limit]
      );
      return JSON.stringify({ screen, count: r.rows.length, rows: r.rows });
    }
    case 'classes': {
      const r = await ctx.db.query<{ id: string; name: string; section: string; academic_year: string }>(
        `SELECT id, name, section, academic_year FROM classes WHERE school_id = $1 AND NOT is_deleted`,
        [ctx.schoolId]
      );
      return JSON.stringify({ screen, count: r.rows.length, rows: r.rows });
    }
    case 'attendance_today': {
      const today = new Date().toISOString().slice(0, 10);
      const classId = params['classId'] ? String(params['classId']) : null;
      let query = `SELECT a.*, s.name as student_name FROM attendance a
        JOIN students s ON s.id = a.student_id
        WHERE a.school_id = $1 AND a.date = $2`;
      const qParams: unknown[] = [ctx.schoolId, today];
      if (classId) { query += ' AND a.class_id = $3'; qParams.push(classId); }
      const r = await ctx.db.query(query, qParams);
      return JSON.stringify({ screen, date: today, count: r.rows.length, rows: r.rows });
    }
    case 'fee_defaulters': {
      const r = await ctx.db.query<{ student_id: string; student_name: string; outstanding: string }>(
        `SELECT fc.student_id, s.name as student_name,
          SUM(fc.amount) - COALESCE(SUM(fc.amount_paid), 0) AS outstanding
         FROM fee_collections fc
         JOIN students s ON s.id = fc.student_id
         WHERE fc.school_id = $1 AND fc.status != 'PAID'
         GROUP BY fc.student_id, s.name
         HAVING SUM(fc.amount) - COALESCE(SUM(fc.amount_paid), 0) > 0
         ORDER BY outstanding DESC LIMIT 50`,
        [ctx.schoolId]
      );
      return JSON.stringify({ screen, count: r.rows.length, rows: r.rows });
    }
    case 'timetable': {
      const classId = params['classId'] ? String(params['classId']) : null;
      let query = `SELECT ts.*, u.name as teacher_name, c.name as class_name
        FROM timetable_slots ts
        LEFT JOIN users u ON u.id = ts.teacher_id
        LEFT JOIN classes c ON c.id = ts.class_id
        WHERE ts.school_id = $1`;
      const qParams: unknown[] = [ctx.schoolId];
      if (classId) { query += ' AND ts.class_id = $2'; qParams.push(classId); }
      query += ' ORDER BY ts.day_of_week, ts.start_time';
      const r = await ctx.db.query(query, qParams);
      return JSON.stringify({ screen, count: r.rows.length, rows: r.rows });
    }
    default:
      throw new Error(`Unknown screen: "${screen}"`);
  }
}
