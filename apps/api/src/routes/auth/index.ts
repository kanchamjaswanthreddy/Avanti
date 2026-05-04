// Avanti API — Auth Routes (Full Implementation)
// From TechnicalArchitecture_v1.docx Section 7.1
//
// POST /api/v1/auth/login          — email + password → access token + refresh cookie
// POST /api/v1/auth/refresh        — rotate refresh token → new access token
// POST /api/v1/auth/logout         — revoke refresh token
// POST /api/v1/auth/forgot-password — generate + email reset link
// POST /api/v1/auth/reset-password  — consume reset token + bcrypt new password

import type { FastifyPluginAsync } from 'fastify';
import nodemailer from 'nodemailer';
import * as authService from '../../services/auth.service.js';
import type { JWTPayload } from '@avanti/types';

// Trigger @fastify/cookie type augmentation
import type {} from '@fastify/cookie';

// ── Mailer (local = mailpit on port 1025) ─────────────────────────────────────

function getMailer() {
  const isProduction = process.env['NODE_ENV'] === 'production';
  return nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? 'localhost',
    port: isProduction ? 587 : 1025,
    secure: false,
    ...(isProduction && process.env['SMTP_USER']
      ? { auth: { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] } }
      : {}),
  });
}

// ── JWT signing helper ────────────────────────────────────────────────────────

type FastifyWithJWT = {
  jwt: { sign: (payload: object, opts?: object) => string };
};

function signAccessToken(
  fastify: FastifyWithJWT,
  user: authService.AuthUser,
  permHash: string
): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub:      user.id,
    schoolId: user.schoolId,
    role:     user.role,
    permHash,
  };
  return fastify.jwt.sign(payload);
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path:     '/api/v1/auth',
  maxAge:   30 * 24 * 60 * 60,  // 30 days in seconds
};

// ── Routes ────────────────────────────────────────────────────────────────────

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const jwtFastify = fastify as unknown as FastifyWithJWT;

  // ── POST /login ─────────────────────────────────────────────────────────────
  fastify.post<{
    Body: { email: string; password: string; schoolId: string };
  }>(
    '/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'schoolId'],
          properties: {
            email:    { type: 'string' },
            password: { type: 'string', minLength: 1 },
            schoolId: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const result = await authService.login({
        email:    req.body.email,
        password: req.body.password,
        schoolId: req.body.schoolId,
      });

      if (!result) {
        return reply.code(401).send({
          error:   'UNAUTHORIZED',
          message: 'Invalid email, password, or school.',
        });
      }

      const accessToken = signAccessToken(jwtFastify, result.user, result.permHash);

      return reply
        .setCookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTS)
        .code(200)
        .send({
          accessToken,
          user: {
            id:       result.user.id,
            name:     result.user.name,
            email:    result.user.email,
            role:     result.user.role,
            schoolId: result.user.schoolId,
          },
        });
    }
  );

  // ── POST /refresh ────────────────────────────────────────────────────────────
  fastify.post<{
    Body: { schoolId: string };
  }>(
    '/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['schoolId'],
          properties: {
            schoolId: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME];
      if (!rawToken) {
        return reply.code(401).send({
          error:   'UNAUTHORIZED',
          message: 'Refresh token not found.',
        });
      }

      const result = await authService.refreshAccessToken(rawToken, req.body.schoolId);

      if (!result) {
        return reply
          .clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTS.path })
          .code(401)
          .send({
            error:   'UNAUTHORIZED',
            message: 'Refresh token is invalid, expired, or revoked.',
          });
      }

      const accessToken = signAccessToken(jwtFastify, result.user, result.permHash);

      return reply
        .setCookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTS)
        .code(200)
        .send({ accessToken });
    }
  );

  // ── POST /logout ─────────────────────────────────────────────────────────────
  fastify.post<{
    Body: { schoolId: string };
  }>(
    '/logout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['schoolId'],
          properties: {
            schoolId: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME];

      if (rawToken) {
        await authService.logout(rawToken, req.body.schoolId);
      }

      return reply
        .clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTS.path })
        .code(200)
        .send({ message: 'Logged out successfully.' });
    }
  );

  // ── POST /forgot-password ────────────────────────────────────────────────────
  fastify.post<{
    Body: { email: string; schoolId: string };
  }>(
    '/forgot-password',
    {
      config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'schoolId'],
          properties: {
            email:    { type: 'string' },
            schoolId: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const result = await authService.generatePasswordResetToken(
        req.body.email,
        req.body.schoolId
      );

      // Always respond 200 — don't reveal whether email exists
      if (result) {
        const resetUrl = `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/reset-password?token=${result.token}&schoolId=${req.body.schoolId}`;

        try {
          const mailer = getMailer();
          await mailer.sendMail({
            from:    process.env['SMTP_FROM'] ?? 'noreply@avanti.local',
            to:      req.body.email,
            subject: 'Reset your Avanti password',
            html: `
              <p>Hi ${result.userName},</p>
              <p>We received a request to reset your password. Click the link below to proceed:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
              <p>— Avanti Team</p>
            `,
          });
        } catch (emailErr) {
          // Don't fail the request if email fails — log and continue
          fastify.log.error({ err: emailErr }, 'Failed to send password reset email');
          // In local dev, log the reset link so developers can test
          if (process.env['NODE_ENV'] !== 'production') {
            fastify.log.info({ resetUrl }, '[DEV] Password reset link');
          }
        }
      }

      return reply.code(200).send({
        message: 'If that email is registered, a reset link has been sent.',
      });
    }
  );

  // ── POST /reset-password ──────────────────────────────────────────────────────
  fastify.post<{
    Body: { token: string; newPassword: string; schoolId: string };
  }>(
    '/reset-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'newPassword', 'schoolId'],
          properties: {
            token:       { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
            schoolId:    { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const ok = await authService.resetPassword(
        req.body.token,
        req.body.newPassword,
        req.body.schoolId
      );

      if (!ok) {
        return reply.code(400).send({
          error:   'BAD_REQUEST',
          message: 'Reset token is invalid, expired, or already used.',
        });
      }

      // Clear any lingering refresh token cookie
      return reply
        .clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTS.path })
        .code(200)
        .send({ message: 'Password reset successfully. Please log in again.' });
    }
  );
};
