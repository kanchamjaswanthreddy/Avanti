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
