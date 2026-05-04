// Vidyut Chat Store — Zustand v5
// Manages AI chat panel state: messages, streaming cursor, voice recording.

import { create } from 'zustand';
import type { AIMessage, AIToolCall } from '@vidyut/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveTool {
  id:   string;
  name: string;
}

interface ToolResult {
  id:     string;
  name:   string;
  result: string;
}

export interface ChatStore {
  // Panel state
  isOpen:         boolean;

  // Conversation
  conversationId: string | null;
  messages:       AIMessage[];

  // Streaming
  isStreaming:    boolean;
  streamingText:  string;    // partial assistant text being built
  activeTools:    ActiveTool[];
  toolResults:    ToolResult[];

  // Voice
  isRecording:    boolean;
  isSpeaking:     boolean;
  lastLanguage:   string;    // detected language from last transcript

  // Error
  error:          string | null;

  // ── Actions ──────────────────────────────────────────────────────────────────

  open:    () => void;
  close:   () => void;
  toggle:  () => void;

  // Called by chat.ts stream reader
  startStream:  () => void;
  appendText:   (delta: string) => void;
  addToolStart: (id: string, name: string) => void;
  addToolResult:(id: string, name: string, result: string) => void;
  finishStream: (conversationId: string, messageId: string) => void;
  setError:     (msg: string) => void;
  clearError:   () => void;

  addUserMessage: (content: string) => void;

  setRecording: (val: boolean) => void;
  setSpeaking:  (val: boolean) => void;
  setLanguage:  (lang: string) => void;

  reset: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen:         false,
  conversationId: null,
  messages:       [],
  isStreaming:    false,
  streamingText:  '',
  activeTools:    [],
  toolResults:    [],
  isRecording:    false,
  isSpeaking:     false,
  lastLanguage:   'en-IN',
  error:          null,

  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set(s => ({ isOpen: !s.isOpen })),

  startStream() {
    set({ isStreaming: true, streamingText: '', activeTools: [], toolResults: [], error: null });
  },

  appendText(delta) {
    set(s => ({ streamingText: s.streamingText + delta }));
  },

  addToolStart(id, name) {
    set(s => ({ activeTools: [...s.activeTools, { id, name }] }));
  },

  addToolResult(id, name, result) {
    set(s => ({
      activeTools: s.activeTools.filter(t => t.id !== id),
      toolResults: [...s.toolResults, { id, name, result }],
    }));
  },

  finishStream(conversationId, messageId) {
    const { streamingText, toolResults } = get();

    const toolCalls: AIToolCall[] = toolResults.map(tr => ({
      id:    tr.id,
      name:  tr.name,
      input: {},  // not exposed in client for brevity
    }));

    const assistantMsg: AIMessage = {
      id:             messageId,
      conversationId,
      schoolId:       '',
      role:           'assistant',
      content:        streamingText,
      toolCalls:      toolCalls.length > 0 ? toolCalls : null,
      createdAt:      new Date().toISOString(),
    };

    set(s => ({
      isStreaming:    false,
      streamingText:  '',
      activeTools:    [],
      toolResults:    [],
      conversationId,
      messages: [...s.messages, assistantMsg],
    }));
  },

  setError(msg) {
    set({ isStreaming: false, streamingText: '', activeTools: [], error: msg });
  },

  clearError: () => set({ error: null }),

  addUserMessage(content) {
    const msg: AIMessage = {
      id:             crypto.randomUUID(),
      conversationId: get().conversationId ?? 'pending',
      schoolId:       '',
      role:           'user',
      content,
      toolCalls:      null,
      createdAt:      new Date().toISOString(),
    };
    set(s => ({ messages: [...s.messages, msg] }));
  },

  setRecording: (val) => set({ isRecording: val }),
  setSpeaking:  (val) => set({ isSpeaking: val }),
  setLanguage:  (lang) => set({ lastLanguage: lang }),

  reset: () => set({
    conversationId: null,
    messages:       [],
    isStreaming:    false,
    streamingText:  '',
    activeTools:    [],
    toolResults:    [],
    error:          null,
  }),
}));
