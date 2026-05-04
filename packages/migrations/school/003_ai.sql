-- Vidyut School DB — Migration 003: AI Conversations
-- Creates conversation history tables for the AI agent.
-- _ai_conversations: one row per chat session per user
-- _ai_messages:      ordered message history (user + assistant pairs)

BEGIN;

INSERT INTO _migration_history (version, name) VALUES (3, '003_ai');

-- ── Conversation sessions ─────────────────────────────────────────────────────

CREATE TABLE _ai_conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID        NOT NULL,
  user_id     UUID        NOT NULL,
  title       TEXT,                        -- auto-set from first user message
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX _ai_conv_school_user_idx ON _ai_conversations (school_id, user_id, created_at DESC);

-- ── Message history ───────────────────────────────────────────────────────────
-- role: 'user' | 'assistant'
-- tool_calls JSONB: [{id, name, input}] — stored on assistant messages
-- tool_call_id/tool_name: for tool result messages stored inline

CREATE TABLE _ai_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES _ai_conversations(id) ON DELETE CASCADE,
  school_id        UUID        NOT NULL,
  role             TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT,
  tool_calls       JSONB,                  -- assistant tool_use blocks
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX _ai_msg_conv_created_idx ON _ai_messages (conversation_id, created_at ASC);

-- ── Auto-update trigger ───────────────────────────────────────────────────────

CREATE TRIGGER trg__ai_conversations_updated_at
  BEFORE UPDATE ON _ai_conversations
  FOR EACH ROW EXECUTE FUNCTION _vidyut_update_updated_at();

COMMIT;
