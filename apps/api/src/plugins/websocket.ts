// Avanti API — WebSocket Plugin (Socket.io)
// From TechnicalArchitecture_v1.docx Section 9.1
//
// Per-school namespaces: /ws/school-{schoolId}
// Rooms per school:
//   school:{schoolId}:dashboard          — real-time dashboard stats
//   school:{schoolId}:attendance:{classId} — live attendance updates
//   school:{schoolId}:canvas:{canvasId}  — canvas collaboration (Phase 3)
//   school:{schoolId}:notifications      — user-specific notifications
//
// Auth: JWT verified on connection before joining any room.

import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import type { JWTPayload } from '@avanti/types';

// Type augmentation — fastify instance now has .io
declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

const wsPlugin: FastifyPluginAsync = async (fastify) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env['ALLOWED_ORIGINS']?.split(',') ?? []),
  ];

  const io = new Server(fastify.server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout:  20_000,
    pingInterval: 25_000,
  });

  // ── JWT auth middleware for all Socket.io connections ─────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth['token'] as string | undefined
        ?? socket.handshake.headers['authorization']?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('UNAUTHORIZED: token required'));
      }

      // Verify JWT using the same secret as the REST API
      const jwtSecret = process.env['JWT_SECRET'];
      if (!jwtSecret) return next(new Error('SERVER_ERROR'));

      // Simple JWT decode + verify (avoid importing @fastify/jwt internals)
      const [headerB64, payloadB64, sigB64] = token.split('.');
      if (!headerB64 || !payloadB64 || !sigB64) {
        return next(new Error('UNAUTHORIZED: invalid token format'));
      }

      const { createHmac } = await import('node:crypto');
      const sigCheck = createHmac('sha256', jwtSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (sigCheck !== sigB64) {
        return next(new Error('UNAUTHORIZED: invalid signature'));
      }

      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      ) as JWTPayload;

      if (payload.exp && Date.now() / 1000 > payload.exp) {
        return next(new Error('UNAUTHORIZED: token expired'));
      }

      socket.data['userId']   = payload.sub;
      socket.data['schoolId'] = payload.schoolId;
      socket.data['role']     = payload.role;

      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const schoolId = socket.data['schoolId'] as string;
    const userId   = socket.data['userId']   as string;

    fastify.log.info({ userId, schoolId }, '[ws] client connected');

    // Auto-join school-scoped rooms
    void socket.join(`school:${schoolId}:dashboard`);
    void socket.join(`school:${schoolId}:notifications`);
    void socket.join(`user:${userId}:notifications`);

    // Join class-specific attendance room
    socket.on('join:attendance', (classId: string) => {
      if (typeof classId === 'string' && classId.length > 0) {
        void socket.join(`school:${schoolId}:attendance:${classId}`);
        fastify.log.debug({ userId, classId }, '[ws] joined attendance room');
      }
    });

    // Leave attendance room
    socket.on('leave:attendance', (classId: string) => {
      if (typeof classId === 'string') {
        void socket.leave(`school:${schoolId}:attendance:${classId}`);
      }
    });

    // Join canvas room (Phase 3 — accepted now, no-op until canvas is built)
    socket.on('join:canvas', (canvasId: string) => {
      if (typeof canvasId === 'string' && canvasId.length > 0) {
        void socket.join(`school:${schoolId}:canvas:${canvasId}`);
      }
    });

    socket.on('leave:canvas', (canvasId: string) => {
      if (typeof canvasId === 'string') {
        void socket.leave(`school:${schoolId}:canvas:${canvasId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      fastify.log.debug({ userId, reason }, '[ws] client disconnected');
    });
  });

  // Decorate fastify instance so routes can emit events via fastify.io
  fastify.decorate('io', io);

  // Store io on the HTTP server for route-level access via req.server
  (fastify.server as unknown as { _io: Server })._io = io;

  fastify.addHook('onClose', async () => {
    await new Promise<void>(resolve => io.close(() => resolve()));
    fastify.log.info('[ws] Socket.io server closed');
  });
};

export default fp(wsPlugin, { name: 'websocket' });
