// Avanti API — Staff Routes
// GET    /api/v1/school/staff              — list with pagination, search, department filter
// POST   /api/v1/school/staff              — create staff member
// GET    /api/v1/school/staff/departments  — distinct department list
// GET    /api/v1/school/staff/:id          — get single staff member
// PATCH  /api/v1/school/staff/:id          — update staff member
// DELETE /api/v1/school/staff/:id          — soft delete

import type { FastifyPluginAsync } from 'fastify';
import { checkPermission } from '../../plugins/auth.js';
import * as staffService from '../../services/staff.service.js';

export const staffRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /staff
  fastify.get<{
    Querystring: {
      page?:       string;
      limit?:      string;
      search?:     string;
      department?: string;
    };
  }>(
    '/',
    { preHandler: [checkPermission('staff', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const opts: staffService.ListStaffOptions = {};
      if (req.query.page)       opts.page       = parseInt(req.query.page, 10);
      if (req.query.limit)      opts.limit      = parseInt(req.query.limit, 10);
      if (req.query.search)     opts.search     = req.query.search;
      if (req.query.department) opts.department = req.query.department;
      const result = await staffService.listStaff(db, schoolId, opts);
      return reply.send(result);
    }
  );

  // GET /staff/departments
  fastify.get(
    '/departments',
    { preHandler: [checkPermission('staff', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const departments = await staffService.listDepartments(db, schoolId);
      return reply.send(departments);
    }
  );

  // GET /staff/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [checkPermission('staff', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const member = await staffService.getStaff(db, schoolId, req.params.id);
      if (!member) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Staff member not found.' });
      }
      return reply.send(member);
    }
  );

  // POST /staff
  fastify.post<{
    Body: {
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
    };
  }>(
    '/',
    {
      preHandler: [checkPermission('staff', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['employeeId', 'firstName', 'lastName', 'designation'],
          properties: {
            employeeId:   { type: 'string', minLength: 1, maxLength: 50 },
            firstName:    { type: 'string', minLength: 1, maxLength: 100 },
            lastName:     { type: 'string', minLength: 1, maxLength: 100 },
            designation:  { type: 'string', minLength: 1, maxLength: 100 },
            email:        { type: 'string', maxLength: 200 },
            phone:        { type: 'string', maxLength: 20 },
            department:   { type: 'string', maxLength: 100 },
            joiningDate:  { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            basicSalary:  { type: 'number', minimum: 0 },
            userId:       { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      try {
        const member = await staffService.createStaff(db, schoolId, req.body);
        return reply.code(201).send(member);
      } catch (err) {
        if (err instanceof Error && err.message.includes('duplicate')) {
          return reply.code(409).send({
            error:   'CONFLICT',
            message: 'Employee ID already exists for this school.',
          });
        }
        throw err;
      }
    }
  );

  // PATCH /staff/:id
  fastify.patch<{
    Params: { id: string };
    Body: {
      employeeId?:  string;
      firstName?:   string;
      lastName?:    string;
      designation?: string;
      email?:       string;
      phone?:       string;
      department?:  string;
      joiningDate?: string;
      basicSalary?: number;
      userId?:      string;
    };
  }>(
    '/:id',
    {
      preHandler: [checkPermission('staff', 'UPDATE')],
      schema: {
        body: {
          type: 'object',
          properties: {
            employeeId:   { type: 'string', minLength: 1, maxLength: 50 },
            firstName:    { type: 'string', minLength: 1, maxLength: 100 },
            lastName:     { type: 'string', minLength: 1, maxLength: 100 },
            designation:  { type: 'string', minLength: 1, maxLength: 100 },
            email:        { type: 'string', maxLength: 200 },
            phone:        { type: 'string', maxLength: 20 },
            department:   { type: 'string', maxLength: 100 },
            joiningDate:  { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            basicSalary:  { type: 'number', minimum: 0 },
            userId:       { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const member = await staffService.updateStaff(db, schoolId, req.params.id, req.body);
      if (!member) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Staff member not found.' });
      }
      return reply.send(member);
    }
  );

  // DELETE /staff/:id (soft delete)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [checkPermission('staff', 'DELETE')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const deleted = await staffService.deleteStaff(db, schoolId, req.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Staff member not found.' });
      }
      return reply.code(204).send();
    }
  );
};
