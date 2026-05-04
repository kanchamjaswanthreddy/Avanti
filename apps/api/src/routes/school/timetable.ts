// Avanti API — Timetable Routes
// GET    /api/v1/school/timetable/:classId              — weekly timetable for class
// POST   /api/v1/school/timetable/slots                 — create slot
// PATCH  /api/v1/school/timetable/slots/:id             — update slot
// DELETE /api/v1/school/timetable/slots/:id             — delete slot
// GET    /api/v1/school/timetable/teacher/:teacherId    — teacher's schedule

import type { FastifyPluginAsync } from 'fastify';
import { checkPermission } from '../../plugins/auth.js';
import * as timetableService from '../../services/timetable.service.js';
import { ClashError } from '../../services/timetable.service.js';

export const timetableRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /timetable/:classId — weekly timetable
  fastify.get<{ Params: { classId: string } }>(
    '/:classId',
    { preHandler: [checkPermission('timetable', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const timetable = await timetableService.getWeeklyTimetable(
        db, schoolId, req.params.classId
      );
      return reply.send(timetable);
    }
  );

  // GET /timetable/teacher/:teacherId — teacher schedule
  fastify.get<{ Params: { teacherId: string } }>(
    '/teacher/:teacherId',
    { preHandler: [checkPermission('timetable', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const slots = await timetableService.getTeacherTimetable(
        db, schoolId, req.params.teacherId
      );
      return reply.send(slots);
    }
  );

  // POST /timetable/slots — create slot
  fastify.post<{
    Body: {
      classId: string;
      dayOfWeek: number;
      periodNumber: number;
      startTime: string;
      endTime: string;
      subject: string;
      teacherId?: string;
      room?: string;
    };
  }>(
    '/slots',
    {
      preHandler: [checkPermission('timetable', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['classId', 'dayOfWeek', 'periodNumber', 'startTime', 'endTime', 'subject'],
          properties: {
            classId:      { type: 'string' },
            dayOfWeek:    { type: 'integer', minimum: 1, maximum: 7 },
            periodNumber: { type: 'integer', minimum: 1, maximum: 20 },
            startTime:    { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime:      { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            subject:      { type: 'string', minLength: 1, maxLength: 200 },
            teacherId:    { type: 'string' },
            room:         { type: 'string', maxLength: 50 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      try {
        const slot = await timetableService.createSlot(db, schoolId, req.body);
        return reply.code(201).send(slot);
      } catch (err) {
        if (err instanceof ClashError) {
          return reply.code(409).send({
            error:     'CONFLICT',
            clashType: err.clashType,
            message:   err.message,
          });
        }
        throw err;
      }
    }
  );

  // PATCH /timetable/slots/:id — update slot
  fastify.patch<{
    Params: { id: string };
    Body: {
      dayOfWeek?: number;
      periodNumber?: number;
      startTime?: string;
      endTime?: string;
      subject?: string;
      teacherId?: string;
      room?: string;
    };
  }>(
    '/slots/:id',
    {
      preHandler: [checkPermission('timetable', 'UPDATE')],
      schema: {
        body: {
          type: 'object',
          properties: {
            dayOfWeek:    { type: 'integer', minimum: 1, maximum: 7 },
            periodNumber: { type: 'integer', minimum: 1, maximum: 20 },
            startTime:    { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            endTime:      { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            subject:      { type: 'string', minLength: 1, maxLength: 200 },
            teacherId:    { type: 'string' },
            room:         { type: 'string', maxLength: 50 },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      try {
        const slot = await timetableService.updateSlot(db, schoolId, req.params.id, req.body);
        if (!slot) {
          return reply.code(404).send({ error: 'NOT_FOUND', message: 'Timetable slot not found.' });
        }
        return reply.send(slot);
      } catch (err) {
        if (err instanceof ClashError) {
          return reply.code(409).send({
            error:     'CONFLICT',
            clashType: err.clashType,
            message:   err.message,
          });
        }
        throw err;
      }
    }
  );

  // DELETE /timetable/slots/:id
  fastify.delete<{ Params: { id: string } }>(
    '/slots/:id',
    { preHandler: [checkPermission('timetable', 'DELETE')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const deleted = await timetableService.deleteSlot(db, schoolId, req.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Timetable slot not found.' });
      }
      return reply.code(204).send();
    }
  );
};
