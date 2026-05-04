// Vidyut — SSE Chat Stream Helper
// Opens a fetch stream to the AI chat endpoint and parses Server-Sent Events.
// Calls typed callbacks for each event — caller manages store state.

import type { AIChatEvent } from '@vidyut/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StreamChatOptions {
  baseUrl:         string;
  token:           string;
  message:         string;
  conversationId?: string;
  screen?:         string;
  onText:          (delta: string) => void;
  onToolStart:     (id: string, name: string) => void;
  onToolResult:    (id: string, name: string, result: string) => void;
  onDone:          (conversationId: string, messageId: string) => void;
  onError:         (message: string) => void;
  signal?:         AbortSignal;
}

// ── Stream helper ─────────────────────────────────────────────────────────────

export async function streamChat(opts: StreamChatOptions): Promise<void> {
  const { baseUrl, token, message, conversationId, screen, signal } = opts;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        message,
        ...(conversationId ? { conversationId } : {}),
        ...(screen         ? { screen }         : {}),
      }),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    opts.onError(err instanceof Error ? err.message : 'Network error');
    return;
  }

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const body = await response.json() as { message?: string };
      if (body.message) msg = body.message;
    } catch { /* ignore */ }
    opts.onError(msg);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    opts.onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are delimited by \n\n
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';  // keep last incomplete chunk

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;

        const jsonStr = line.slice('data:'.length).trim();
        if (!jsonStr) continue;

        let event: AIChatEvent;
        try {
          event = JSON.parse(jsonStr) as AIChatEvent;
        } catch { continue; }

        switch (event.type) {
          case 'text':
            opts.onText(event.delta);
            break;
          case 'tool_start':
            opts.onToolStart(event.id, event.name);
            break;
          case 'tool_result':
            opts.onToolResult(event.id, event.name, event.result);
            break;
          case 'done':
            opts.onDone(event.conversationId, event.messageId);
            break;
          case 'error':
            opts.onError(event.message);
            break;
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    opts.onError(err instanceof Error ? err.message : 'Stream error');
  } finally {
    reader.releaseLock();
  }
}
