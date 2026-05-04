// Vidyut API — Authentication Plugin
// From TechnicalArchitecture_v1.docx Section 7.1
//
// JWT: RS256 preferred in production. HS256 acceptable for local dev.
// Access tokens:  15 minutes
// Refresh tokens: 30 days, httpOnly cookie

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { JWTPayload, SessionUser } from '@vidyut/types';

declare module 'fastify' {
  interface FastifyRequest {
    session?: SessionUser;
  }
  interface FastifyInstance {
    signAccessToken: (payload: Omit<JWTPayload, 'iat' | 'exp'>) => string;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required.');

  await fastify.register(import('@fastify/jwt'), {
    secret: jwtSecret,
    sign: {
      expiresIn: '15m',
    },
  });

  // ── Helpers attached to fastify instance ─────────────────────────────────

  fastify.decorate('signAccessToken', function (payload: Omit<JWTPayload, 'iat' | 'exp'>) {
    return (fastify as unknown as { jwt: { sign: (p: object) => string } }).jwt.sign(payload);
  });
};

export default fp(authPlugin, { name: 'auth' });

// ── preHandler to protect routes ─────────────────────────────────────────────
// Usage: fastify.get('/path', { preHandler: [authenticate] }, handler)

export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const payload = await (req as unknown as { jwtVerify: <T>() => Promise<T> }).jwtVerify<JWTPayload>();
    req.session = {
      userId:   payload.sub,
      schoolId: payload.schoolId,
      role:     payload.role,
      email:    '',   // loaded from DB/cache when needed
      name:     '',
    };
  } catch {
    await reply.code(401).send({
      error: 'UNAUTHORIZED',
      message: 'Access token is missing or expired.',
    });
  }
}

// ── Permission check helper ───────────────────────────────────────────────────
// From TechnicalArchitecture_v1.docx Section 5.4

export function checkPermission(resource: string, action: string) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!req.session) {
      await reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Not authenticated.' });
      return;
    }

    // Super admin bypasses all permission checks
    if (req.session.role === 'SUPER_ADMIN') return;

    const tenantCtx = (req as unknown as { tenantCtx?: { permissions?: { permissions?: Array<{ resource: string; actions: string[] }> } } }).tenantCtx;
    const perms = tenantCtx?.permissions?.permissions ?? [];
    const perm = perms.find(p => p.resource === resource);

    if (!perm || !perm.actions.includes(action)) {
      await reply.code(403).send({
        error: 'FORBIDDEN',
        message: `You do not have ${action} permission on ${resource}.`,
      });
    }
  };
}
