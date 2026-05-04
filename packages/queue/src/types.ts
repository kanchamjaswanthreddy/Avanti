// Avanti Queue — Job Type Definitions
// All job data shapes used across BullMQ queues.

// ── Queue names ───────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  REPORTS:       'reports',
  NOTIFICATIONS: 'notifications',
  SCHEMA:        'schema-migrations',
  FEE_REMINDERS: 'fee-reminders',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// ── Report jobs ───────────────────────────────────────────────────────────────

export type ReportType =
  | 'attendance_summary'
  | 'fee_collection'
  | 'student_list'
  | 'class_performance';

export interface ReportJobData {
  jobId:        string;    // pre-generated UUID passed back to caller
  schoolId:     string;
  requestedBy:  string;    // userId
  reportType:   ReportType;
  params:       Record<string, unknown>;  // type-specific params (date range, classId, etc.)
}

// ── Notification jobs ─────────────────────────────────────────────────────────

export type NotificationChannel = 'push' | 'sms' | 'whatsapp' | 'email';

export interface NotificationJobData {
  schoolId:   string;
  recipientId: string;
  channel:    NotificationChannel;
  title:      string;
  body:       string;
  data?:      Record<string, unknown>;  // deep-link / metadata
}

// ── Schema migration jobs ─────────────────────────────────────────────────────

export interface SchemaMigrationJobData {
  schoolId:      string;
  requestedBy:   string;
  changeIds:     string[];  // IDs of ChangeDescriptors to apply (already persisted)
  changeVersion: number;    // target meta-schema version
}

// ── Fee reminder jobs ─────────────────────────────────────────────────────────

export interface FeeReminderJobData {
  schoolId:       string;
  feeStructureId: string;
  daysOverdue:    number;  // send reminders for fees overdue by this many days
  channel:        NotificationChannel;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type AnyJobData =
  | ReportJobData
  | NotificationJobData
  | SchemaMigrationJobData
  | FeeReminderJobData;
