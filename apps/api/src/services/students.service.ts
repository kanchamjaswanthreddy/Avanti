// Avanti API — Students Service
// Full CRUD with soft delete, pagination, full-text search, class filtering.
// All queries scoped by school_id. Soft deletes only — is_deleted flag.

import type pg from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudentRecord {
  id: string;
  schoolId: string;
  classId: string | null;
  className: string | null;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: Date | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  parentName: string | null;
  parentPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentInput {
  classId?: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;  // ISO date string "YYYY-MM-DD"
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  email?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

export interface ListStudentsOptions {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
}

export interface PaginatedStudents {
  data: StudentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── DB Row ────────────────────────────────────────────────────────────────────

interface StudentRow {
  id: string;
  school_id: string;
  class_id: string | null;
  class_name: string | null;
  admission_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  created_at: Date;
  updated_at: Date;
}

function toRecord(row: StudentRow): StudentRecord {
  return {
    id:              row.id,
    schoolId:        row.school_id,
    classId:         row.class_id,
    className:       row.class_name,
    admissionNumber: row.admission_number,
    firstName:       row.first_name,
    lastName:        row.last_name,
    fullName:        `${row.first_name} ${row.last_name}`,
    dateOfBirth:     row.date_of_birth,
    gender:          row.gender as StudentRecord['gender'],
    phone:           row.phone,
    email:           row.email,
    address:         row.address,
    parentName:      row.parent_name,
    parentPhone:     row.parent_phone,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT
    s.id, s.school_id, s.class_id, s.admission_number,
    s.first_name, s.last_name, s.date_of_birth, s.gender,
    s.phone, s.email, s.address, s.parent_name, s.parent_phone,
    s.created_at, s.updated_at,
    CONCAT(c.name, CASE WHEN c.section IS NOT NULL THEN ' - ' || c.section ELSE '' END) AS class_name
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id AND NOT c.is_deleted
  WHERE NOT s.is_deleted
`;

// ── Service Functions ─────────────────────────────────────────────────────────

export async function listStudents(
  db: pg.Pool,
  schoolId: string,
  opts: ListStudentsOptions = {}
): Promise<PaginatedStudents> {
  const page  = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [`s.school_id = $1`];
  const params: unknown[] = [schoolId];
  let idx = 2;

  if (opts.classId) {
    conditions.push(`s.class_id = $${idx++}`);
    params.push(opts.classId);
  }

  if (opts.search && opts.search.trim()) {
    conditions.push(
      `to_tsvector('simple', s.first_name || ' ' || s.last_name || ' ' || s.admission_number)
       @@ plainto_tsquery('simple', $${idx++})`
    );
    params.push(opts.search.trim());
  }

  const where = `WHERE NOT s.is_deleted AND ${conditions.join(' AND ')}`;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM students s ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await db.query<StudentRow>(
    `${BASE_SELECT.replace('WHERE NOT s.is_deleted', where)}
     ORDER BY s.first_name ASC, s.last_name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return {
    data:       dataResult.rows.map(toRecord),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getStudent(
  db: pg.Pool,
  schoolId: string,
  studentId: string
): Promise<StudentRecord | null> {
  const result = await db.query<StudentRow>(
    `${BASE_SELECT} AND s.school_id = $1 AND s.id = $2`,
    [schoolId, studentId]
  );
  const row = result.rows[0];
  return row ? toRecord(row) : null;
}

export async function createStudent(
  db: pg.Pool,
  schoolId: string,
  input: CreateStudentInput
): Promise<StudentRecord> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO students (
       school_id, class_id, admission_number, first_name, last_name,
       date_of_birth, gender, phone, email, address, parent_name, parent_phone
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      schoolId,
      input.classId ?? null,
      input.admissionNumber,
      input.firstName,
      input.lastName,
      input.dateOfBirth ?? null,
      input.gender ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.address ?? null,
      input.parentName ?? null,
      input.parentPhone ?? null,
    ]
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error('Student insert returned no id.');

  const created = await getStudent(db, schoolId, id);
  if (!created) throw new Error('Student created but could not be fetched.');
  return created;
}

export async function updateStudent(
  db: pg.Pool,
  schoolId: string,
  studentId: string,
  input: UpdateStudentInput
): Promise<StudentRecord | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const fieldMap: Array<[keyof UpdateStudentInput, string]> = [
    ['classId',          'class_id'],
    ['admissionNumber',  'admission_number'],
    ['firstName',        'first_name'],
    ['lastName',         'last_name'],
    ['dateOfBirth',      'date_of_birth'],
    ['gender',           'gender'],
    ['phone',            'phone'],
    ['email',            'email'],
    ['address',          'address'],
    ['parentName',       'parent_name'],
    ['parentPhone',      'parent_phone'],
  ];

  for (const [jsKey, dbCol] of fieldMap) {
    if (input[jsKey] !== undefined) {
      sets.push(`${dbCol} = $${idx++}`);
      params.push(input[jsKey] ?? null);
    }
  }

  if (sets.length === 0) return getStudent(db, schoolId, studentId);

  await db.query(
    `UPDATE students
     SET ${sets.join(', ')}
     WHERE id = $${idx} AND school_id = $${idx + 1} AND NOT is_deleted`,
    [...params, studentId, schoolId]
  );

  return getStudent(db, schoolId, studentId);
}

export async function deleteStudent(
  db: pg.Pool,
  schoolId: string,
  studentId: string
): Promise<boolean> {
  const result = await db.query(
    `UPDATE students SET is_deleted = true
     WHERE id = $1 AND school_id = $2 AND NOT is_deleted`,
    [studentId, schoolId]
  );
  return (result.rowCount ?? 0) > 0;
}
