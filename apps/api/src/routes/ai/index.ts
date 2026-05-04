// Vidyut API — AI Routes
// POST /api/v1/ai/chat           — SSE streaming chat (Claude + tool use)
// POST /api/v1/ai/voice/transcribe — audio → transcript (Sarvam AI + Whisper)
// POST /api/v1/ai/voice/speak    — text → base64 WAV (Sarvam TTS)

import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../plugins/auth.js';
import { runAgent } from '../../services/ai/agent.js';
import { transcribeAudio, synthesizeSpeech } from '../../services/ai/voice.js';
import type { AIChatEvent } from '@vidyut/types';

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // ── POST /chat — streaming SSE ─────────────────────────────────────────────
  fastify.post<{
    Body: {
      message:        string;
      conversationId?: string;
      screen?:        string;
    };
  }>(
    '/chat',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        body: {
          type:     'object',
          required: ['message'],
          properties: {
            message:        { type: 'string', minLength: 1, maxLength: 8000 },
            conversationId: { type: 'string' },
            screen:         { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { db, schoolId, userId, role, permissions } = req.tenantCtx!;
      const { message, conversationId, screen } = req.body;

      // Hijack response for SSE
      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const send = (event: AIChatEvent): void => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Abort if client disconnects
      let aborted = false;
      req.socket.once('close', () => { aborted = true; });

      try {
        if (aborted) return;

        const io = (fastify.server as unknown as { _io?: import('socket.io').Server })._io;

        await runAgent({
          ctx: { db, schoolId, userId, role, permissions },
          conversationId: conversationId ?? null,
          message,
          ...(screen ? { screen } : {}),
          send,
          ...(io ? { io } : {}),
        });
      } catch (err) {
        if (!aborted) {
          send({ type: 'error', message: err instanceof Error ? err.message : 'AI service error' });
        }
      } finally {
        if (!aborted) res.end();
      }
    }
  );

  // ── POST /voice/transcribe — multipart audio → transcript ──────────────────
  fastify.post(
    '/voice/transcribe',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const data = await (req as unknown as {
        file: () => Promise<{
          toBuffer: () => Promise<Buffer>;
          mimetype: string;
        } | undefined>;
      }).file();

      if (!data) {
        return reply.code(400).send({ error: 'BAD_REQUEST', message: 'No audio file provided.' });
      }

      const audioBuffer = await data.toBuffer();
      const mimeType    = data.mimetype || 'audio/webm';

      const result = await transcribeAudio(audioBuffer, mimeType);
      return reply.send(result);
    }
  );

  // ── POST /voice/speak — text → base64 WAV ─────────────────────────────────
  fastify.post<{
    Body: { text: string; language?: string };
  }>(
    '/voice/speak',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: {
          type:     'object',
          required: ['text'],
          properties: {
            text:     { type: 'string', minLength: 1, maxLength: 500 },
            language: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { text, language } = req.body;
      const audioBase64 = await synthesizeSpeech(text, language ?? 'en-IN');
      return reply.send({ audio: audioBase64, format: 'wav', encoding: 'base64' });
    }
  );
};
