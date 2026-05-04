// Vidyut AI — Agent Runner (streaming + tool use loop)
// From TechnicalArchitecture_v1.docx Section 8
//
// Orchestrates the Claude API call loop:
//   1. Build context (system prompt + history)
//   2. Stream response — emit text deltas and tool events
//   3. If stop_reason === 'tool_use': execute tools, continue loop
//   4. On end_turn: save conversation to DB, emit 'done' event
//
// SSE events emitted via the `send` callback (route writes them to response).

import Anthropic from '@anthropic-ai/sdk';
import type pg from 'pg';
import type { AIChatEvent, AIMessage } from '@vidyut/types';
import { buildSystemPrompt, type AgentContext } from './context.js';
import { TOOL_DEFINITIONS, executeTool, type ToolContext } from './tools.js';

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
});

const MODEL = 'claude-sonnet-4-6';

// ── Types ─────────────────────────────────────────────────────────────────────

type SendFn = (event: AIChatEvent) => void;

interface RunParams {
  ctx:              AgentContext;
  conversationId:   string | null;   // null = new conversation
  message:          string;
  screen?:          string;
  send:             SendFn;
  io?:              import('socket.io').Server;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runAgent(params: RunParams): Promise<void> {
  const { ctx, message, screen, send, io } = params;
  let conversationId = params.conversationId;

  // Ensure conversation exists
  conversationId = await ensureConversation(ctx.db, ctx.schoolId, ctx.userId, conversationId, message);

  // Save user message
  await saveMessage(ctx.db, ctx.schoolId, conversationId, 'user', message);

  // Build context — inject screen into ctx so buildSystemPrompt can use it
  const systemPrompt = await buildSystemPrompt({
    ...ctx,
    ...(screen ? { screen } : {}),
  });

  // Load history (last 10 turns = 20 messages)
  const history = await loadHistory(ctx.db, ctx.schoolId, conversationId, 20);

  const toolCtx: ToolContext = {
    db:          ctx.db,
    schoolId:    ctx.schoolId,
    userId:      ctx.userId,
    role:        ctx.role,
    permissions: ctx.permissions,
    ...(io ? { io } : {}),
  };

  // Run the agentic loop
  const fullText = await runLoop(systemPrompt, history, toolCtx, send);

  // Save assistant response
  const msgId = await saveMessage(ctx.db, ctx.schoolId, conversationId, 'assistant', fullText);

  send({ type: 'done', conversationId, messageId: msgId });
}

// ── Agentic loop (streaming + tool use) ──────────────────────────────────────

async function runLoop(
  systemPrompt: string,
  history:      Anthropic.MessageParam[],
  toolCtx:      ToolContext,
  send:         SendFn
): Promise<string> {
  let messages: Anthropic.MessageParam[] = [...history];
  let fullAssistantText = '';

  // Safety cap: max 5 tool-use iterations per request
  for (let iter = 0; iter < 5; iter++) {
    const stream = anthropic.messages.stream({
      model:      MODEL,
      max_tokens: 4096,
      system:     systemPrompt,
      messages,
      tools:      TOOL_DEFINITIONS,
    });

    // Collect tool-use blocks while streaming text to client
    const toolUses: Array<{ id: string; name: string; jsonStr: string }> = [];
    let activeTool: { id: string; name: string; jsonStr: string } | null = null;

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          activeTool = {
            id:      event.content_block.id,
            name:    event.content_block.name,
            jsonStr: '',
          };
          send({ type: 'tool_start', id: activeTool.id, name: activeTool.name });
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullAssistantText += event.delta.text;
          send({ type: 'text', delta: event.delta.text });
        } else if (event.delta.type === 'input_json_delta' && activeTool) {
          activeTool.jsonStr += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop' && activeTool) {
        toolUses.push({ ...activeTool });
        activeTool = null;
      }
    }

    const finalMsg = await stream.finalMessage();

    // No tool calls → done
    if (finalMsg.stop_reason !== 'tool_use' || toolUses.length === 0) break;

    // Execute all tools from this turn
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(tu.jsonStr || '{}') as Record<string, unknown>;
      } catch { /* use empty object */ }

      let resultStr: string;
      try {
        resultStr = await executeTool(tu.name, input, toolCtx);
      } catch (err) {
        resultStr = JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' });
      }

      send({ type: 'tool_result', id: tu.id, name: tu.name, result: resultStr });

      toolResults.push({
        type:        'tool_result',
        tool_use_id: tu.id,
        content:     resultStr,
      });
    }

    // Continue loop with tool results appended
    messages = [
      ...messages,
      { role: 'assistant', content: finalMsg.content },
      { role: 'user',      content: toolResults },
    ];
  }

  return fullAssistantText;
}

// ── Conversation DB helpers ───────────────────────────────────────────────────

async function ensureConversation(
  db:             pg.Pool,
  schoolId:       string,
  userId:         string,
  conversationId: string | null,
  firstMessage:   string
): Promise<string> {
  if (conversationId) {
    // Validate it belongs to this school + user
    const check = await db.query<{ id: string }>(
      'SELECT id FROM _ai_conversations WHERE id = $1 AND school_id = $2 AND user_id = $3',
      [conversationId, schoolId, userId]
    );
    if (check.rows[0]) return check.rows[0].id;
  }

  // Create new conversation; title = first 60 chars of user message
  const title = firstMessage.slice(0, 60);
  const result = await db.query<{ id: string }>(
    `INSERT INTO _ai_conversations (school_id, user_id, title)
     VALUES ($1, $2, $3) RETURNING id`,
    [schoolId, userId, title]
  );
  return result.rows[0]!.id;
}

async function loadHistory(
  db:             pg.Pool,
  schoolId:       string,
  conversationId: string,
  limit:          number
): Promise<Anthropic.MessageParam[]> {
  const result = await db.query<{
    role:    'user' | 'assistant';
    content: string | null;
  }>(
    `SELECT role, content FROM _ai_messages
     WHERE conversation_id = $1 AND school_id = $2
     ORDER BY created_at ASC
     LIMIT $3`,
    [conversationId, schoolId, limit]
  );

  return result.rows
    .filter(r => r.content)
    .map(r => ({
      role:    r.role,
      content: r.content!,
    }));
}

async function saveMessage(
  db:             pg.Pool,
  schoolId:       string,
  conversationId: string,
  role:           'user' | 'assistant',
  content:        string
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO _ai_messages (conversation_id, school_id, role, content)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [conversationId, schoolId, role, content]
  );
  return result.rows[0]?.id ?? '';
}
