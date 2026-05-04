// Avanti SME — Core Meta-Schema Seed
// Builds the initial MetaSchema for a newly provisioned school.
//
// All 7 core business tables are seeded with STABLE field IDs so the
// canvas can track changes across sessions without losing identity.
//
// ⚠️  WARNING: The IDs in this file are permanent constants.
//     Changing any ID severs the link between the DB column and the canvas.
//     Add new IDs at the bottom of each table's list; never renumber existing ones.

import type { MetaSchema, MetaTable, MetaField, FieldType } from '@avanti/types';

// ── Stable table IDs (NEVER CHANGE) ──────────────────────────────────────────

export const CORE_TABLE_IDS = {
  students:        '00001001-0000-0000-0000-000000000000',
  classes:         '00001002-0000-0000-0000-000000000000',
  staff:           '00001003-0000-0000-0000-000000000000',
  attendance:      '00001004-0000-0000-0000-000000000000',
  fee_structures:  '00001005-0000-0000-0000-000000000000',
  fee_collections: '00001006-0000-0000-0000-000000000000',
  timetable_slots: '00001007-0000-0000-0000-000000000000',
} as const;

// ── Internal helpers ──────────────────────────────────────────────────────────

function field(
  id: string,
  columnName: string,
  displayName: string,
  type: FieldType,
  nullable: boolean,
  opts?: {
    defaultValue?: unknown;
    enumValues?: string[];
  }
): MetaField {
  return {
    id,
    columnName,
    displayName,
    displayNames: {},
    type,
    nullable,
    defaultValue: opts?.defaultValue ?? null,
    enumValues:   opts?.enumValues   ?? null,
    isCore:       true,
    isHidden:     false,
    createdAt:    '2024-01-01T00:00:00.000Z',
    createdBy:    'system',
  };
}

function coreTable(
  id: string,
  tableName: string,
  displayName: string,
  fields: MetaField[],
  now: string
): MetaTable {
  return {
    id,
    tableName,
    displayName,
    displayNames: {},
    isCore:       true,
    isHidden:     false,
    fields,
    createdAt:    now,
  };
}

// ── Core table definitions ────────────────────────────────────────────────────
// System columns (id, school_id, created_at, updated_at, is_deleted) are
// intentionally omitted — they are always present and never configurable.

function buildStudentsTable(now: string): MetaTable {
  return coreTable(
    CORE_TABLE_IDS.students,
    'students',
    'Students',
    [
      field('00001001-0001-0000-0000-000000000000', 'admission_number', 'Admission No.', 'TEXT', false),
      field('00001001-0002-0000-0000-000000000000', 'first_name',       'First Name',    'TEXT', false),
      field('00001001-0003-0000-0000-000000000000', 'last_name',        'Last Name',     'TEXT', false),
      field('00001001-0004-0000-0000-000000000000', 'date_of_birth',    'Date of Birth', 'DATE', true),
      field('00001001-0005-0000-0000-000000000000', 'gender',           'Gender',        'ENUM', true, {
        enumValues: ['MALE', 'FEMALE', 'OTHER'],
      }),
      field('00001001-0006-0000-0000-000000000000', 'phone',        'Phone',        'TEXT', true),
      field('00001001-0007-0000-0000-000000000000', 'email',        'Email',        'TEXT', true),
      field('00001001-0008-0000-0000-000000000000', 'address',      'Address',      'TEXT', true),
      field('00001001-0009-0000-0000-000000000000', 'parent_name',  'Parent Name',  'TEXT', true),
      field('00001001-0010-0000-0000-000000000000', 'parent_phone', 'Parent Phone', 'TEXT', true),
      field('00001001-0011-0000-0000-000000000000', 'class_id',     'Class',        'UUID', true),
    ],
    now
  );
}

function buildClassesTable(now: string): MetaTable {
  return coreTable(
    CORE_TABLE_IDS.classes,
    'classes',
    'Classes',
    [
      field('00001002-0001-0000-0000-000000000000', 'name',          'Name',          'TEXT',    false),
      field('00001002-0002-0000-0000-000000000000', 'section',       'Section',       'TEXT',    true),
      field('00001002-0003-0000-0000-000000000000', 'academic_year', 'Academic Year', 'TEXT',    false),
      field('00001002-0004-0000-0000-000000000000', 'grade_level',   'Grade Level',   'INTEGER', true),
      field('00001002-0005-0000-0000-000000000000', 'teacher_id',    'Class Teacher', 'UUID',    true),
    ],
    now
  );
}

function buildStaffTable(now: string): MetaTable {
  return coreTable(
    CORE_TABLE_IDS.staff,
    'staff',
    'Staff',
    [
      field('00001003-0001-0000-0000-000000000000', 'employee_id',  'Employee ID',  'TEXT',    false),
      field('00001003-0002-0000-0000-000000000000', 'designation',  'Designation',  'TEXT',    false),
      field('00001003-0003-0000-0000-000000000000', 'department',   'Department',   'TEXT',    true),
      field('00001003-0004-0000-0000-000000000000', 'joining_date', 'Joining Date', 'DATE',    true),
      field('00001003-0005-0000-0000-000000000000', 'basic_salary', 'Basic Salary', 'INTEGER', false, { defaultValue: 0 }),
    ],
    now
  );
}

