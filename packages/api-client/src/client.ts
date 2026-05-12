// Avanti API Client
// Typed fetch client for all Avanti API endpoints.
// Works in browser (client components) and Node.js (server components).
// Token management: caller provides token; this client is stateless.

import type {
  MetaSchema,
  SchemaChangeDescriptor,
  SchemaChangeResult,
  CanvasLayout,
  VoiceTranscribeResult,
  Student,
  StudentListResult,
  StaffMember,
  StaffListResult,
  PayrollRun,
  PayrollRunDetail,
  Payslip,
  SchoolClass,
  ClassAttendanceResponse,
  AttendanceRecord,
  AttendanceSummary,
  StudentAttendanceHistory,
  FeeStructure,
  FeePayment,
  StudentFeeStatus,
  FeeDefaulter,
  WeeklyTimetable,
  TimetableSlot,
  ReportType,
  ReportJobResult,
} from '@avanti/types';

// ── Billing local types (not in shared @avanti/types — control-plane only) ────

export interface BillingSubscription {
  tier:             string;
  billingCycle:     string;
  amountPaise:      number;
  status:           string;
  currentPeriodEnd: string | null;
  razorpaySubId:    string | null;
}

export interface BillingInvoice {
  id:                string;
  razorpayInvoiceId: string;
  amountPaise:       number;
  status:            string;
  paidAt:            string | null;
  createdAt:         string;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;   // JWT access token; optional for public routes
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
}

export class AvantiApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AvantiApiError';
  }
}

// ── Client ────────────────────────────────────────────────────────────────────

