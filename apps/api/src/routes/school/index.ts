// Avanti API — School Module Routes
// All school data routes — tenant-scoped, auth required.
// Registers all Phase 2 modules under /api/v1/school/*

import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../plugins/auth.js';
import { classRoutes }      from './classes.js';
import { studentRoutes }    from './students.js';
import { staffRoutes }      from './staff.js';
import { payrollRoutes }    from './payroll.js';
import { attendanceRoutes } from './attendance.js';
import { feeRoutes }        from './fees.js';
import { timetableRoutes }  from './timetable.js';
import { reportRoutes }        from './reports.js';
import { schoolBillingRoutes } from './billing.js';

export const schoolRoutes: FastifyPluginAsync = async (fastify) => {
  // All school routes require authentication + tenant context.
  // authenticate sets req.session; tenantPlugin (registered globally) sets req.tenantCtx.
  fastify.addHook('preHandler', authenticate);

  // Module routes
  await fastify.register(classRoutes,      { prefix: '/classes' });
  await fastify.register(studentRoutes,    { prefix: '/students' });
  await fastify.register(staffRoutes,      { prefix: '/staff' });
  await fastify.register(payrollRoutes,    { prefix: '/payroll' });
  await fastify.register(attendanceRoutes, { prefix: '/attendance' });
  await fastify.register(feeRoutes,        { prefix: '/fees' });
  await fastify.register(timetableRoutes,  { prefix: '/timetable' });
  await fastify.register(reportRoutes,        { prefix: '/reports' });
  await fastify.register(schoolBillingRoutes, { prefix: '/billing' });

  // Health check — school root
  fastify.get('/', async (req, reply) => {
    if (!req.tenantCtx) {
      return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Tenant context missing.' });
    }
    return reply.send({ schoolId: req.tenantCtx.schoolId });
  });
};
