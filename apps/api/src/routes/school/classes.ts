// Avanti API — Classes Routes
// GET    /api/v1/school/classes          — list classes (filterable by academicYear)
// POST   /api/v1/school/classes          — create class
// GET    /api/v1/school/classes/:id      — get single class
// PATCH  /api/v1/school/classes/:id      — update class
// DELETE /api/v1/school/classes/:id      — soft delete

import type { FastifyPluginAsync } from 'fastify';
import { checkPermission } from '../../plugins/auth.js';
import * as classService from '../../services/classes.service.js';

export const classRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /classes
  fastify.get<{ Querystring: { academicYear?: string } }>(
    '/',
    { preHandler: [checkPermission('classes', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const classes = await classService.listClasses(db, schoolId, req.query.academicYear);
      return reply.send(classes);
    }
  );

  // GET /classes/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [checkPermission('classes', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const cls = await classService.getClass(db, schoolId, req.params.id);
      if (!cls) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Class not found.' });
      }
      return reply.send(cls);
    }
  );

  // POST /classes
  fastify.post<{
    Body: {
      name: string;
      section?: string;
      academicYear: string;
      gradeLevel?: number;
      teacherId?: string;
    };
  }>(
    '/',
    {
      preHandler: [checkPermission('classes', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'academicYear'],
          properties: {
            name:         { type: 'string', minLength: 1, maxLength: 100 },
            section:      { type: 'string', maxLength: 20 },
            academicYear: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            gradeLevel:   { type: 'integer', minimum: 1, maximum: 20 },
            teacherId:    { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const cls = await classService.createClass(db, schoolId, req.body);
      return reply.code(201).send(cls);
    }
  );

  // PATCH /classes/:id
  fastify.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      section?: string;
      academicYear?: string;
      gradeLevel?: number;
      teacherId?: string;
    };
  }>(
    '/:id',
    {
      preHandler: [checkPermission('classes', 'UPDATE')],
      schema: {
        body: {
          type: 'object',
          properties: {
            name:         { type: 'string', minLength: 1, maxLength: 100 },
            section:      { type: 'string', maxLength: 20 },
            academicYear: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            gradeLevel:   { type: 'integer', minimum: 1, maximum: 20 },
            teacherId:    { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const cls = await classService.updateClass(db, schoolId, req.params.id, req.body);
      if (!cls) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Class not found.' });
      }
      return reply.send(cls);
    }
  );

  // DELETE /classes/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [checkPermission('classes', 'DELETE')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const deleted = await classService.deleteClass(db, schoolId, req.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Class not found.' });
      }
      return reply.code(204).send();
    }
  );
};
