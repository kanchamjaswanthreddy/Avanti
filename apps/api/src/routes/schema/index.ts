// Avanti API — Schema Routes (Full Implementation)
// GET  /api/v1/schema/meta    — returns the school's full meta-schema
// POST /api/v1/schema/change  — applies SchemaChangeDescriptor[] via SME
// GET  /api/v1/schema/log     — paginated schema change audit log

import type { FastifyPluginAsync } from 'fastify';
import { authenticate, checkPermission } from '../../plugins/auth.js';
import * as schemaService from '../../services/schema.service.js';
import type { SchemaChangeDescriptor } from '@avanti/types';

export const schemaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /schema/meta — returns meta-schema for the authenticated school
  fastify.get(
    '/meta',
    { preHandler: [checkPermission('schema', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const metaSchema = await schemaService.getMetaSchema(db, schoolId);
      return reply.send(metaSchema);
    }
  );

  // POST /schema/change — applies schema changes via SME (rate limited)
  fastify.post<{
    Body: { changes: SchemaChangeDescriptor[] };
  }>(
    '/change',
    {
      preHandler: [checkPermission('schema', 'CREATE')],
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['changes'],
          properties: {
            changes: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['action', 'tableId', 'payload', 'requestedBy', 'timestamp'],
                properties: {
                  action:      { type: 'string' },
                  tableId:     { type: 'string' },
                  fieldId:     { type: 'string' },
                  payload:     { type: 'object' },
                  requestedBy: { type: 'string' },
                  timestamp:   { type: 'string' },
                },
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId, userId } = req.tenantCtx!;
      const result = await schemaService.applyChanges(db, schoolId, req.body.changes, userId);

      if (!result.success) {
        return reply.code(422).send({
          error:   'SCHEMA_CHANGE_FAILED',
          message: result.error ?? 'Schema change could not be applied.',
        });
      }

      // Broadcast to any canvas collaborators on this school
      const io = (fastify.server as unknown as { _io?: import('socket.io').Server })._io;
      if (io) {
        io.to(`school:${schoolId}:canvas:schema`).emit('schema:updated', {
          version:   result.newVersion,
          changedBy: userId,
        });
      }

      return reply.code(200).send({
        success:    true,
        newVersion: result.newVersion,
        metaSchema: result.metaSchema,
      });
    }
  );

  // GET /schema/log — change audit log
  fastify.get<{
    Querystring: { limit?: string };
  }>(
    '/log',
    { preHandler: [checkPermission('schema', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const limit = req.query.limit ? Math.min(100, parseInt(req.query.limit, 10)) : 50;
      const log = await schemaService.getSchemaChangeLog(db, schoolId, limit);
      return reply.send(log);
    }
  );
};
