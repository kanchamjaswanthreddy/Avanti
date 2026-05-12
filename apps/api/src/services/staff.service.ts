// Avanti API — Staff Service
// Full CRUD with soft delete, pagination, full-text search, department filtering.
// All queries scoped by school_id. Soft deletes only — is_deleted flag.

import type pg from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StaffRecord {
  id:          string;
  schoolId:    string;
  userId:      string | null;
  employeeId:  string;
  firstName:   string;
  lastName:    string;
  fullName:    string;
  email:       string | null;
  phone:       string | null;
  designation: string;
  department:  string | null;
  joiningDate: Date | null;
  basicSalary: number;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface CreateStaffInput {
  employeeId:  string;
  firstName:   string;
  lastName:    string;
  email?:      string;
  phone?:      string;
  designation: string;
  department?: string;
  joiningDate?: string;   // ISO date "YYYY-MM-DD"
  basicSalary?: number;
  userId?:     string;    // optional link to a login account
}

export type UpdateStaffInput = Partial<CreateStaffInput>;

export interface ListStaffOptions {
  page?:        number;
  limit?:       number;
  search?:      string;
  department?:  string;
}

export interface PaginatedStaff {
  data:       StaffRecord[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── DB Row ────────────────────────────────────────────────────────────────────

interface StaffRow {
  id:          string;
  school_id:   string;
  user_id:     string | null;
  employee_id: string;
  first_name:  string;
  last_name:   string;
  email:       string | null;
  phone:       string | null;
  designation: string;
  department:  string | null;
  joining_date: Date | null;
  basic_salary: number;
  created_at:  Date;
  updated_at:  Date;
}

function toRecord(row: StaffRow): StaffRecord {
  return {
    id:          row.id,
    schoolId:    row.school_id,
    userId:      row.user_id,
    employeeId:  row.employee_id,
    firstName:   row.first_name,
    lastName:    row.last_name,
    fullName:    `${row.first_name} ${row.last_name}`,
    email:       row.email,
    phone:       row.phone,
    designation: row.designation,
    department:  row.department,
    joiningDate: row.joining_date,
    basicSalary: row.basic_salary,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT
    id, school_id, user_id, employee_id,
    first_name, last_name, email, phone,
    designation, department, joining_date, basic_salary,
    created_at, updated_at
  FROM staff
  WHERE NOT is_deleted
`;

// ── Service Functions ─────────────────────────────────────────────────────────

export async function listStaff(
  db: pg.Pool,
  schoolId: string,
  opts: ListStaffOptions = {}
): Promise<PaginatedStaff> {
  const page  = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [`school_id = $1`];
  const params: unknown[] = [schoolId];
  let idx = 2;

  if (opts.department && opts.department.trim()) {
    conditions.push(`department = $${idx++}`);
    params.push(opts.department.trim());
  }

  if (opts.search && opts.search.trim()) {
    conditions.push(
      `to_tsvector('simple', first_name || ' ' || last_name || ' ' || employee_id)
       @@ plainto_tsquery('simple', $${idx++})`
    );
    params.push(opts.search.trim());
  }

  const where = `WHERE NOT is_deleted AND ${conditions.join(' AND ')}`;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM staff ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await db.query<StaffRow>(
    `${BASE_SELECT.replace('WHERE NOT is_deleted', where)}
     ORDER BY first_name ASC, last_name ASC
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

export async function getStaff(
  db: pg.Pool,
  schoolId: string,
  staffId: string
): Promise<StaffRecord | null> {
  const result = await db.query<StaffRow>(
    `${BASE_SELECT} AND school_id = $1 AND id = $2`,
    [schoolId, staffId]
  );
  const row = result.rows[0];
  return row ? toRecord(row) : null;
}

export async function createStaff(
  db: pg.Pool,
  schoolId: string,
  input: CreateStaffInput
): Promise<StaffRecord> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO staff (
       school_id, user_id, employee_id, first_name, last_name,
       email, phone, designation, department, joining_date, basic_salary
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      schoolId,
      input.userId      ?? null,
      input.employeeId,
      input.firstName,
      input.lastName,
      input.email       ?? null,
      input.phone       ?? null,
      input.designation,
      input.department  ?? null,
      input.joiningDate ?? null,
      input.basicSalary ?? 0,
    ]
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error('Staff insert returned no id.');

  const created = await getStaff(db, schoolId, id);
  if (!created) throw new Error('Staff created but could not be fetched.');
  return created;
}

export async function updateStaff(
  db: pg.Pool,
  schoolId: string,
  staffId: string,
  input: UpdateStaffInput
): Promise<StaffRecord | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const fieldMap: Array<[keyof UpdateStaffInput, string]> = [
    ['employeeId',  'employee_id'],
    ['firstName',   'first_name'],
    ['lastName',    'last_name'],
    ['email',       'email'],
    ['phone',       'phone'],
    ['designation', 'designation'],
    ['department',  'department'],
    ['joiningDate', 'joining_date'],
    ['basicSalary', 'basic_salary'],
    ['userId',      'user_id'],
  ];

  for (const [jsKey, dbCol] of fieldMap) {
    if (input[jsKey] !== undefined) {
      sets.push(`${dbCol} = $${idx++}`);
      params.push(input[jsKey] ?? null);
    }
  }

  if (sets.length === 0) return getStaff(db, schoolId, staffId);

  await db.query(
    `UPDATE staff
     SET ${sets.join(', ')}
     WHERE id = $${idx} AND school_id = $${idx + 1} AND NOT is_deleted`,
    [...params, staffId, schoolId]
  );

  return getStaff(db, schoolId, staffId);
}

export async function deleteStaff(
  db: pg.Pool,
  schoolId: string,
  staffId: string
): Promise<boolean> {
  const result = await db.query(
    `UPDATE staff SET is_deleted = true
     WHERE id = $1 AND school_id = $2 AND NOT is_deleted`,
    [staffId, schoolId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listDepartments(
  db: pg.Pool,
  schoolId: string
): Promise<string[]> {
  const result = await db.query<{ department: string }>(
    `SELECT DISTINCT department FROM staff
     WHERE school_id = $1 AND NOT is_deleted AND department IS NOT NULL
     ORDER BY department ASC`,
    [schoolId]
  );
  return result.rows.map(r => r.department);
}
