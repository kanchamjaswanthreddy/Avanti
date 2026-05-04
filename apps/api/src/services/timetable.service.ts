// Vidyut API — Timetable Service
// Weekly timetable management with clash detection.
// Clashes: same class + same period, or same teacher + same time + same day.
// DB-level enforcement via UNIQUE indexes; service catches constraint violations.

import type pg from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimetableSlot {
  id: string;
  schoolId: string;
  classId: string;
  className: string | null;
  dayOfWeek: number;    // 1=Mon … 7=Sun
  periodNumber: number;
  startTime: string;    // "08:30"
  endTime: string;      // "09:30"
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
  room: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSlotInput {
  classId: string;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId?: string;
  room?: string;
}

export type UpdateSlotInput = Partial<Omit<CreateSlotInput, 'classId'>>;

export interface WeeklyTimetable {
  classId: string;
  className: string | null;
  days: Record<number, TimetableSlot[]>;  // 1–7
}

export class ClashError extends Error {
  constructor(
    message: string,
    public readonly clashType: 'CLASS_PERIOD' | 'TEACHER_TIME'
  ) {
    super(message);
    this.name = 'ClashError';
  }
}

// ── DB Row ────────────────────────────────────────────────────────────────────

interface TimetableRow {
  id: string;
  school_id: string;
  class_id: string;
  class_name: string | null;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_id: string | null;
  teacher_name: string | null;
  room: string | null;
  created_at: Date;
  updated_at: Date;
}

function toSlot(row: TimetableRow): TimetableSlot {
  return {
    id:           row.id,
    schoolId:     row.school_id,
    classId:      row.class_id,
    className:    row.class_name,
    dayOfWeek:    row.day_of_week,
    periodNumber: row.period_number,
    startTime:    row.start_time.slice(0, 5),  // "HH:MM" only
    endTime:      row.end_time.slice(0, 5),
    subject:      row.subject,
    teacherId:    row.teacher_id,
    teacherName:  row.teacher_name,
    room:         row.room,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT
    ts.id, ts.school_id, ts.class_id, ts.day_of_week, ts.period_number,
    ts.start_time::text, ts.end_time::text, ts.subject, ts.teacher_id, ts.room,
    ts.created_at, ts.updated_at,
    CONCAT(c.name, CASE WHEN c.section IS NOT NULL THEN ' - ' || c.section ELSE '' END) AS class_name,
    u.name AS teacher_name
  FROM timetable_slots ts
  LEFT JOIN classes c ON c.id = ts.class_id
  LEFT JOIN users   u ON u.id = ts.teacher_id
`;

// ── Get Weekly Timetable for a Class ─────────────────────────────────────────

export async function getWeeklyTimetable(
  db: pg.Pool,
  schoolId: string,
  classId: string
): Promise<WeeklyTimetable> {
  const result = await db.query<TimetableRow>(
    `${BASE_SELECT}
     WHERE ts.school_id = $1 AND ts.class_id = $2
     ORDER BY ts.day_of_week, ts.period_number`,
    [schoolId, classId]
  );

  const slots = result.rows.map(toSlot);
  const days: Record<number, TimetableSlot[]> = {};

  for (let d = 1; d <= 7; d++) days[d] = [];
  for (const slot of slots) {
    const daySlots = days[slot.dayOfWeek];
    if (daySlots) daySlots.push(slot);
  }

  const className = result.rows[0]?.class_name ?? null;
  return { classId, className, days };
}

// ── Get All Timetable Slots for a School (any class, any day) ─────────────────

export async function listSlots(
  db: pg.Pool,
  schoolId: string,
  classId?: string,
  dayOfWeek?: number
): Promise<TimetableSlot[]> {
  const conditions: string[] = ['ts.school_id = $1'];
  const params: unknown[] = [schoolId];
  let idx = 2;

  if (classId)    { conditions.push(`ts.class_id = $${idx++}`);    params.push(classId); }
  if (dayOfWeek)  { conditions.push(`ts.day_of_week = $${idx++}`); params.push(dayOfWeek); }

  const result = await db.query<TimetableRow>(
    `${BASE_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY ts.class_id, ts.day_of_week, ts.period_number`,
    params
  );

  return result.rows.map(toSlot);
}

// ── Get Single Slot ───────────────────────────────────────────────────────────

export async function getSlot(
  db: pg.Pool,
  schoolId: string,
  slotId: string
): Promise<TimetableSlot | null> {
  const result = await db.query<TimetableRow>(
    `${BASE_SELECT} WHERE ts.school_id = $1 AND ts.id = $2`,
    [schoolId, slotId]
  );
  const row = result.rows[0];
  return row ? toSlot(row) : null;
}

// ── Create Slot ───────────────────────────────────────────────────────────────
// Throws ClashError if the slot would create a scheduling conflict.

export async function createSlot(
  db: pg.Pool,
  schoolId: string,
  input: CreateSlotInput
): Promise<TimetableSlot> {
  try {
    const result = await db.query<{ id: string }>(
      `INSERT INTO timetable_slots
         (school_id, class_id, day_of_week, period_number, start_time, end_time,
          subject, teacher_id, room)
       VALUES ($1, $2, $3, $4, $5::time, $6::time, $7, $8, $9)
       RETURNING id`,
      [
        schoolId,
        input.classId,
        input.dayOfWeek,
        input.periodNumber,
        input.startTime,
        input.endTime,
        input.subject,
        input.teacherId ?? null,
        input.room ?? null,
      ]
    );

    const id = result.rows[0]?.id;
    if (!id) throw new Error('Timetable slot insert returned no id.');

    const created = await getSlot(db, schoolId, id);
    if (!created) throw new Error('Slot created but could not be fetched.');
    return created;
  } catch (err) {
    if (err instanceof Error && 'code' in err) {
      const pgErr = err as Error & { code: string; constraint?: string };
      if (pgErr.code === '23505') {
        if (pgErr.constraint?.includes('teacher_clash')) {
          throw new ClashError(
            'Teacher is already scheduled in another class at this time.',
            'TEACHER_TIME'
          );
        }
        throw new ClashError(
          'A slot already exists for this class, day, and period.',
          'CLASS_PERIOD'
        );
      }
    }
    throw err;
  }
}

// ── Update Slot ───────────────────────────────────────────────────────────────

export async function updateSlot(
  db: pg.Pool,
  schoolId: string,
  slotId: string,
  input: UpdateSlotInput
): Promise<TimetableSlot | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.dayOfWeek !== undefined)    { sets.push(`day_of_week = $${idx++}`);    params.push(input.dayOfWeek); }
  if (input.periodNumber !== undefined) { sets.push(`period_number = $${idx++}`);  params.push(input.periodNumber); }
  if (input.startTime !== undefined)    { sets.push(`start_time = $${idx++}::time`); params.push(input.startTime); }
  if (input.endTime !== undefined)      { sets.push(`end_time = $${idx++}::time`);   params.push(input.endTime); }
  if (input.subject !== undefined)      { sets.push(`subject = $${idx++}`);        params.push(input.subject); }
  if (input.teacherId !== undefined)    { sets.push(`teacher_id = $${idx++}`);     params.push(input.teacherId); }
  if (input.room !== undefined)         { sets.push(`room = $${idx++}`);           params.push(input.room); }

  if (sets.length === 0) return getSlot(db, schoolId, slotId);

  try {
    await db.query(
      `UPDATE timetable_slots SET ${sets.join(', ')}
       WHERE id = $${idx} AND school_id = $${idx + 1}`,
      [...params, slotId, schoolId]
    );
  } catch (err) {
    if (err instanceof Error && 'code' in err) {
      const pgErr = err as Error & { code: string; constraint?: string };
      if (pgErr.code === '23505') {
        if (pgErr.constraint?.includes('teacher_clash')) {
          throw new ClashError(
            'Teacher is already scheduled in another class at this time.',
            'TEACHER_TIME'
          );
        }
        throw new ClashError(
          'A slot already exists for this class, day, and period.',
          'CLASS_PERIOD'
        );
      }
    }
    throw err;
  }

  return getSlot(db, schoolId, slotId);
}

// ── Delete Slot ───────────────────────────────────────────────────────────────

export async function deleteSlot(
  db: pg.Pool,
  schoolId: string,
  slotId: string
): Promise<boolean> {
  const result = await db.query(
    `DELETE FROM timetable_slots WHERE id = $1 AND school_id = $2`,
    [slotId, schoolId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ── Get Teacher's Schedule ────────────────────────────────────────────────────

export async function getTeacherTimetable(
  db: pg.Pool,
  schoolId: string,
  teacherId: string
): Promise<TimetableSlot[]> {
  const result = await db.query<TimetableRow>(
    `${BASE_SELECT}
     WHERE ts.school_id = $1 AND ts.teacher_id = $2
     ORDER BY ts.day_of_week, ts.start_time`,
    [schoolId, teacherId]
  );
  return result.rows.map(toSlot);
}
