// Avanti API — Payroll Service
// Indian payroll rules (CLAUDE.md):
//   PF:  12% employee + 12% employer on basic salary (capped at ₹15,000 pensionable salary)
//   ESI: 0.75% employee + 3.25% employer on gross salary if gross < ₹21,000/month
//   TDS: annualized gross → new tax regime slabs → divide by 12 (87A rebate ≤ ₹7L)
// All amounts in whole rupees (INR).

import type pg from 'pg';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SalaryAllowance {
  label:  string;
  amount: number;
}

export interface PayslipComputation {
  earnedBasic:     number;
  grossSalary:     number;
  pfEmployee:      number;
  pfEmployer:      number;
  esiEmployee:     number;
  esiEmployer:     number;
  tds:             number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary:       number;
}

export interface PayrollRunRecord {
  id:           string;
  schoolId:     string;
  month:        string;
  academicYear: string;
  workingDays:  number;
  status:       'DRAFT' | 'FINALISED';
  createdBy:    string;
  createdAt:    Date;
  finalizedAt:  Date | null;
  finalizedBy:  string | null;
  staffCount:   number;
  totalNet:     number;
}

export interface PayslipRecord {
  id:              string;
  schoolId:        string;
  payrollRunId:    string;
  staffId:         string;
  employeeId:      string;
  staffName:       string;
  designation:     string;
  department:      string | null;
  basicSalary:     number;
  paidDays:        number;
  allowances:      SalaryAllowance[];
  earnedBasic:     number;
  grossSalary:     number;
  pfEmployee:      number;
  pfEmployer:      number;
  esiEmployee:     number;
  esiEmployer:     number;
  tds:             number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary:       number;
  status:          'DRAFT' | 'GENERATED' | 'PAID';
  paidAt:          Date | null;
  paymentMode:     string | null;
  remarks:         string | null;
  createdAt:       Date;
  updatedAt:       Date;
}

// ── DB Row types ───────────────────────────────────────────────────────────────

interface PayrollRunRow {
  id:            string;
  school_id:     string;
  month:         string;
  academic_year: string;
  working_days:  number;
  status:        string;
  created_by:    string;
  created_at:    Date;
  finalized_at:  Date | null;
  finalized_by:  string | null;
  staff_count:   string;
  total_net:     string;
}

interface PayslipRow {
  id:               string;
  school_id:        string;
  payroll_run_id:   string;
  staff_id:         string;
  employee_id:      string;
  staff_name:       string;
  designation:      string;
  department:       string | null;
  basic_salary:     number;
  paid_days:        number;
  allowances:       SalaryAllowance[];
  earned_basic:     number;
  gross_salary:     number;
  pf_employee:      number;
  pf_employer:      number;
  esi_employee:     number;
  esi_employer:     number;
  tds:              number;
  other_deductions: number;
  total_deductions: number;
  net_salary:       number;
  status:           string;
  paid_at:          Date | null;
  payment_mode:     string | null;
  remarks:          string | null;
  created_at:       Date;
  updated_at:       Date;
}

// ── Converters ────────────────────────────────────────────────────────────────

function toRunRecord(row: PayrollRunRow): PayrollRunRecord {
  return {
    id:           row.id,
    schoolId:     row.school_id,
    month:        row.month,
    academicYear: row.academic_year,
    workingDays:  row.working_days,
    status:       row.status as PayrollRunRecord['status'],
    createdBy:    row.created_by,
    createdAt:    row.created_at,
    finalizedAt:  row.finalized_at,
    finalizedBy:  row.finalized_by,
    staffCount:   parseInt(row.staff_count ?? '0', 10),
    totalNet:     parseInt(row.total_net   ?? '0', 10),
  };
}

