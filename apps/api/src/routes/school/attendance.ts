// Avanti API — Attendance Routes
// POST /api/v1/school/attendance/mark                    — bulk mark by class+date
// GET  /api/v1/school/attendance/:classId/:date          — get class attendance with roster
// GET  /api/v1/school/attendance/student/:studentId      — student history (date range)
// GET  /api/v1/school/attendance/student/:studentId/pct  — attendance percentage

import type { FastifyPluginAsync } from 'fastify';
import type { Server } from 'socket.io';
import { checkPermission } from '../../plugins/auth.js';
import * as attendanceService from '../../services/attendance.service.js';

export const attendanceRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /attendance/mark — bulk upsert for a class on a date
  fastify.post<{
    Body: {
      classId: string;
      date: string;
      records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' }>;
    };
  }>(
    '/mark',
    {
      preHandler: [checkPermission('attendance', 'CREATE')],
      schema: {
        body: {
          type: 'object',
          required: ['classId', 'date', 'records'],
          properties: {
            classId: { type: 'string' },
            date:    { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            records: {
              type: 'array',
              items: {
                type: 'object',
                required: ['studentId', 'status'],
                properties: {
                  studentId: { type: 'string' },
                  status:    { type: 'string', enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'] },
                },
                additionalProperties: false,
              },
              minItems: 1,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, redis, schoolId, userId } = req.tenantCtx!;
      const { classId, date, records } = req.body;

      const marked = await attendanceService.markAttendance(
        db, redis, schoolId, classId, date, records, userId
      );

      // WebSocket broadcast — notify dashboard watchers
      const io = (fastify.server as unknown as { _io?: Server })._io;
      if (io) {
        const summary = attendanceService.summarizeAttendance(marked, date, classId);
        io.to(`school:${schoolId}:attendance:${classId}`).emit('attendance:marked', summary);
        io.to(`school:${schoolId}:dashboard`).emit('attendance:updated', {
          classId,
          date,
          total:   summary.total,
          present: summary.present,
          absent:  summary.absent,
        });
      }

      const summary = attendanceService.summarizeAttendance(marked, date, classId);
      return reply.code(200).send(summary);
    }
  );

  // GET /attendance/:classId/:date — with full student roster (present + absent)
  fastify.get<{
    Params: { classId: string; date: string };
  }>(
    '/:classId/:date',
    { preHandler: [checkPermission('attendance', 'READ')] },
    async (req, reply) => {
      const { db, redis, schoolId } = req.tenantCtx!;
      const { classId, date } = req.params;

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.code(400).send({
          error:   'BAD_REQUEST',
          message: 'Date must be in YYYY-MM-DD format.',
        });
      }

      const roster = await attendanceService.getClassAttendanceWithRoster(
        db, schoolId, classId, date
      );
      const records = await attendanceService.getClassAttendance(
        db, redis, schoolId, classId, date
      );

      return reply.send({
        classId,
        date,
        roster,
        summary: attendanceService.summarizeAttendance(records, date, classId),
      });
    }
  );

  // GET /attendance/student/:studentId — date range history
  fastify.get<{
    Params: { studentId: string };
    Querystring: { from?: string; to?: string };
  }>(
    '/student/:studentId',
    { preHandler: [checkPermission('attendance', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const { studentId } = req.params;

      const now = new Date();
      const to   = req.query.to   ?? now.toISOString().slice(0, 10);
      const from = req.query.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

      const history = await attendanceService.getStudentAttendanceHistory(
        db, schoolId, studentId, from, to
      );

      return reply.send({ studentId, from, to, history });
    }
  );

  // GET /attendance/student/:studentId/pct — attendance percentage for academic year
  fastify.get<{
    Params: { studentId: string };
    Querystring: { academicYear?: string };
  }>(
    '/student/:studentId/pct',
    { preHandler: [checkPermission('attendance', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;

      // Default to current academic year (April-March)
      const now = new Date();
      const calYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const academicYear = req.query.academicYear ?? `${calYear}-${String(calYear + 1).slice(2)}`;

      const pct = await attendanceService.getStudentAttendancePercentage(
        db, schoolId, req.params.studentId, academicYear
      );

      return reply.send(pct);
    }
  );
};