function buildAttendanceTable(now: string): MetaTable {
  return coreTable(
    CORE_TABLE_IDS.attendance,
    'attendance',
    'Attendance',
    [
      field('00001004-0001-0000-0000-000000000000', 'class_id',   'Class',   'UUID', false),
      field('00001004-0002-0000-0000-000000000000', 'student_id', 'Student', 'UUID', false),
      field('00001004-0003-0000-0000-000000000000', 'date',       'Date',    'DATE', false),
      field('00001004-0004-0000-0000-000000000000', 'status',     'Status',  'ENUM', false, {
        enumValues: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'],
      }),
    ],
    now
  );
}

function buildFeeStructuresTable(now: string): MetaTable {
  return coreTable(
    CORE_TABLE_IDS.fee_structures,
    'fee_structures',
    'Fee Structures',
    [
      field('00001005-0001-0000-0000-000000000000', 'name',           'Name',           'TEXT',    false),
      field('00001005-0002-0000-0000-000000000000', 'academic_year',  'Academic Year',  'TEXT',    false),
      field('00001005-0003-0000-0000-000000000000', 'total_amount',   'Total Amount',   'INTEGER', false),
      field('00001005-0004-0000-0000-000000000000', 'installments',   'Installments',   'INTEGER', false, { defaultValue: 1 }),
      field('00001005-0005-0000-0000-000000000000', 'late_fee_type',  'Late Fee Type',  'ENUM',    true, {
        enumValues: ['FLAT', 'PERCENTAGE'],
      }),
      field('00001005-0006-0000-0000-000000000000', 'late_fee_value', 'Late Fee Value', 'INTEGER', true),
    ],
    now
  );
}

function buildFeeCollectionsTable(now: string): MetaTable {
  return coreTable(
    CORE_TABLE_IDS.fee_collections,
    'fee_collections',
    'Fee Collections',
    [
      field('00001006-0001-0000-0000-000000000000', 'student_id',       'Student',       'UUID',    false),
      field('00001006-0002-0000-0000-000000000000', 'fee_structure_id', 'Fee Structure', 'UUID',    false),
      field('00001006-0003-0000-0000-000000000000', 'installment_no',   'Installment',   'INTEGER', false, { defaultValue: 1 }),
      field('00001006-0004-0000-0000-000000000000', 'amount_paid',      'Amount Paid',   'INTEGER', false),
      field('00001006-0005-0000-0000-000000000000', 'payment_date',     'Payment Date',  'DATE',    false),
      field('00001006-0006-0000-0000-000000000000', 'payment_mode',     'Payment Mode',  'ENUM',    false, {
        defaultValue: 'CASH',
        enumValues:   ['CASH', 'CHEQUE', 'ONLINE', 'DD'],
      }),
      field('00001006-0007-0000-0000-000000000000', 'receipt_number', 'Receipt No.', 'TEXT', false),
      field('00001006-0008-0000-0000-000000000000', 'remarks',        'Remarks',     'TEXT', true),
    ],
    now
  );
}

function buildTimetableSlotsTable(now: string): MetaTable {
  return coreTable(
    CORE_TABLE_IDS.timetable_slots,
    'timetable_slots',
    'Timetable Slots',
    [
      field('00001007-0001-0000-0000-000000000000', 'class_id',      'Class',         'UUID',    false),
      field('00001007-0002-0000-0000-000000000000', 'day_of_week',   'Day of Week',   'INTEGER', false),
      field('00001007-0003-0000-0000-000000000000', 'period_number', 'Period',        'INTEGER', false),
      // TIME type not in FieldType enum — stored as TEXT (e.g. "09:00")
      field('00001007-0004-0000-0000-000000000000', 'start_time', 'Start Time', 'TEXT', false),
      field('00001007-0005-0000-0000-000000000000', 'end_time',   'End Time',   'TEXT', false),
      field('00001007-0006-0000-0000-000000000000', 'subject',    'Subject',    'TEXT', false),
      field('00001007-0007-0000-0000-000000000000', 'teacher_id', 'Teacher',    'UUID', true),
      field('00001007-0008-0000-0000-000000000000', 'room',       'Room',       'TEXT', true),
    ],
    now
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Builds the seed MetaSchema for a newly provisioned school.
 * Contains all 7 core business tables. All tables and fields are marked
 * isCore=true so they cannot be deleted from the canvas.
 *
 * Custom tables added by school admins are appended after these.
 */
export function buildCoreMetaSchema(schoolId: string): MetaSchema {
  const now = new Date().toISOString();
  return {
    version:   1,
    schoolId,
    updatedAt: now,
    tables: [
      buildStudentsTable(now),
      buildClassesTable(now),
      buildStaffTable(now),
      buildAttendanceTable(now),
      buildFeeStructuresTable(now),
      buildFeeCollectionsTable(now),
      buildTimetableSlotsTable(now),
    ],
  };
}
