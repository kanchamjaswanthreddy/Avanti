// Avanti API — Canvas Routes
// GET  /api/v1/canvas/:canvasId — load canvas layout + meta-schema
// POST /api/v1/canvas/:canvasId — save layout + apply schema changes atomically

import type { FastifyPluginAsync } from 'fastify';
import { authenticate, checkPermission } from '../../plugins/auth.js';
import * as canvasService from '../../services/canvas.service.js';
import * as schemaService from '../../services/schema.service.js';
import type { CanvasLayout, SchemaChangeDescriptor } from '@avanti/types';

export const canvasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /canvas/:canvasId — load layout + current meta-schema
  fastify.get<{ Params: { canvasId: string } }>(
    '/:canvasId',
    { preHandler: [checkPermission('canvas', 'READ')] },
    async (req, reply) => {
      const { db, schoolId } = req.tenantCtx!;
      const { canvasId } = req.params;

      const [layout, metaSchema] = await Promise.all([
        canvasService.loadCanvasLayout(db, schoolId, canvasId),
        schemaService.getMetaSchema(db, schoolId),
      ]);

      return reply.send({
        layout: layout ?? {
          canvasId,
          schoolId,
          positions: {},
          savedAt:  new Date().toISOString(),
          savedBy:  req.tenantCtx!.userId,
        },
        metaSchema,
      });
    }
  );

  // POST /canvas/:canvasId — save layout + apply pending schema changes
  fastify.post<{
    Params: { canvasId: string };
    Body: {
      layout: CanvasLayout;
      changes: SchemaChangeDescriptor[];
    };
  }>(
    '/:canvasId',
    {
      preHandler: [checkPermission('canvas', 'CREATE')],
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['layout', 'changes'],
          properties: {
            layout: {
              type: 'object',
              required: ['canvasId', 'schoolId', 'positions'],
              properties: {
                canvasId:  { type: 'string' },
                schoolId:  { type: 'string' },
                positions: { type: 'object' },
                savedAt:   { type: 'string' },
                savedBy:   { type: 'string' },
              },
            },
            changes: { type: 'array' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId, userId } = req.tenantCtx!;
      const { canvasId } = req.params;

      // Apply schema changes first (within transaction)
      let changeResult: Awaited<ReturnType<typeof schemaService.applyChanges>>;
      if (req.body.changes.length > 0) {
        changeResult = await schemaService.applyChanges(
          db, schoolId, req.body.changes, userId
        );
        if (!changeResult.success) {
          return reply.code(422).send({
            error:   'SCHEMA_CHANGE_FAILED',
            message: changeResult.error ?? 'Could not apply schema changes.',
          });
        }
      } else {
        changeResult = { success: true };
      }

      // Save canvas layout
      const savedLayout = await canvasService.saveCanvasLayout(
        db, schoolId, { ...req.body.layout, canvasId, schoolId }, userId
      );

      // Fetch fresh meta-schema (has new version after changes)
      const metaSchema = await schemaService.getMetaSchema(db, schoolId);

      // Broadcast to canvas collaborators
      const io = (fastify.server as unknown as { _io?: import('socket.io').Server })._io;
      if (io && req.body.changes.length > 0) {
        io.to(`school:${schoolId}:canvas:${canvasId}`).emit('canvas:saved', {
          savedBy:   userId,
          version:   metaSchema.version,
          changeCount: req.body.changes.length,
        });
      }

      return reply.code(200).send({
        layout:       savedLayout,
        metaSchema,
        changeResult: { success: true, newVersion: changeResult.newVersion },
      });
    }
  );
};
