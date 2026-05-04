// Avanti API — Attendance Service
// Bulk mark by class, view by class/date, student history + percentage.
// Redis caches today's attendance per class. WebSocket broadcast via Socket.io.

import type pg from 'pg';
import type { Redis } from 'ioredis';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE';

export interface AttendanceMark {
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  classId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  date: string;           // "YYYY-MM-DD"
  status: AttendanceStatus;
  markedBy: string;
  markedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentAttendanceSummary {
  date: string;
  status: AttendanceStatus;
}

export interface AttendancePercentage {
  studentId: string;
  studentName: string;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  total: number;
  percentage: number;  // present + 0.5*halfDay + late counted as present
}

export interface ClassAttendanceSummary {
  date: string;
  classId: string;
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  records: AttendanceRecord[];
}

// ── DB Row ────────────────────────────────────────────────────────────────────

interface AttendanceRow {
  id: string;
  school_id: string;
  class_id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  date: Date;
  status: string;
  marked_by: string;
  marked_by_name: string;
  created_at: Date;
  updated_at: Date;
}

function toRecord(row: AttendanceRow): AttendanceRecord {
  const d = row.date;
  const dateStr = d instanceof Date
    ? d.toISOString().slice(0, 10)
    : String(d).slice(0, 10);
  return {
    id:              row.id,
    schoolId:        row.school_id,
    classId:         row.class_id,
    studentId:       row.student_id,
    studentName:     row.student_name,
    admissionNumber: row.admission_number,
    date:            dateStr,
    status:          row.status as AttendanceStatus,
    markedBy:        row.marked_by,
    markedByName:    row.marked_by_name,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

// ── Cache key helpers ─────────────────────────────────────────────────────────

function attendanceCacheKey(schoolId: string, classId: string, date: string): string {
  return `attendance:${schoolId}:${classId}:${date}`;
}

const CACHE_TTL_SECONDS = 300; // 5 minutes

// ── Mark Attendance (bulk upsert) ─────────────────────────────────────────────

export async function markAttendance(
  db: pg.Pool,
  redis: Redis,
  schoolId: string,
  classId: string,
  date: string,         // "YYYY-MM-DD"
  marks: AttendanceMark[],
  markedBy: string
): Promise<AttendanceRecord[]> {
  if (marks.length === 0) return [];

  // Verify all student IDs belong to this school + class
  const studentIds = marks.map(m => m.studentId);
  const verifyResult = await db.query<{ id: string }>(
    `SELECT id FROM students
     WHERE school_id = $1 AND class_id = $2 AND id = ANY($3::uuid[]) AND NOT is_deleted`,
    [schoolId, classId, studentIds]
  );
  const validIds = new Set(verifyResult.rows.map(r => r.id));
  const validMarks = marks.filter(m => validIds.has(m.studentId));
  if (validMarks.length === 0) return [];

  // Bulk upsert
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const mark of validMarks) {
      await client.query(
        `INSERT INTO attendance (school_id, class_id, student_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4::date, $5, $6)
         ON CONFLICT (school_id, student_id, date)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
        [schoolId, classId, mark.studentId, date, mark.status, markedBy]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Invalidate Redis cache for this class+date
  await redis.del(attendanceCacheKey(schoolId, classId, date));

  // Return fresh records
  return getClassAttendance(db, redis, schoolId, classId, date);
}

// ── Get Attendance for a Class on a Date ──────────────────────────────────────

export async function getClassAttendance(
  db: pg.Pool,
  redis: Redis,
  schoolId: string,
  classId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const cacheKey = attendanceCacheKey(schoolId, classId, date);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as AttendanceRecord[];
  }

  const result = await db.query<AttendanceRow>(
    `SELECT
       a.id, a.school_id, a.class_id, a.student_id, a.date, a.status,
       a.marked_by, a.created_at, a.updated_at,
       CONCAT(s.first_name, ' ', s.last_name) AS student_name,
       s.admission_number,
       u.name AS marked_by_name
     FROM attendance a
     JOIN students s ON s.id = a.student_id
     JOIN users    u ON u.id = a.marked_by
     WHERE a.school_id = $1 AND a.class_id = $2 AND a.date = $3::date
     ORDER BY s.first_name, s.last_name`,
    [schoolId, classId, date]
  );

  const records = result.rows.map(toRecord);
  await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(records));
  return records;
}

// ── Get All Students in Class with Today's Attendance Status ──────────────────
// Returns all students — those without a record show as null status.

export async function getClassAttendanceWithRoster(
  db: pg.Pool,
  schoolId: string,
  classId: string,
  date: string
): Promise<Array<{ studentId: string; studentName: string; admissionNumber: string; status: AttendanceStatus | null }>> {
  const result = await db.query<{
    student_id: string;
    student_name: string;
    admission_number: string;
    status: string | null;
  }>(
    `SELECT
       s.id AS student_id,
       CONCAT(s.first_name, ' ', s.last_name) AS student_name,
       s.admission_number,
       a.status
     FROM students s
     LEFT JOIN attendance a
       ON a.student_id = s.id AND a.school_id = $1 AND a.date = $3::date
     WHERE s.school_id = $1 AND s.class_id = $2 AND NOT s.is_deleted
     ORDER BY s.first_name, s.last_name`,
    [schoolId, classId, date]
  );

  return result.rows.map(r => ({
    studentId:       r.student_id,
    studentName:     r.student_name,
    admissionNumber: r.admission_number,
    status:          r.status as AttendanceStatus | null,
  }));
}

// ── Student Attendance History ────────────────────────────────────────────────

export async function getStudentAttendanceHistory(
  db: pg.Pool,
  schoolId: string,
  studentId: string,
  from: string,
  to: string
): Promise<StudentAttendanceSummary[]> {
  const result = await db.query<{ date: Date; status: string }>(
    `SELECT date, status FROM attendance
     WHERE school_id = $1 AND student_id = $2
       AND date BETWEEN $3::date AND $4::date
     ORDER BY date DESC`,
    [schoolId, studentId, from, to]
  );

  return result.rows.map(r => ({
    date:   (r.date instanceof Date ? r.date.toISOString() : String(r.date)).slice(0, 10),
    status: r.status as AttendanceStatus,
  }));
}

// ── Attendance Percentage ─────────────────────────────────────────────────────
// Counts: PRESENT + LATE + HALF_DAY×0.5 as "attended days"

export async function getStudentAttendancePercentage(
  db: pg.Pool,
  schoolId: string,
  studentId: string,
  academicYear: string
): Promise<AttendancePercentage> {
  // Get student info
  const studentResult = await db.query<{ first_name: string; last_name: string }>(
    `SELECT first_name, last_name FROM students
     WHERE id = $1 AND school_id = $2 AND NOT is_deleted`,
    [studentId, schoolId]
  );
  const student = studentResult.rows[0];
  const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';

  // Derive academic year date range (April–March for Indian schools)
  const yearStart = academicYear.split('-')[0] ?? '';
  const startDate = `${yearStart}-04-01`;
  const endDate   = `${parseInt(yearStart, 10) + 1}-03-31`;

  const result = await db.query<{
    status: string;
    count: string;
  }>(
    `SELECT status, COUNT(*) AS count FROM attendance
     WHERE school_id = $1 AND student_id = $2
       AND date BETWEEN $3::date AND $4::date
     GROUP BY status`,
    [schoolId, studentId, startDate, endDate]
  );

  const counts = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LATE: 0 };
  for (const row of result.rows) {
    const s = row.status as keyof typeof counts;
    if (s in counts) counts[s] = parseInt(row.count, 10);
  }

  const total    = counts.PRESENT + counts.ABSENT + counts.HALF_DAY + counts.LATE;
  const attended = counts.PRESENT + counts.LATE + counts.HALF_DAY * 0.5;
  const percentage = total > 0 ? Math.round((attended / total) * 100 * 10) / 10 : 0;

  return {
    studentId,
    studentName,
    present:    counts.PRESENT,
    absent:     counts.ABSENT,
    halfDay:    counts.HALF_DAY,
    late:       counts.LATE,
    total,
    percentage,
  };
}

// ── Class-level Summary (counts for a date) ────────────────────────────────────

export function summarizeAttendance(records: AttendanceRecord[], date: string, classId: string): ClassAttendanceSummary {
  const summary = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LATE: 0 };
  for (const r of records) summary[r.status]++;

  return {
    date,
    classId,
    total:   records.length,
    present: summary.PRESENT,
    absent:  summary.ABSENT,
    halfDay: summary.HALF_DAY,
    late:    summary.LATE,
    records,
  };
}
