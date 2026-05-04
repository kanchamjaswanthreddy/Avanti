// Vidyut AI Agent Types
// From TechnicalArchitecture_v1.docx Section 8

// ── Conversation & message storage ───────────────────────────────────────────

export type AIRole = 'user' | 'assistant';

export interface AIToolCall {
  id:    string;
  name:  string;
  input: Record<string, unknown>;
}

export interface AIMessage {
  id:             string;
  conversationId: string;
  schoolId:       string;
  role:           AIRole;
  content:        string | null;
  toolCalls:      AIToolCall[] | null;  // on assistant messages
  createdAt:      string;
}

export interface AIConversation {
  id:        string;
  schoolId:  string;
  userId:    string;
  title:     string | null;
  createdAt: string;
  updatedAt: string;
}

// ── SSE event stream (POST /api/v1/ai/chat → text/event-stream) ───────────────
// Each line: `data: <JSON>\n\n`

export type AIChatEvent =
  | { type: 'text';        delta: string }
  | { type: 'tool_start';  id: string; name: string }
  | { type: 'tool_result'; id: string; name: string; result: string }
  | { type: 'done';        conversationId: string; messageId: string }
  | { type: 'error';       message: string };

// ── Voice ─────────────────────────────────────────────────────────────────────

export interface VoiceTranscribeResult {
  transcript: string;
  language:   string;   // BCP-47 e.g. 'en-IN', 'hi-IN', 'te-IN'
  provider:   'sarvam' | 'whisper';
}
