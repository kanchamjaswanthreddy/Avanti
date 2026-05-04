// Avanti API — Students Routes
// GET    /api/v1/school/students         — list with pagination, search, class filter
// POST   /api/v1/school/students         — create student
// GET    /api/v1/school/students/:id     — get single student
// PATCH  /api/v1/school/students/:id     — update student
// DELETE /api/v1/school/students/:id     — soft delete

import type { FastifyPluginAsync } from 'fastify';
import { checkPermission } from '../../plugins/auth.js';
import * as studentService from '../../services/students.service.js';

export const studentRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /students
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      classId?: string;
    };
  }>(
    '/',
    { preHandler: [checkPermission('students', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const opts: studentService.ListStudentsOptions = {};
      if (req.query.page)    opts.page    = parseInt(req.query.page, 10);
      if (req.query.limit)   opts.limit   = parseInt(req.query.limit, 10);
      if (req.query.search)  opts.search  = req.query.search;
      if (req.query.classId) opts.classId = req.query.classId;
      const result = await studentService.listStudents(db, schoolId, opts);
      return reply.send(result);
    }
  );

  // GET /students/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [checkPermission('students', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const student = await studentService.getStudent(db, schoolId, req.params.id);
      if (!student) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Student not found.' });
      }
      return reply.send(student);
    }
  );

  // POST /students
  fastify.post<{
    Body: {
      classId?: string;
      admissionNumber: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      phone?: string;
      email?: string;
      address?: string;
      parentName?: string;
      parentPhone?: string;
    };
  }>(
    '/',
    {
      preHandler: [checkPermission('students', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['admissionNumber', 'firstName', 'lastName'],
          properties: {
            classId:         { type: 'string' },
            admissionNumber: { type: 'string', minLength: 1, maxLength: 50 },
            firstName:       { type: 'string', minLength: 1, maxLength: 100 },
            lastName:        { type: 'string', minLength: 1, maxLength: 100 },
            dateOfBirth:     { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            gender:          { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
            phone:           { type: 'string', maxLength: 20 },
            email:           { type: 'string', maxLength: 200 },
            address:         { type: 'string', maxLength: 500 },
            parentName:      { type: 'string', maxLength: 200 },
            parentPhone:     { type: 'string', maxLength: 20 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      try {
        const student = await studentService.createStudent(db, schoolId, req.body);
        return reply.code(201).send(student);
      } catch (err) {
        if (err instanceof Error && err.message.includes('duplicate')) {
          return reply.code(409).send({
            error:   'CONFLICT',
            message: 'Admission number already exists for this school.',
          });
        }
        throw err;
      }
    }
  );

  // PATCH /students/:id
  fastify.patch<{
    Params: { id: string };
    Body: {
      classId?: string;
      admissionNumber?: string;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      phone?: string;
      email?: string;
      address?: string;
      parentName?: string;
      parentPhone?: string;
    };
  }>(
    '/:id',
    {
      preHandler: [checkPermission('students', 'UPDATE')],
      schema: {
        body: {
          type: 'object',
          properties: {
            classId:         { type: 'string' },
            admissionNumber: { type: 'string', minLength: 1, maxLength: 50 },
            firstName:       { type: 'string', minLength: 1, maxLength: 100 },
            lastName:        { type: 'string', minLength: 1, maxLength: 100 },
            dateOfBirth:     { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            gender:          { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
            phone:           { type: 'string', maxLength: 20 },
            email:           { type: 'string', maxLength: 200 },
            address:         { type: 'string', maxLength: 500 },
            parentName:      { type: 'string', maxLength: 200 },
            parentPhone:     { type: 'string', maxLength: 20 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const student = await studentService.updateStudent(db, schoolId, req.params.id, req.body);
      if (!student) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Student not found.' });
      }
      return reply.send(student);
    }
  );

  // DELETE /students/:id (soft delete)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [checkPermission('students', 'DELETE')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const deleted = await studentService.deleteStudent(db, schoolId, req.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Student not found.' });
      }
      return reply.code(204).send();
    }
  );
};
