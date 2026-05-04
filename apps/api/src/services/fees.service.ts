// Avanti API — Fees Service
// Fee structure builder, payment recording, receipt generation, defaulters list.
// All monetary values in paise (₹1 = 100 paise) — use currency utils for display.

import type pg from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeeStructureItem {
  id: string;
  feeStructureId: string;
  label: string;
  amount: number;  // paise
  sortOrder: number;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  name: string;
  academicYear: string;
  totalAmount: number;     // paise
  installments: number;
  lateFeeType: 'FLAT' | 'PERCENTAGE' | null;
  lateFeeValue: number | null;
  items: FeeStructureItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeeStructureInput {
  name: string;
  academicYear: string;
  installments?: number;
  lateFeeType?: 'FLAT' | 'PERCENTAGE';
  lateFeeValue?: number;
  items: Array<{ label: string; amount: number; sortOrder?: number }>;
}

export interface FeeCollection {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  feeStructureId: string;
  feeStructureName: string;
  installmentNo: number;
  amountPaid: number;  // paise
  paymentDate: string;
  paymentMode: 'CASH' | 'CHEQUE' | 'ONLINE' | 'DD';
  receiptNumber: string;
  remarks: string | null;
  recordedBy: string;
  recordedByName: string;
  createdAt: Date;
}

export interface RecordPaymentInput {
  studentId: string;
  feeStructureId: string;
  installmentNo?: number;
  amountPaid: number;  // paise
  paymentDate?: string;
  paymentMode?: 'CASH' | 'CHEQUE' | 'ONLINE' | 'DD';
  remarks?: string;
}

export interface StudentFeeStatus {
  studentId: string;
  feeStructureId: string;
  feeStructureName: string;
  totalAmount: number;
  installments: number;
  amountPaid: number;
  balance: number;
  payments: FeeCollection[];
  isFullyPaid: boolean;
}

export interface Defaulter {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string | null;
  amountDue: number;
  amountPaid: number;
  lastPaymentDate: string | null;
}

// ── DB Rows ───────────────────────────────────────────────────────────────────

interface FeeStructureRow {
  id: string;
  school_id: string;
  name: string;
  academic_year: string;
  total_amount: number;
  installments: number;
  late_fee_type: string | null;
  late_fee_value: number | null;
  created_at: Date;
  updated_at: Date;
}

interface FeeItemRow {
  id: string;
  fee_structure_id: string;
  label: string;
  amount: number;
  sort_order: number;
}

interface FeeCollectionRow {
  id: string;
  school_id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  fee_structure_id: string;
  fee_structure_name: string;
  installment_no: number;
  amount_paid: number;
  payment_date: Date;
  payment_mode: string;
  receipt_number: string;
  remarks: string | null;
  recorded_by: string;
  recorded_by_name: string;
  created_at: Date;
}

function toFeeCollection(row: FeeCollectionRow): FeeCollection {
  const d = row.payment_date;
  const dateStr = (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
  return {
    id:               row.id,
    schoolId:         row.school_id,
    studentId:        row.student_id,
    studentName:      row.student_name,
    admissionNumber:  row.admission_number,
    feeStructureId:   row.fee_structure_id,
    feeStructureName: row.fee_structure_name,
    installmentNo:    row.installment_no,
    amountPaid:       row.amount_paid,
    paymentDate:      dateStr,
    paymentMode:      row.payment_mode as FeeCollection['paymentMode'],
    receiptNumber:    row.receipt_number,
    remarks:          row.remarks,
    recordedBy:       row.recorded_by,
    recordedByName:   row.recorded_by_name,
    createdAt:        row.created_at,
  };
}

// ── Receipt Number Generation ─────────────────────────────────────────────────
// Format: RCP-YYYY-XXXXXX (e.g. RCP-2025-000001)
// Uses a counter table with FOR UPDATE advisory lock for atomicity.

async function generateReceiptNumber(db: pg.Pool, schoolId: string): Promise<string> {
  const year = new Date().getFullYear().toString();
  const counterName = `receipt_${year}`;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Upsert counter and increment atomically
    const result = await client.query<{ current_value: string }>(
      `INSERT INTO counters (school_id, name, current_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (school_id, name)
       DO UPDATE SET current_value = counters.current_value + 1
       RETURNING current_value`,
      [schoolId, counterName]
    );
    await client.query('COMMIT');
    const seq = parseInt(result.rows[0]?.current_value ?? '1', 10);
    return `RCP-${year}-${String(seq).padStart(6, '0')}`;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Fee Structure ─────────────────────────────────────────────────────────────

export async function createFeeStructure(
  db: pg.Pool,
  schoolId: string,
  input: CreateFeeStructureInput
): Promise<FeeStructure> {
  const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const structResult = await client.query<{ id: string }>(
      `INSERT INTO fee_structures
         (school_id, name, academic_year, total_amount, installments, late_fee_type, late_fee_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        schoolId,
        input.name,
        input.academicYear,
        totalAmount,
        input.installments ?? 1,
        input.lateFeeType ?? null,
        input.lateFeeValue ?? null,
      ]
    );

    const structId = structResult.rows[0]?.id;
    if (!structId) throw new Error('Fee structure insert returned no id.');

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (!item) continue;
      await client.query(
        `INSERT INTO fee_structure_items (fee_structure_id, label, amount, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [structId, item.label, item.amount, item.sortOrder ?? i]
      );
    }

    await client.query('COMMIT');

    const created = await getFeeStructure(db, schoolId, structId);
    if (!created) throw new Error('Fee structure created but could not be fetched.');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getFeeStructure(
  db: pg.Pool,
  schoolId: string,
  structureId: string
): Promise<FeeStructure | null> {
  const structResult = await db.query<FeeStructureRow>(
    `SELECT id, school_id, name, academic_year, total_amount, installments,
            late_fee_type, late_fee_value, created_at, updated_at
     FROM fee_structures
     WHERE id = $1 AND school_id = $2 AND NOT is_deleted`,
    [structureId, schoolId]
  );

  const struct = structResult.rows[0];
  if (!struct) return null;

  const itemsResult = await db.query<FeeItemRow>(
    `SELECT id, fee_structure_id, label, amount, sort_order
     FROM fee_structure_items WHERE fee_structure_id = $1 ORDER BY sort_order`,
    [structureId]
  );

  return {
    id:            struct.id,
    schoolId:      struct.school_id,
    name:          struct.name,
    academicYear:  struct.academic_year,
    totalAmount:   struct.total_amount,
    installments:  struct.installments,
    lateFeeType:   struct.late_fee_type as FeeStructure['lateFeeType'],
    lateFeeValue:  struct.late_fee_value,
    items:         itemsResult.rows.map(r => ({
      id:              r.id,
      feeStructureId:  r.fee_structure_id,
      label:           r.label,
      amount:          r.amount,
      sortOrder:       r.sort_order,
    })),
    createdAt:     struct.created_at,
    updatedAt:     struct.updated_at,
  };
}

export async function listFeeStructures(
  db: pg.Pool,
  schoolId: string,
  academicYear?: string
): Promise<FeeStructure[]> {
  let query = `
    SELECT id, school_id, name, academic_year, total_amount, installments,
           late_fee_type, late_fee_value, created_at, updated_at
    FROM fee_structures
    WHERE school_id = $1 AND NOT is_deleted
  `;
  const params: unknown[] = [schoolId];

  if (academicYear) {
    query += ` AND academic_year = $2`;
    params.push(academicYear);
  }

  query += ' ORDER BY academic_year DESC, name ASC';

  const result = await db.query<FeeStructureRow>(query, params);

  // Load items for all structures in one query
  if (result.rows.length === 0) return [];

  const ids = result.rows.map(r => r.id);
  const itemsResult = await db.query<FeeItemRow>(
    `SELECT id, fee_structure_id, label, amount, sort_order
     FROM fee_structure_items
     WHERE fee_structure_id = ANY($1::uuid[])
     ORDER BY fee_structure_id, sort_order`,
    [ids]
  );

  const itemsByStructure = new Map<string, FeeStructureItem[]>();
  for (const item of itemsResult.rows) {
    const arr = itemsByStructure.get(item.fee_structure_id) ?? [];
    arr.push({
      id:              item.id,
      feeStructureId:  item.fee_structure_id,
      label:           item.label,
      amount:          item.amount,
      sortOrder:       item.sort_order,
    });
    itemsByStructure.set(item.fee_structure_id, arr);
  }

  return result.rows.map(struct => ({
    id:            struct.id,
    schoolId:      struct.school_id,
    name:          struct.name,
    academicYear:  struct.academic_year,
    totalAmount:   struct.total_amount,
    installments:  struct.installments,
    lateFeeType:   struct.late_fee_type as FeeStructure['lateFeeType'],
    lateFeeValue:  struct.late_fee_value,
    items:         itemsByStructure.get(struct.id) ?? [],
    createdAt:     struct.created_at,
    updatedAt:     struct.updated_at,
  }));
}

// ── Record Payment ────────────────────────────────────────────────────────────

export async function recordPayment(
  db: pg.Pool,
  schoolId: string,
  input: RecordPaymentInput,
  recordedBy: string
): Promise<FeeCollection> {
  const receiptNumber = await generateReceiptNumber(db, schoolId);

  const result = await db.query<{ id: string }>(
    `INSERT INTO fee_collections
       (school_id, student_id, fee_structure_id, installment_no,
        amount_paid, payment_date, payment_mode, receipt_number, remarks, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10)
     RETURNING id`,
    [
      schoolId,
      input.studentId,
      input.feeStructureId,
      input.installmentNo ?? 1,
      input.amountPaid,
      input.paymentDate ?? new Date().toISOString().slice(0, 10),
      input.paymentMode ?? 'CASH',
      receiptNumber,
      input.remarks ?? null,
      recordedBy,
    ]
  );

  const id = result.rows[0]?.id;
  if (!id) throw new Error('Payment insert returned no id.');

  const payment = await getPayment(db, schoolId, id);
  if (!payment) throw new Error('Payment created but could not be fetched.');
  return payment;
}

export async function getPayment(
  db: pg.Pool,
  schoolId: string,
  paymentId: string
): Promise<FeeCollection | null> {
  const result = await db.query<FeeCollectionRow>(
    `SELECT
       fc.id, fc.school_id, fc.student_id, fc.fee_structure_id,
       fc.installment_no, fc.amount_paid, fc.payment_date, fc.payment_mode,
       fc.receipt_number, fc.remarks, fc.recorded_by, fc.created_at,
       CONCAT(s.first_name, ' ', s.last_name) AS student_name,
       s.admission_number,
       fs.name AS fee_structure_name,
       u.name AS recorded_by_name
     FROM fee_collections fc
     JOIN students      s  ON s.id  = fc.student_id
     JOIN fee_structures fs ON fs.id = fc.fee_structure_id
     JOIN users          u  ON u.id  = fc.recorded_by
     WHERE fc.id = $1 AND fc.school_id = $2`,
    [paymentId, schoolId]
  );

  const row = result.rows[0];
  return row ? toFeeCollection(row) : null;
}

// ── Student Fee Status ────────────────────────────────────────────────────────

export async function getStudentFeeStatus(
  db: pg.Pool,
  schoolId: string,
  studentId: string,
  feeStructureId: string
): Promise<StudentFeeStatus | null> {
  const struct = await getFeeStructure(db, schoolId, feeStructureId);
  if (!struct) return null;

  const paymentsResult = await db.query<FeeCollectionRow>(
    `SELECT
       fc.id, fc.school_id, fc.student_id, fc.fee_structure_id,
       fc.installment_no, fc.amount_paid, fc.payment_date, fc.payment_mode,
       fc.receipt_number, fc.remarks, fc.recorded_by, fc.created_at,
       CONCAT(s.first_name, ' ', s.last_name) AS student_name,
       s.admission_number,
       fs.name AS fee_structure_name,
       u.name AS recorded_by_name
     FROM fee_collections fc
     JOIN students       s  ON s.id  = fc.student_id
     JOIN fee_structures fs ON fs.id = fc.fee_structure_id
     JOIN users          u  ON u.id  = fc.recorded_by
     WHERE fc.school_id = $1 AND fc.student_id = $2 AND fc.fee_structure_id = $3
     ORDER BY fc.payment_date DESC`,
    [schoolId, studentId, feeStructureId]
  );

  const payments = paymentsResult.rows.map(toFeeCollection);
  const amountPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const balance = struct.totalAmount - amountPaid;

  return {
    studentId,
    feeStructureId,
    feeStructureName: struct.name,
    totalAmount:  struct.totalAmount,
    installments: struct.installments,
    amountPaid,
    balance,
    payments,
    isFullyPaid: balance <= 0,
  };
}

// ── Defaulters List ───────────────────────────────────────────────────────────

export async function getDefaulters(
  db: pg.Pool,
  schoolId: string,
  feeStructureId: string
): Promise<Defaulter[]> {
  const struct = await getFeeStructure(db, schoolId, feeStructureId);
  if (!struct) return [];

  const result = await db.query<{
    student_id: string;
    student_name: string;
    admission_number: string;
    class_name: string | null;
    amount_paid: string;
    last_payment_date: Date | null;
  }>(
    `SELECT
       s.id AS student_id,
       CONCAT(s.first_name, ' ', s.last_name) AS student_name,
       s.admission_number,
       CONCAT(c.name, CASE WHEN c.section IS NOT NULL THEN ' - ' || c.section ELSE '' END) AS class_name,
       COALESCE(SUM(fc.amount_paid), 0) AS amount_paid,
       MAX(fc.payment_date) AS last_payment_date
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id AND NOT c.is_deleted
     LEFT JOIN fee_collections fc
       ON fc.student_id = s.id AND fc.fee_structure_id = $2
     WHERE s.school_id = $1 AND NOT s.is_deleted
     GROUP BY s.id, s.first_name, s.last_name, s.admission_number, c.name, c.section
     HAVING COALESCE(SUM(fc.amount_paid), 0) < $3
     ORDER BY amount_paid ASC, s.first_name ASC`,
    [schoolId, feeStructureId, struct.totalAmount]
  );

  return result.rows.map(r => {
    const d = r.last_payment_date;
    return {
      studentId:       r.student_id,
      studentName:     r.student_name,
      admissionNumber: r.admission_number,
      className:       r.class_name,
      amountDue:       struct.totalAmount - parseInt(r.amount_paid, 10),
      amountPaid:      parseInt(r.amount_paid, 10),
      lastPaymentDate: d ? (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10) : null,
    };
  });
}
