// Avanti API — Reports Routes
// POST /api/v1/school/reports/generate   — enqueue a report job
// GET  /api/v1/school/reports/jobs/:jobId — poll job status + result

import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { checkPermission } from '../../plugins/auth.js';
import { getReportsQueue, redisConnectionFromEnv } from '@avanti/queue';
import type { ReportType } from '@avanti/types';

const VALID_REPORT_TYPES: ReportType[] = [
  'attendance_summary',
  'fee_collection',
  'student_list',
  'class_performance',
];

export const reportRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /reports/generate
  fastify.post<{
    Body: {
      reportType: ReportType;
      params:     Record<string, unknown>;
    };
  }>(
    '/generate',
    {
      preHandler: [checkPermission('reports', 'READ')],
      schema: {
        body: {
          type: 'object',
          required: ['reportType'],
          properties: {
            reportType: { type: 'string', enum: VALID_REPORT_TYPES },
            params:     { type: 'object' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { schoolId, userId } = req.tenantCtx!;
      const { reportType, params = {} } = req.body;

      const jobId = randomUUID();

      // Enqueue if Redis is available; otherwise fall back to 404 with explanation
      if (!process.env['REDIS_URL'] && !process.env['REDIS_HOST']) {
        return reply.code(503).send({
          error:   'QUEUE_UNAVAILABLE',
          message: 'Redis is not configured. Report queue is unavailable.',
        });
      }

      try {
        const queue = getReportsQueue(redisConnectionFromEnv());
        await queue.add(
          reportType,
          { jobId, schoolId, requestedBy: userId, reportType, params },
          { jobId }  // use our UUID as BullMQ job ID for deterministic polling
        );
        await queue.close();
      } catch (err) {
        fastify.log.error({ err }, 'Failed to enqueue report job');
        return reply.code(503).send({
          error:   'QUEUE_ERROR',
          message: 'Failed to queue report. Please try again.',
        });
      }

      return reply.code(202).send({ jobId, status: 'queued' });
    }
  );

  // GET /reports/jobs/:jobId
  fastify.get<{ Params: { jobId: string } }>(
    '/jobs/:jobId',
    { preHandler: [checkPermission('reports', 'READ')] },
    async (req, reply) => {
      if (!process.env['REDIS_URL'] && !process.env['REDIS_HOST']) {
        return reply.code(503).send({
          error:   'QUEUE_UNAVAILABLE',
          message: 'Redis is not configured.',
        });
      }

      const { jobId } = req.params;

      try {
        const queue = getReportsQueue(redisConnectionFromEnv());
        const job   = await queue.getJob(jobId);
        await queue.close();

        if (!job) {
          return reply.code(404).send({
            error:   'NOT_FOUND',
            message: 'Report job not found.',
          });
        }

        const state    = await job.getState();        // 'waiting'|'active'|'completed'|'failed'
        const progress = typeof job.progress === 'number' ? job.progress : 0;

        type JobReturnValue = {
          rowCount:    number;
          rows:        Record<string, unknown>[];
          summary:     Record<string, unknown> | undefined;
          generatedAt: string;
        };
        const rv = job.returnvalue as JobReturnValue | null | undefined;

        const result = {
          jobId,
          reportType:  job.data.reportType,
          status:      state === 'completed' ? 'completed'
                     : state === 'failed'    ? 'failed'
                     : state === 'active'    ? 'active'
                     :                        'queued',
          progress,
          generatedAt: rv?.generatedAt ?? null,
          rowCount:    rv?.rowCount    ?? 0,
          rows:        rv?.rows        ?? [],
          summary:     rv?.summary     ?? null,
          error:       state === 'failed' ? (job.failedReason ?? 'Unknown error') : null,
        };

        return reply.send(result);
      } catch (err) {
        fastify.log.error({ err }, 'Failed to check report job status');
        return reply.code(500).send({
          error:   'INTERNAL_ERROR',
          message: 'Failed to check job status.',
        });
      }
    }
  );
};
