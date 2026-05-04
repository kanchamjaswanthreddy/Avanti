// Avanti Queue — Queue Factory
// Returns typed BullMQ Queue instances given a Redis connection.
// Each school uses the same queue names — school_id is a field in job data.

import { Queue, type ConnectionOptions } from 'bullmq';
import { QUEUE_NAMES } from './types';
import type {
  ReportJobData,
  NotificationJobData,
  SchemaMigrationJobData,
  FeeReminderJobData,
} from './types';

// ── Default job options ───────────────────────────────────────────────────────

const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { age: 86_400, count: 1000 },   // keep 24h or 1k jobs
  removeOnFail:     { age: 7 * 86_400, count: 500 }, // keep failed jobs 7 days
  attempts:         3,
  backoff:          { type: 'exponential' as const, delay: 2000 },
};

// ── Queue getters ─────────────────────────────────────────────────────────────

export function getReportsQueue(connection: ConnectionOptions) {
  return new Queue<ReportJobData>(QUEUE_NAMES.REPORTS, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export function getNotificationsQueue(connection: ConnectionOptions) {
  return new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATIONS, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export function getSchemaQueue(connection: ConnectionOptions) {
  return new Queue<SchemaMigrationJobData>(QUEUE_NAMES.SCHEMA, {
    connection,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      attempts: 1,           // schema migrations never retry automatically
      removeOnFail: false,   // keep all failed schema jobs for investigation
    },
  });
}

export function getFeeRemindersQueue(connection: ConnectionOptions) {
  return new Queue<FeeReminderJobData>(QUEUE_NAMES.FEE_REMINDERS, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

// ── Connection helper ─────────────────────────────────────────────────────────

export function redisConnectionFromEnv(): ConnectionOptions {
  const url = process.env['REDIS_URL'];
  if (url) return { lazyConnect: true, ...parseRedisUrl(url) };
  return {
    host:     process.env['REDIS_HOST']     ?? 'localhost',
    port:     parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] ?? undefined,
    db:       parseInt(process.env['REDIS_DB']   ?? '0',    10),
  };
}

function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const u = new URL(url);
    return {
      host:     u.hostname,
      port:     u.port ? parseInt(u.port, 10) : 6379,
      password: u.password || undefined,
      db:       u.pathname.length > 1 ? parseInt(u.pathname.slice(1), 10) : 0,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}
