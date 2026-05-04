// Vidyut API — Fees Routes
// POST   /api/v1/school/fees/structures               — create fee structure
// GET    /api/v1/school/fees/structures               — list fee structures
// GET    /api/v1/school/fees/structures/:id           — get single structure
// POST   /api/v1/school/fees/payments                 — record payment
// GET    /api/v1/school/fees/payments/:id             — get payment by id
// GET    /api/v1/school/fees/student/:studentId/:structureId — student fee status
// GET    /api/v1/school/fees/defaulters/:structureId  — defaulters list

import type { FastifyPluginAsync } from 'fastify';
import { checkPermission } from '../../plugins/auth.js';
import * as feeService from '../../services/fees.service.js';

export const feeRoutes: FastifyPluginAsync = async (fastify) => {

  // ── Fee Structures ──────────────────────────────────────────────────────────

  // POST /fees/structures
  fastify.post<{
    Body: {
      name: string;
      academicYear: string;
      installments?: number;
      lateFeeType?: 'FLAT' | 'PERCENTAGE';
      lateFeeValue?: number;
      items: Array<{ label: string; amount: number; sortOrder?: number }>;
    };
  }>(
    '/structures',
    {
      preHandler: [checkPermission('fees', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'academicYear', 'items'],
          properties: {
            name:          { type: 'string', minLength: 1, maxLength: 200 },
            academicYear:  { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            installments:  { type: 'integer', minimum: 1, maximum: 12 },
            lateFeeType:   { type: 'string', enum: ['FLAT', 'PERCENTAGE'] },
            lateFeeValue:  { type: 'integer', minimum: 0 },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['label', 'amount'],
                properties: {
                  label:     { type: 'string', minLength: 1, maxLength: 200 },
                  amount:    { type: 'integer', minimum: 1 },
                  sortOrder: { type: 'integer', minimum: 0 },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const structure = await feeService.createFeeStructure(db, schoolId, req.body);
      return reply.code(201).send(structure);
    }
  );

  // GET /fees/structures
  fastify.get<{
    Querystring: { academicYear?: string };
  }>(
    '/structures',
    { preHandler: [checkPermission('fees', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const structures = await feeService.listFeeStructures(db, schoolId, req.query.academicYear);
      return reply.send(structures);
    }
  );

  // GET /fees/structures/:id
  fastify.get<{ Params: { id: string } }>(
    '/structures/:id',
    { preHandler: [checkPermission('fees', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const structure = await feeService.getFeeStructure(db, schoolId, req.params.id);
      if (!structure) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Fee structure not found.' });
      }
      return reply.send(structure);
    }
  );

  // ── Payments ────────────────────────────────────────────────────────────────

  // POST /fees/payments
  fastify.post<{
    Body: {
      studentId: string;
      feeStructureId: string;
      installmentNo?: number;
      amountPaid: number;
      paymentDate?: string;
      paymentMode?: 'CASH' | 'CHEQUE' | 'ONLINE' | 'DD';
      remarks?: string;
    };
  }>(
    '/payments',
    {
      preHandler: [checkPermission('fees', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['studentId', 'feeStructureId', 'amountPaid'],
          properties: {
            studentId:      { type: 'string' },
            feeStructureId: { type: 'string' },
            installmentNo:  { type: 'integer', minimum: 1 },
            amountPaid:     { type: 'integer', minimum: 1 },
            paymentDate:    { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            paymentMode:    { type: 'string', enum: ['CASH', 'CHEQUE', 'ONLINE', 'DD'] },
            remarks:        { type: 'string', maxLength: 500 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId, userId } = req.tenantCtx!;
      const payment = await feeService.recordPayment(db, schoolId, req.body, userId);
      return reply.code(201).send(payment);
    }
  );

  // GET /fees/payments/:id
  fastify.get<{ Params: { id: string } }>(
    '/payments/:id',
    { preHandler: [checkPermission('fees', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const payment = await feeService.getPayment(db, schoolId, req.params.id);
      if (!payment) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Payment not found.' });
      }
      return reply.send(payment);
    }
  );

  // ── Student Fee Status & Defaulters ─────────────────────────────────────────

  // GET /fees/student/:studentId/:structureId — what's paid / what's due
  fastify.get<{
    Params: { studentId: string; structureId: string };
  }>(
    '/student/:studentId/:structureId',
    { preHandler: [checkPermission('fees', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const status = await feeService.getStudentFeeStatus(
        db, schoolId, req.params.studentId, req.params.structureId
      );
      if (!status) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Fee structure not found.' });
      }
      return reply.send(status);
    }
  );

  // GET /fees/defaulters/:structureId
  fastify.get<{
    Params: { structureId: string };
  }>(
    '/defaulters/:structureId',
    { preHandler: [checkPermission('fees', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const defaulters = await feeService.getDefaulters(db, schoolId, req.params.structureId);
      return reply.send(defaulters);
    }
  );
};