export class AvantiApiClient {
  private baseUrl: string;
  private token: string | undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token   = options.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = undefined;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',  // sends httpOnly cookies for refresh token
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 204) return undefined as T;

    const data = await response.json() as T | ApiError;

    if (!response.ok) {
      const err = data as ApiError;
      throw new AvantiApiError(
        response.status,
        err.error ?? 'UNKNOWN',
        err.message ?? `HTTP ${response.status}`
      );
    }

    return data as T;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  async login(email: string, password: string, schoolId: string): Promise<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: string; schoolId: string };
  }> {
    return this.request('POST', '/api/v1/auth/login', { email, password, schoolId });
  }

  async refresh(schoolId: string): Promise<{ accessToken: string }> {
    return this.request('POST', '/api/v1/auth/refresh', { schoolId });
  }

  async logout(schoolId: string): Promise<void> {
    await this.request('POST', '/api/v1/auth/logout', { schoolId });
  }

  async forgotPassword(email: string, schoolId: string): Promise<void> {
    await this.request('POST', '/api/v1/auth/forgot-password', { email, schoolId });
  }

  async resetPassword(token: string, newPassword: string, schoolId: string): Promise<void> {
    await this.request('POST', '/api/v1/auth/reset-password', { token, newPassword, schoolId });
  }

  // ── Schema ──────────────────────────────────────────────────────────────────

  async getMetaSchema(): Promise<MetaSchema> {
    return this.request('GET', '/api/v1/schema/meta');
  }

  async applySchemaChanges(
    changes: SchemaChangeDescriptor[]
  ): Promise<SchemaChangeResult & { metaSchema: MetaSchema }> {
    return this.request('POST', '/api/v1/schema/change', { changes });
  }

  async getSchemaChangeLog(): Promise<Array<{
    id: string;
    version: number;
    appliedAt: string;
    appliedBy: string;
    changes: SchemaChangeDescriptor[];
  }>> {
    return this.request('GET', '/api/v1/schema/log');
  }

  // ── Canvas ──────────────────────────────────────────────────────────────────

  async loadCanvas(canvasId: string): Promise<{
    layout: CanvasLayout;
    metaSchema: MetaSchema;
  }> {
    return this.request('GET', `/api/v1/canvas/${encodeURIComponent(canvasId)}`);
  }

  async saveCanvas(
    canvasId: string,
    layout: CanvasLayout,
    changes: SchemaChangeDescriptor[]
  ): Promise<{
    layout: CanvasLayout;
    metaSchema: MetaSchema;
    changeResult: SchemaChangeResult;
  }> {
    return this.request('POST', `/api/v1/canvas/${encodeURIComponent(canvasId)}`, {
      layout,
      changes,
    });
  }

  // ── School ──────────────────────────────────────────────────────────────────

  // ── Classes ──────────────────────────────────────────────────────────────────

  async getClasses(params?: { academicYear?: string }): Promise<SchoolClass[]> {
    const qs = params?.academicYear ? `?academicYear=${encodeURIComponent(params.academicYear)}` : '';
    return this.request('GET', `/api/v1/school/classes${qs}`);
  }

  // ── Students ─────────────────────────────────────────────────────────────────

  async getStudents(params?: {
    page?: number;
    limit?: number;
    search?: string;
    classId?: string;
  }): Promise<StudentListResult> {
    const sp = new URLSearchParams();
    if (params?.page)    sp.set('page',    String(params.page));
    if (params?.limit)   sp.set('limit',   String(params.limit));
    if (params?.search)  sp.set('search',  params.search);
    if (params?.classId) sp.set('classId', params.classId);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request('GET', `/api/v1/school/students${qs}`);
  }

  async getStudent(id: string): Promise<Student> {
    return this.request('GET', `/api/v1/school/students/${encodeURIComponent(id)}`);
  }

  async createStudent(data: {
    admissionNumber: string;
    firstName: string;
    lastName: string;
    classId?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    phone?: string;
    email?: string;
    address?: string;
    parentName?: string;
    parentPhone?: string;
  }): Promise<Student> {
    return this.request('POST', '/api/v1/school/students', data);
  }

  async updateStudent(id: string, data: Partial<{
    admissionNumber: string;
    firstName: string;
    lastName: string;
    classId: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    phone: string;
    email: string;
    address: string;
    parentName: string;
    parentPhone: string;
  }>): Promise<Student> {
    return this.request('PATCH', `/api/v1/school/students/${encodeURIComponent(id)}`, data);
  }

  async deleteStudent(id: string): Promise<void> {
    await this.request('DELETE', `/api/v1/school/students/${encodeURIComponent(id)}`);
  }

  // ── Staff ────────────────────────────────────────────────────────────────────

  async getStaffMembers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
  }): Promise<StaffListResult> {
    const sp = new URLSearchParams();
    if (params?.page)       sp.set('page',       String(params.page));
    if (params?.limit)      sp.set('limit',      String(params.limit));
    if (params?.search)     sp.set('search',     params.search);
    if (params?.department) sp.set('department', params.department);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request('GET', `/api/v1/school/staff${qs}`);
  }

  async getStaffDepartments(): Promise<string[]> {
    return this.request('GET', '/api/v1/school/staff/departments');
  }

  async getStaffMember(id: string): Promise<StaffMember> {
    return this.request('GET', `/api/v1/school/staff/${encodeURIComponent(id)}`);
  }

  async createStaffMember(data: {
    employeeId:   string;
    firstName:    string;
    lastName:     string;
    designation:  string;
    email?:       string;
    phone?:       string;
    department?:  string;
    joiningDate?: string;
    basicSalary?: number;
    userId?:      string;
  }): Promise<StaffMember> {
    return this.request('POST', '/api/v1/school/staff', data);
  }

  async updateStaffMember(id: string, data: Partial<{
    employeeId:  string;
    firstName:   string;
    lastName:    string;
    designation: string;
    email:       string;
    phone:       string;
    department:  string;
    joiningDate: string;
    basicSalary: number;
    userId:      string;
  }>): Promise<StaffMember> {
    return this.request('PATCH', `/api/v1/school/staff/${encodeURIComponent(id)}`, data);
  }

  async deleteStaffMember(id: string): Promise<void> {
    await this.request('DELETE', `/api/v1/school/staff/${encodeURIComponent(id)}`);
  }

  // ── Payroll ───────────────────────────────────────────────────────────────────

  async listPayrollRuns(): Promise<PayrollRun[]> {
    return this.request('GET', '/api/v1/school/payroll/runs');
  }

  async getPayrollRun(runId: string): Promise<PayrollRunDetail> {
    return this.request('GET', `/api/v1/school/payroll/runs/${encodeURIComponent(runId)}`);
  }

  async createPayrollRun(data: {
    month:        string;
    academicYear: string;
    workingDays?: number;
  }): Promise<PayrollRunDetail> {
    return this.request('POST', '/api/v1/school/payroll/runs', data);
  }

  async finalizePayrollRun(runId: string): Promise<PayrollRun> {
    return this.request('POST', `/api/v1/school/payroll/runs/${encodeURIComponent(runId)}/finalize`);
  }

  async updatePayslip(id: string, data: {
    paidDays?:        number;
    allowances?:      Array<{ label: string; amount: number }>;
    otherDeductions?: number;
    remarks?:         string;
  }): Promise<Payslip> {
    return this.request('PATCH', `/api/v1/school/payroll/payslips/${encodeURIComponent(id)}`, data);
  }

  async markPayslipPaid(id: string, data: {
    paidAt:      string;
    paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI';
  }): Promise<Payslip> {
    return this.request('POST', `/api/v1/school/payroll/payslips/${encodeURIComponent(id)}/pay`, data);
  }

  // ── Reports ───────────────────────────────────────────────────────────────────

  async generateReport(data: {
    reportType: ReportType;
    params:     Record<string, unknown>;
  }): Promise<{ jobId: string; status: 'queued' }> {
    return this.request('POST', '/api/v1/school/reports/generate', data);
  }

  async getReportJob(jobId: string): Promise<ReportJobResult> {
    return this.request('GET', `/api/v1/school/reports/jobs/${encodeURIComponent(jobId)}`);
  }

  // ── Attendance ────────────────────────────────────────────────────────────────

  async getClassAttendance(classId: string, date: string): Promise<ClassAttendanceResponse> {
    return this.request(
      'GET',
      `/api/v1/school/attendance/${encodeURIComponent(classId)}/${encodeURIComponent(date)}`
    );
  }

  async markAttendance(
    classId: string,
    date: string,
    records: AttendanceRecord[]
  ): Promise<AttendanceSummary> {
    return this.request('POST', '/api/v1/school/attendance/mark', { classId, date, records });
  }

  async getStudentAttendanceHistory(
    studentId: string,
    params?: { from?: string; to?: string }
  ): Promise<StudentAttendanceHistory> {
    const sp = new URLSearchParams();
    if (params?.from) sp.set('from', params.from);
    if (params?.to)   sp.set('to',   params.to);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request('GET', `/api/v1/school/attendance/student/${encodeURIComponent(studentId)}${qs}`);
  }

  async getStudentAttendancePct(
    studentId: string,
    academicYear?: string
  ): Promise<{ studentId: string; academicYear: string; percentage: number; present: number; total: number }> {
    const qs = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
    return this.request('GET', `/api/v1/school/attendance/student/${encodeURIComponent(studentId)}/pct${qs}`);
  }

  // ── Fees ──────────────────────────────────────────────────────────────────────

  async getFeeStructures(academicYear?: string): Promise<FeeStructure[]> {
    const qs = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
    return this.request('GET', `/api/v1/school/fees/structures${qs}`);
  }

  async getFeeStructure(id: string): Promise<FeeStructure> {
    return this.request('GET', `/api/v1/school/fees/structures/${encodeURIComponent(id)}`);
  }

  async recordPayment(data: {
    studentId: string;
    feeStructureId: string;
    amountPaid: number;
    installmentNo?: number;
    paymentDate?: string;
    paymentMode?: 'CASH' | 'CHEQUE' | 'ONLINE' | 'DD';
    remarks?: string;
  }): Promise<FeePayment> {
    return this.request('POST', '/api/v1/school/fees/payments', data);
  }

  async getStudentFeeStatus(studentId: string, structureId: string): Promise<StudentFeeStatus> {
    return this.request(
      'GET',
      `/api/v1/school/fees/student/${encodeURIComponent(studentId)}/${encodeURIComponent(structureId)}`
    );
  }

  async getFeeDefaulters(structureId: string): Promise<FeeDefaulter[]> {
    return this.request('GET', `/api/v1/school/fees/defaulters/${encodeURIComponent(structureId)}`);
  }

  // ── Timetable ─────────────────────────────────────────────────────────────────

  async getWeeklyTimetable(classId: string): Promise<WeeklyTimetable> {
    return this.request('GET', `/api/v1/school/timetable/${encodeURIComponent(classId)}`);
  }

  async createTimetableSlot(data: {
    classId: string;
    dayOfWeek: number;
    periodNumber: number;
    startTime: string;
    endTime: string;
    subject: string;
    teacherId?: string;
    room?: string;
  }): Promise<TimetableSlot> {
    return this.request('POST', '/api/v1/school/timetable/slots', data);
  }

  async deleteTimetableSlot(id: string): Promise<void> {
    await this.request('DELETE', `/api/v1/school/timetable/slots/${encodeURIComponent(id)}`);
  }

  // ── Billing ───────────────────────────────────────────────────────────────────

  async getSubscription(): Promise<BillingSubscription> {
    return this.request('GET', '/api/v1/school/billing');
  }

  async createSubscription(data: {
    tier:              'starter' | 'growth' | 'enterprise';
    billingCycle:      'monthly' | 'annual';
    customerName:      string;
    customerEmail:     string;
    customerContact?:  string;
  }): Promise<{ subscriptionId: string; paymentUrl: string }> {
    return this.request('POST', '/api/v1/school/billing/subscribe', data);
  }

  async cancelSubscription(): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/api/v1/school/billing/cancel');
  }

  async listBillingInvoices(): Promise<BillingInvoice[]> {
    return this.request('GET', '/api/v1/school/billing/invoices');
  }

  // ── AI Voice ─────────────────────────────────────────────────────────────────

  async transcribeVoice(audioBlob: Blob): Promise<VoiceTranscribeResult> {
    const form = new FormData();
    form.append('file', audioBlob);

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(`${this.baseUrl}/api/v1/ai/voice/transcribe`, {
      method:      'POST',
      headers,
      credentials: 'include',
      body:        form,
    });

    if (!response.ok) {
      const err = await response.json() as ApiError;
      throw new AvantiApiError(
        response.status,
        err.error   ?? 'UNKNOWN',
        err.message ?? `HTTP ${response.status}`
      );
    }

    return response.json() as Promise<VoiceTranscribeResult>;
  }

  async speak(text: string, language?: string): Promise<{ audio: string; format: string; encoding: string }> {
    return this.request('POST', '/api/v1/ai/voice/speak', { text, language });
  }
}
