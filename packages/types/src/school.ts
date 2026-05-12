// Avanti — School Module Types
// Students, Classes, Attendance, Fees, Timetable

// ── Classes ───────────────────────────────────────────────────────────────────

export interface SchoolClass {
  id:            string;
  schoolId:      string;
  name:          string;
  section?:      string | null;
  academicYear:  string;
  classTeacherId?: string | null;
  createdAt:     string;
}

// ── Students ──────────────────────────────────────────────────────────────────

export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Student {
  id:               string;
  schoolId:         string;
  classId?:         string | null;
  admissionNumber:  string;
  firstName:        string;
  lastName:         string;
  dateOfBirth?:     string | null;
  gender?:          StudentGender | null;
  phone?:           string | null;
  email?:           string | null;
  address?:         string | null;
  parentName?:      string | null;
  parentPhone?:     string | null;
  isActive:         boolean;
  createdAt:        string;
  // Joined fields (optional — populated by some endpoints)
  className?:       string | null;
}

export interface StudentListResult {
  data:  Student[];
  total: number;
  page:  number;
  limit: number;
}

// ── Attendance ────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE';

export interface AttendanceRecord {
  studentId: string;
  status:    AttendanceStatus;
  markedAt?: string | null;
  markedBy?: string | null;
}

export interface AttendanceSummary {
  classId:   string;
  date:      string;
  total:     number;
  present:   number;
  absent:    number;
  halfDay:   number;
  late:      number;
  records?:  AttendanceRecord[];
}

export interface AttendanceRosterEntry {
  studentId:      string;
  firstName:      string;
  lastName:       string;
  admissionNumber: string;
  status:         AttendanceStatus | null;  // null if not yet marked
}

export interface ClassAttendanceResponse {
  classId:  string;
  date:     string;
  roster:   AttendanceRosterEntry[];
  summary:  AttendanceSummary;
}

export interface StudentAttendanceHistory {
  studentId: string;
  from:      string;
  to:        string;
  history:   Array<{ date: string; status: AttendanceStatus }>;
}

// ── Fees ──────────────────────────────────────────────────────────────────────

export type LateFeeType  = 'FLAT' | 'PERCENTAGE';
export type PaymentMode  = 'CASH' | 'CHEQUE' | 'ONLINE' | 'DD';

export interface FeeItem {
  id?:        string;
  label:      string;
  amount:     number;
  sortOrder?: number;
}

export interface FeeStructure {
  id:            string;
  schoolId:      string;
  name:          string;
  academicYear:  string;
  installments:  number;
  lateFeeType?:  LateFeeType | null;
  lateFeeValue?: number | null;
  items:         FeeItem[];
  totalAmount:   number;
  createdAt:     string;
}

export interface FeePayment {
  id:              string;
  schoolId:        string;
  studentId:       string;
  feeStructureId:  string;
  installmentNo?:  number | null;
  amountPaid:      number;
  paymentDate:     string;
  paymentMode:     PaymentMode;
  remarks?:        string | null;
  recordedBy:      string;
  createdAt:       string;
}

export interface StudentFeeStatus {
  studentId:       string;
  feeStructureId:  string;
  totalDue:        number;
  totalPaid:       number;
  balance:         number;
  payments:        FeePayment[];
  isFullyPaid:     boolean;
}

export interface FeeDefaulter {
  studentId:       string;
  firstName:       string;
  lastName:        string;
  admissionNumber: string;
  className?:      string | null;
  totalDue:        number;
  totalPaid:       number;
  balance:         number;
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export type PayrollRunStatus  = 'DRAFT' | 'FINALISED';
export type PayslipStatus     = 'DRAFT' | 'GENERATED' | 'PAID';
export type PayslipPaymentMode = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI';

export interface SalaryAllowance {
  label:  string;
  amount: number;  // rupees
}

export interface PayrollRun {
  id:           string;
  schoolId:     string;
  month:        string;         // 'YYYY-MM'
  academicYear: string;
  workingDays:  number;
  status:       PayrollRunStatus;
  createdBy:    string;
  createdAt:    string;
  finalizedAt:  string | null;
  finalizedBy:  string | null;
  // Summary (joined)
  staffCount?:  number;
  totalNet?:    number;
}

export interface Payslip {
  id:             string;
  schoolId:       string;
  payrollRunId:   string;
  staffId:        string;
  // Staff info (joined)
  employeeId?:    string;
  staffName?:     string;
  designation?:   string;
  department?:    string | null;
  // Inputs
  basicSalary:    number;
  paidDays:       number;
  allowances:     SalaryAllowance[];
  // Computed
  earnedBasic:    number;
  grossSalary:    number;
  pfEmployee:     number;
  pfEmployer:     number;
  esiEmployee:    number;
  esiEmployer:    number;
  tds:            number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary:      number;
  // Payment
  status:         PayslipStatus;
  paidAt:         string | null;
  paymentMode:    PayslipPaymentMode | null;
  remarks:        string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface PayrollRunDetail extends PayrollRun {
  payslips: Payslip[];
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export interface StaffMember {
  id:           string;
  schoolId:     string;
  userId:       string | null;
  employeeId:   string;
  firstName:    string;
  lastName:     string;
  email:        string | null;
  phone:        string | null;
  designation:  string;
  department:   string | null;
  joiningDate:  string | null;  // ISO date "YYYY-MM-DD"
  basicSalary:  number;
  createdAt:    string;
  updatedAt:    string;
}

export interface StaffListResult {
  data:       StaffMember[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── Timetable ─────────────────────────────────────────────────────────────────

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface TimetableSlot {
  id:           string;
  schoolId:     string;
  classId:      string;
  dayOfWeek:    DayOfWeek;
  periodNumber: number;
  startTime:    string;  // HH:mm
  endTime:      string;  // HH:mm
  subject:      string;
  teacherId?:   string | null;
  teacherName?: string | null;
  room?:        string | null;
}

export interface WeeklyTimetable {
  classId: string;
  slots:   TimetableSlot[];
}

// ── Reports ───────────────────────────────────────────────────────────────────

export type ReportType =
  | 'attendance_summary'
  | 'fee_collection'
  | 'student_list'
  | 'class_performance';

export type ReportJobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'unknown';

export interface ReportJobResult {
  jobId:        string;
  reportType:   ReportType;
  status:       ReportJobStatus;
  progress:     number;           // 0–100
  generatedAt:  string | null;
  rowCount:     number;
  rows:         Record<string, unknown>[];
  summary:      Record<string, unknown> | null;
  error:        string | null;
}

export interface GenerateReportRequest {
  reportType:  ReportType;
  params:      Record<string, unknown>;
}
