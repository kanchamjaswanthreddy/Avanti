// Avanti API — Payroll Routes
// GET  /api/v1/school/payroll/runs                    — list all payroll runs
// POST /api/v1/school/payroll/runs                    — create run + generate payslips
// GET  /api/v1/school/payroll/runs/:runId             — run detail + all payslips
// POST /api/v1/school/payroll/runs/:runId/finalize    — finalize run
// PATCH /api/v1/school/payroll/payslips/:id           — adjust paid_days / allowances
// POST  /api/v1/school/payroll/payslips/:id/pay       — mark payslip as paid

import type { FastifyPluginAsync } from 'fastify';
import { checkPermission } from '../../plugins/auth.js';
import * as payrollService from '../../services/payroll.service.js';

export const payrollRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /payroll/runs
  fastify.get(
    '/runs',
    { preHandler: [checkPermission('payroll', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const runs = await payrollService.listPayrollRuns(db, schoolId);
      return reply.send(runs);
    }
  );

  // GET /payroll/runs/:runId
  fastify.get<{ Params: { runId: string } }>(
    '/runs/:runId',
    { preHandler: [checkPermission('payroll', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const detail = await payrollService.getPayrollRun(db, schoolId, req.params.runId);
      if (!detail) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Payroll run not found.' });
      }
      return reply.send(detail);
    }
  );

  // POST /payroll/runs — create run + auto-generate payslips for all active staff
  fastify.post<{
    Body: {
      month:        string;  // 'YYYY-MM'
      academicYear: string;
      workingDays?: number;
    };
  }>(
    '/runs',
    {
      preHandler: [checkPermission('payroll', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['month', 'academicYear'],
          properties: {
            month:        { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            academicYear: { type: 'string', minLength: 4 },
            workingDays:  { type: 'number', minimum: 1, maximum: 31 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId, userId } = req.tenantCtx!;
      try {
        const detail = await payrollService.createPayrollRun(
          db, schoolId,
          req.body.month,
          req.body.academicYear,
          req.body.workingDays ?? 26,
          userId
        );
        return reply.code(201).send(detail);
      } catch (err) {
        if (err instanceof Error && err.message.includes('duplicate')) {
          return reply.code(409).send({
            error:   'CONFLICT',
            message: `A payroll run for ${req.body.month} already exists.`,
          });
        }
        throw err;
      }
    }
  );

  // POST /payroll/runs/:runId/finalize
  fastify.post<{ Params: { runId: string } }>(
    '/runs/:runId/finalize',
    { preHandler: [checkPermission('payroll', 'UPDATE')] },
    async (req, reply) => {
      const { db, schoolId, userId } = req.tenantCtx!;
      const run = await payrollService.finalizePayrollRun(db, schoolId, req.params.runId, userId);
      if (!run) {
        return reply.code(404).send({
          error:   'NOT_FOUND',
          message: 'Payroll run not found or already finalised.',
        });
      }
      return reply.send(run);
    }
  );

  // PATCH /payroll/payslips/:id — adjust paid_days, allowances, other_deductions, remarks
  fastify.patch<{
    Params: { id: string };
    Body: {
      paidDays?:        number;
      allowances?:      Array<{ label: string; amount: number }>;
      otherDeductions?: number;
      remarks?:         string;
    };
  }>(
    '/payslips/:id',
    {
      preHandler: [checkPermission('payroll', 'UPDATE')],
      schema: {
        body: {
          type: 'object',
          properties: {
            paidDays:        { type: 'number', minimum: 0, maximum: 31 },
            allowances: {
              type: 'array',
              items: {
                type: 'object',
                required: ['label', 'amount'],
                properties: {
                  label:  { type: 'string', minLength: 1 },
                  amount: { type: 'number', minimum: 0 },
                },
                additionalProperties: false,
              },
            },
            otherDeductions: { type: 'number', minimum: 0 },
            remarks:         { type: 'string', maxLength: 500 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;

      // Get working_days from the run this payslip belongs to
      const wdResult = await db.query<{ working_days: number }>(
        `SELECT r.working_days FROM payslips p
         JOIN payroll_runs r ON r.id = p.payroll_run_id
         WHERE p.id = $1 AND p.school_id = $2`,
        [req.params.id, schoolId]
      );
      const workingDays = wdResult.rows[0]?.working_days ?? 26;

      const slip = await payrollService.updatePayslip(
        db, schoolId, req.params.id, req.body, workingDays
      );
      if (!slip) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Payslip not found.' });
      }
      return reply.send(slip);
    }
  );

  // POST /payroll/payslips/:id/pay — mark as paid
  fastify.post<{
    Params: { id: string };
    Body: {
      paidAt:      string;
      paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI';
    };
  }>(
    '/payslips/:id/pay',
    {
      preHandler: [checkPermission('payroll', 'UPDATE')],
      schema: {
        body: {
          type: 'object',
          required: ['paidAt', 'paymentMode'],
          properties: {
            paidAt:      { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            paymentMode: { type: 'string', enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI'] },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const slip = await payrollService.markPayslipPaid(
        db, schoolId, req.params.id, req.body.paidAt, req.body.paymentMode
      );
      if (!slip) {
        return reply.code(404).send({
          error:   'NOT_FOUND',
          message: 'Payslip not found or already marked paid.',
        });
      }
      return reply.send(slip);
    }
  );
};
