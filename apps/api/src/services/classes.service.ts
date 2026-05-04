// Vidyut API — Classes Service
// CRUD for school classes (e.g. "Class 10 - Section A").
// All queries scoped by school_id from JWT — never trust request params alone.

import type pg from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClassRecord {
  id: string;
  schoolId: string;
  name: string;
  section: string | null;
  academicYear: string;
  gradeLevel: number | null;
  teacherId: string | null;
  teacherName: string | null;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClassInput {
  name: string;
  section?: string;
  academicYear: string;
  gradeLevel?: number;
  teacherId?: string;
}

export type UpdateClassInput = Partial<CreateClassInput>;

// ── DB row shape ──────────────────────────────────────────────────────────────

interface ClassRow {
  id: string;
  school_id: string;
  name: string;
  section: string | null;
  academic_year: string;
  grade_level: number | null;
  teacher_id: string | null;
  teacher_name: string | null;
  student_count: string; // COUNT returns text in pg
  created_at: Date;
  updated_at: Date;
}

function toRecord(row: ClassRow): ClassRecord {
  return {
    id:            row.id,
    schoolId:      row.school_id,
    name:          row.name,
    section:       row.section,
    academicYear:  row.academic_year,
    gradeLevel:    row.grade_level,
    teacherId:     row.teacher_id,
    teacherName:   row.teacher_name,
    studentCount:  parseInt(row.student_count, 10),
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT
    c.id, c.school_id, c.name, c.section, c.academic_year, c.grade_level,
    c.teacher_id, c.created_at, c.updated_at,
    u.name AS teacher_name,
    (SELECT COUNT(*) FROM students s
       WHERE s.class_id = c.id AND NOT s.is_deleted) AS student_count
  FROM classes c
  LEFT JOIN users u ON u.id = c.teacher_id
  WHERE NOT c.is_deleted
`;

// ── Service Functions ─────────────────────────────────────────────────────────

export async function listClasses(
  db: pg.Pool,
  schoolId: string,
  academicYear?: string
): Promise<ClassRecord[]> {
  let query = `${BASE_SELECT} AND c.school_id = $1`;
  const params: unknown[] = [schoolId];

  if (academicYear) {
    query += ` AND c.academic_year = $2`;
    params.push(academicYear);
  }

  query += ' ORDER BY c.grade_level ASC NULLS LAST, c.name ASC, c.section ASC NULLS LAST';

  const result = await db.query<ClassRow>(query, params);
  return result.rows.map(toRecord);
}

export async function getClass(
  db: pg.Pool,
  schoolId: string,
  classId: string
): Promise<ClassRecord | null> {
  const result = await db.query<ClassRow>(
    `${BASE_SELECT} AND c.school_id = $1 AND c.id = $2`,
    [schoolId, classId]
  );
  const row = result.rows[0];
  return row ? toRecord(row) : null;
}

export async function createClass(
  db: pg.Pool,
  schoolId: string,
  input: CreateClassInput
): Promise<ClassRecord> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO classes (school_id, name, section, academic_year, grade_level, teacher_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      schoolId,
      input.name,
      input.section ?? null,
      input.academicYear,
      input.gradeLevel ?? null,
      input.teacherId ?? null,
    ]
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error('Class insert returned no id.');

  const created = await getClass(db, schoolId, id);
  if (!created) throw new Error('Class created but could not be fetched.');
  return created;
}

export async function updateClass(
  db: pg.Pool,
  schoolId: string,
  classId: string,
  input: UpdateClassInput
): Promise<ClassRecord | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined)         { sets.push(`name = $${idx++}`);          params.push(input.name); }
  if (input.section !== undefined)      { sets.push(`section = $${idx++}`);       params.push(input.section); }
  if (input.academicYear !== undefined) { sets.push(`academic_year = $${idx++}`); params.push(input.academicYear); }
  if (input.gradeLevel !== undefined)   { sets.push(`grade_level = $${idx++}`);   params.push(input.gradeLevel); }
  if (input.teacherId !== undefined)    { sets.push(`teacher_id = $${idx++}`);    params.push(input.teacherId); }

  if (sets.length === 0) return getClass(db, schoolId, classId);

  await db.query(
    `UPDATE classes SET ${sets.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} AND NOT is_deleted`,
    [...params, classId, schoolId]
  );

  return getClass(db, schoolId, classId);
}

export async function deleteClass(
  db: pg.Pool,
  schoolId: string,
  classId: string
): Promise<boolean> {
  const result = await db.query(
    `UPDATE classes SET is_deleted = true
     WHERE id = $1 AND school_id = $2 AND NOT is_deleted`,
    [classId, schoolId]
  );
  return (result.rowCount ?? 0) > 0;
}