function toPayslipRecord(row: PayslipRow): PayslipRecord {
  return {
    id:              row.id,
    schoolId:        row.school_id,
    payrollRunId:    row.payroll_run_id,
    staffId:         row.staff_id,
    employeeId:      row.employee_id,
    staffName:       row.staff_name,
    designation:     row.designation,
    department:      row.department,
    basicSalary:     row.basic_salary,
    paidDays:        row.paid_days,
    allowances:      Array.isArray(row.allowances) ? row.allowances : [],
    earnedBasic:     row.earned_basic,
    grossSalary:     row.gross_salary,
    pfEmployee:      row.pf_employee,
    pfEmployer:      row.pf_employer,
    esiEmployee:     row.esi_employee,
    esiEmployer:     row.esi_employer,
    tds:             row.tds,
    otherDeductions: row.other_deductions,
    totalDeductions: row.total_deductions,
    netSalary:       row.net_salary,
    status:          row.status as PayslipRecord['status'],
    paidAt:          row.paid_at,
    paymentMode:     row.payment_mode,
    remarks:         row.remarks,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

// ── Indian Payroll Calculation Engine ─────────────────────────────────────────

/**
 * New Tax Regime slabs (FY 2024-25, India).
 * Standard deduction ₹75,000 applied before calling this.
 * Section 87A rebate: if taxable income ≤ ₹7,00,000 → tax = 0.
 * Health + Education cess: 4% on tax.
 */
function newRegimeTax(taxableIncome: number): number {
  if (taxableIncome <= 300_000) return 0;

  let tax = 0;
  // 5%  on ₹3L–₹6L
  tax += Math.min(Math.max(taxableIncome - 300_000, 0), 300_000) * 0.05;
  // 10% on ₹6L–₹9L
  tax += Math.min(Math.max(taxableIncome - 600_000, 0), 300_000) * 0.10;
  // 15% on ₹9L–₹12L
  tax += Math.min(Math.max(taxableIncome - 900_000, 0), 300_000) * 0.15;
  // 20% on ₹12L–₹15L
  tax += Math.min(Math.max(taxableIncome - 1_200_000, 0), 300_000) * 0.20;
  // 30% above ₹15L
  tax += Math.max(taxableIncome - 1_500_000, 0) * 0.30;

  // Section 87A: total income ≤ ₹7L → no tax
  if (taxableIncome <= 700_000) return 0;

  // 4% health + education cess
  return Math.round(tax * 1.04);
}

export function computePayslip(input: {
  basicSalary:     number;   // rupees/month (full month)
  workingDays:     number;   // total working days in the month
  paidDays:        number;   // days actually paid
  allowances:      SalaryAllowance[];
  otherDeductions?: number;
}): PayslipComputation {
  const workingDays = Math.max(1, input.workingDays);
  const paidDays    = Math.min(input.paidDays, workingDays);

  // Pro-rated basic for days worked
  const earnedBasic = Math.round((input.basicSalary / workingDays) * paidDays);

  const totalAllowances = input.allowances.reduce((s, a) => s + a.amount, 0);
  const grossSalary     = earnedBasic + totalAllowances;

  // PF: 12% employee + 12% employer on basic (pensionable salary capped at ₹15,000)
  const pfBasic    = Math.min(earnedBasic, 15_000);
  const pfEmployee = Math.round(pfBasic * 0.12);
  const pfEmployer = Math.round(pfBasic * 0.12);

  // ESI: only if gross < ₹21,000/month
  let esiEmployee = 0;
  let esiEmployer = 0;
  if (grossSalary < 21_000) {
    esiEmployee = Math.round(grossSalary * 0.0075);
    esiEmployer = Math.round(grossSalary * 0.0325);
  }

  // TDS: annualize gross → apply new regime slabs → monthly amount
  const annualGross      = grossSalary * 12;
  const standardDeduction = 75_000;
  const taxableIncome    = Math.max(0, annualGross - standardDeduction);
  const annualTax        = newRegimeTax(taxableIncome);
  const tds              = Math.round(annualTax / 12);

  const otherDeductions  = input.otherDeductions ?? 0;
  const totalDeductions  = pfEmployee + esiEmployee + tds + otherDeductions;
  const netSalary        = grossSalary - totalDeductions;

  return {
    earnedBasic,
    grossSalary,
    pfEmployee,
    pfEmployer,
    esiEmployee,
    esiEmployer,
    tds,
    otherDeductions,
    totalDeductions,
    netSalary,
  };
}

// ── Payroll Run Functions ─────────────────────────────────────────────────────

export async function listPayrollRuns(
  db: pg.Pool,
  schoolId: string
): Promise<PayrollRunRecord[]> {
  const result = await db.query<PayrollRunRow>(
    `SELECT
       r.*,
       COUNT(p.id)          AS staff_count,
       COALESCE(SUM(p.net_salary), 0) AS total_net
     FROM payroll_runs r
     LEFT JOIN payslips p ON p.payroll_run_id = r.id
     WHERE r.school_id = $1
     GROUP BY r.id
     ORDER BY r.month DESC`,
    [schoolId]
  );
  return result.rows.map(toRunRecord);
}

export async function getPayrollRun(
  db: pg.Pool,
  schoolId: string,
  runId: string
): Promise<{ run: PayrollRunRecord; payslips: PayslipRecord[] } | null> {
  const runResult = await db.query<PayrollRunRow>(
    `SELECT r.*,
       COUNT(p.id)                    AS staff_count,
       COALESCE(SUM(p.net_salary), 0) AS total_net
     FROM payroll_runs r
     LEFT JOIN payslips p ON p.payroll_run_id = r.id
     WHERE r.school_id = $1 AND r.id = $2
     GROUP BY r.id`,
    [schoolId, runId]
  );
  const runRow = runResult.rows[0];
  if (!runRow) return null;

  const slipResult = await db.query<PayslipRow>(
    `SELECT
       p.*,
       s.employee_id,
       CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
       s.designation,
       s.department
     FROM payslips p
     JOIN staff s ON s.id = p.staff_id
     WHERE p.payroll_run_id = $1
     ORDER BY s.first_name, s.last_name`,
    [runId]
  );

  return {
    run:      toRunRecord(runRow),
    payslips: slipResult.rows.map(toPayslipRecord),
  };
}

/**
 * Create a new payroll run and generate DRAFT payslips for all active staff.
 * If a run already exists for this month, throws a duplicate error.
 */
export async function createPayrollRun(
  db: pg.Pool,
  schoolId: string,
  month: string,        // 'YYYY-MM'
  academicYear: string, // '2024-25'
  workingDays: number,
  createdBy: string
): Promise<{ run: PayrollRunRecord; payslips: PayslipRecord[] }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Create run
    const runResult = await client.query<{ id: string }>(
      `INSERT INTO payroll_runs
         (school_id, month, academic_year, working_days, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [schoolId, month, academicYear, workingDays, createdBy]
    );
    const runId = runResult.rows[0]?.id;
    if (!runId) throw new Error('Payroll run insert returned no id.');

    // Fetch all active staff with their basic salary
    const staffResult = await client.query<{
      id: string;
      basic_salary: number;
    }>(
      `SELECT id, basic_salary FROM staff
       WHERE school_id = $1 AND NOT is_deleted`,
      [schoolId]
    );

    // Generate draft payslip for each staff member
    for (const staff of staffResult.rows) {
      const computed = computePayslip({
        basicSalary: staff.basic_salary,
        workingDays,
        paidDays:    workingDays,  // default: full month, admin adjusts later
        allowances:  [],
      });

      await client.query(
        `INSERT INTO payslips (
           school_id, payroll_run_id, staff_id,
           basic_salary, paid_days, allowances,
           earned_basic, gross_salary,
           pf_employee, pf_employer, esi_employee, esi_employer,
           tds, other_deductions, total_deductions, net_salary,
           status
         ) VALUES (
           $1, $2, $3,
           $4, $5, $6,
           $7, $8,
           $9, $10, $11, $12,
           $13, $14, $15, $16,
           'GENERATED'
         )`,
        [
          schoolId, runId, staff.id,
          staff.basic_salary, workingDays, '[]',
          computed.earnedBasic, computed.grossSalary,
          computed.pfEmployee, computed.pfEmployer,
          computed.esiEmployee, computed.esiEmployer,
          computed.tds, computed.otherDeductions,
          computed.totalDeductions, computed.netSalary,
        ]
      );
    }

    await client.query('COMMIT');
    const detail = await getPayrollRun(db, schoolId, runId);
    if (!detail) throw new Error('Payroll run created but could not be fetched.');
    return detail;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function finalizePayrollRun(
  db: pg.Pool,
  schoolId: string,
  runId: string,
  userId: string
): Promise<PayrollRunRecord | null> {
  const result = await db.query(
    `UPDATE payroll_runs
     SET status = 'FINALISED', finalized_at = now(), finalized_by = $3
     WHERE id = $1 AND school_id = $2 AND status = 'DRAFT'`,
    [runId, schoolId, userId]
  );
  if ((result.rowCount ?? 0) === 0) return null;

  const runResult = await db.query<PayrollRunRow>(
    `SELECT r.*,
       COUNT(p.id)                    AS staff_count,
       COALESCE(SUM(p.net_salary), 0) AS total_net
     FROM payroll_runs r
     LEFT JOIN payslips p ON p.payroll_run_id = r.id
     WHERE r.school_id = $1 AND r.id = $2
     GROUP BY r.id`,
    [schoolId, runId]
  );
  return runResult.rows[0] ? toRunRecord(runResult.rows[0]) : null;
}

// ── Payslip Functions ─────────────────────────────────────────────────────────

export async function updatePayslip(
  db: pg.Pool,
  schoolId: string,
  payslipId: string,
  input: {
    paidDays?:        number;
    allowances?:      SalaryAllowance[];
    otherDeductions?: number;
    remarks?:         string;
  },
  workingDays: number
): Promise<PayslipRecord | null> {
  // Fetch current payslip to get basic_salary and merge inputs
  const current = await db.query<{
    basic_salary: number;
    paid_days: number;
    allowances: SalaryAllowance[];
    other_deductions: number;
  }>(
    `SELECT basic_salary, paid_days, allowances, other_deductions
     FROM payslips WHERE id = $1 AND school_id = $2`,
    [payslipId, schoolId]
  );
  const cur = current.rows[0];
  if (!cur) return null;

  const paidDays        = input.paidDays        ?? cur.paid_days;
  const allowances      = input.allowances       ?? (Array.isArray(cur.allowances) ? cur.allowances : []);
  const otherDeductions = input.otherDeductions  ?? cur.other_deductions;

  const computed = computePayslip({
    basicSalary: cur.basic_salary,
    workingDays,
    paidDays,
    allowances,
    otherDeductions,
  });

  const sets: string[] = [
    'paid_days = $3',
    'allowances = $4',
    'other_deductions = $5',
    'earned_basic = $6',
    'gross_salary = $7',
    'pf_employee = $8',
    'pf_employer = $9',
    'esi_employee = $10',
    'esi_employer = $11',
    'tds = $12',
    'total_deductions = $13',
    'net_salary = $14',
  ];
  const params: unknown[] = [
    payslipId, schoolId,
    paidDays, JSON.stringify(allowances), otherDeductions,
    computed.earnedBasic, computed.grossSalary,
    computed.pfEmployee, computed.pfEmployer,
    computed.esiEmployee, computed.esiEmployer,
    computed.tds, computed.totalDeductions, computed.netSalary,
  ];

  if (input.remarks !== undefined) {
    sets.push(`remarks = $${params.length + 1}`);
    params.push(input.remarks);
  }

  await db.query(
    `UPDATE payslips SET ${sets.join(', ')}
     WHERE id = $1 AND school_id = $2`,
    params
  );

  return getPayslip(db, schoolId, payslipId);
}

export async function markPayslipPaid(
  db: pg.Pool,
  schoolId: string,
  payslipId: string,
  paidAt: string,
  paymentMode: string
): Promise<PayslipRecord | null> {
  const result = await db.query(
    `UPDATE payslips
     SET status = 'PAID', paid_at = $3::date, payment_mode = $4
     WHERE id = $1 AND school_id = $2 AND status != 'PAID'`,
    [payslipId, schoolId, paidAt, paymentMode]
  );
  if ((result.rowCount ?? 0) === 0) return null;
  return getPayslip(db, schoolId, payslipId);
}

async function getPayslip(
  db: pg.Pool,
  schoolId: string,
  payslipId: string
): Promise<PayslipRecord | null> {
  const result = await db.query<PayslipRow>(
    `SELECT
       p.*,
       s.employee_id,
       CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
       s.designation,
       s.department
     FROM payslips p
     JOIN staff s ON s.id = p.staff_id
     WHERE p.id = $1 AND p.school_id = $2`,
    [payslipId, schoolId]
  );
  return result.rows[0] ? toPayslipRecord(result.rows[0]) : null;
}
