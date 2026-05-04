'use client';

// Vidyut — AI Chat Panel
// 360px slide-in panel from the right side.
// Connects SSE stream → chatStore; renders message history + streaming cursor.

import { useRef, useEffect, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ChatMessage, StreamingMessage } from './ChatMessage';
import { VoiceButton } from './VoiceButton';
import { streamChat } from '../../lib/chat';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export function ChatPanel() {
  const pathname       = usePathname();
  const accessToken    = useAuthStore(s => s.accessToken);
  const isOpen         = useChatStore(s => s.isOpen);
  const close          = useChatStore(s => s.close);
  const messages       = useChatStore(s => s.messages);
  const isStreaming    = useChatStore(s => s.isStreaming);
  const streamingText  = useChatStore(s => s.streamingText);
  const activeTools    = useChatStore(s => s.activeTools);
  const conversationId = useChatStore(s => s.conversationId);
  const error          = useChatStore(s => s.error);

  const startStream    = useChatStore(s => s.startStream);
  const appendText     = useChatStore(s => s.appendText);
  const addToolStart   = useChatStore(s => s.addToolStart);
  const addToolResult  = useChatStore(s => s.addToolResult);
  const finishStream   = useChatStore(s => s.finishStream);
  const setError       = useChatStore(s => s.setError);
  const clearError     = useChatStore(s => s.clearError);
  const addUserMessage = useChatStore(s => s.addUserMessage);

  const [input, setInput]   = useState('');
  const bottomRef           = useRef<HTMLDivElement>(null);
  const abortRef            = useRef<AbortController | null>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages / streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    clearError();
    addUserMessage(trimmed);
    setInput('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    startStream();

    await streamChat({
      baseUrl:        API_BASE,
      token:          accessToken ?? '',
      message:        trimmed,
      ...(conversationId ? { conversationId } : {}),
      screen:         pathname ?? undefined,
      onText:         appendText,
      onToolStart:    addToolStart,
      onToolResult:   addToolResult,
      onDone:         finishStream,
      onError:        setError,
      signal:         controller.signal,
    });
  }, [
    isStreaming, conversationId, accessToken, pathname,
    clearError, addUserMessage, startStream,
    appendText, addToolStart, addToolResult, finishStream, setError,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleTranscript = (transcript: string) => {
    setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    textareaRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            style={{
              position: 'fixed',
              inset:    0,
              background: 'rgba(0,0,0,0.18)',
              zIndex:   'var(--z-overlay, 400)',
            }}
          />

          {/* Panel */}
          <motion.aside
            key="ai-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42, mass: 0.9 }}
            style={{
              position:       'fixed',
              top:            0,
              right:          0,
              bottom:         0,
              width:          '360px',
              background:     'var(--surface-page)',
              borderLeft:     '1px solid var(--color-gray-200)',
              zIndex:         'calc(var(--z-overlay, 400) + 1)',
              display:        'flex',
              flexDirection:  'column',
              boxShadow:      'var(--shadow-xl, -4px 0 24px rgba(0,0,0,0.12))',
            }}
          >
            {/* ── Header ──────────────────────────────────────────── */}
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        'var(--space-4) var(--space-5)',
                borderBottom:   '1px solid var(--color-gray-200)',
                background:     'var(--surface-card)',
                flexShrink:     0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span
                  style={{
                    fontSize:   '20px',
                    lineHeight: 1,
                    color:      'var(--color-brand-500)',
                  }}
                >
                  ✦
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Vidyut AI</div>
                  {isStreaming && (
                    <div style={{ fontSize: '11px', color: 'var(--color-brand-500)', marginTop: '1px' }}>
                      Thinking…
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                style={{
                  border:      'none',
                  background:  'none',
                  cursor:      'pointer',
                  color:       'var(--text-muted)',
                  padding:     'var(--space-1)',
                  borderRadius: '6px',
                  display:     'flex',
                  alignItems:  'center',
                }}
                title="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* ── Message list ─────────────────────────────────────── */}
            <div
              style={{
                flex:      1,
                overflowY: 'auto',
                padding:   'var(--space-4)',
              }}
            >
              {messages.length === 0 && !isStreaming && (
                <div
                  style={{
                    textAlign:  'center',
                    color:      'var(--text-muted)',
                    fontSize:   'var(--text-sm)',
                    marginTop:  'var(--space-10)',
                    lineHeight: '1.6',
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>✦</div>
                  <div style={{ fontWeight: 500 }}>Ask me anything about your school</div>
                  <div style={{ fontSize: '12px', marginTop: 'var(--space-2)', opacity: 0.65 }}>
                    Students, attendance, fees, timetables, reports…
                  </div>
                </div>
              )}

              {messages.map(m => (
                <ChatMessage key={m.id} message={m} />
              ))}

              {isStreaming && (
                <StreamingMessage text={streamingText} activeTools={activeTools} />
              )}

              {error && (
                <div
                  style={{
                    background:   'var(--color-error-50, #fef2f2)',
                    border:       '1px solid var(--color-error-200, #fecaca)',
                    borderRadius: '10px',
                    padding:      'var(--space-3)',
                    fontSize:     'var(--text-sm)',
                    color:        'var(--color-error-700, #b91c1c)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Input row ────────────────────────────────────────── */}
            <div
              style={{
                padding:    'var(--space-3) var(--space-4)',
                borderTop:  '1px solid var(--color-gray-200)',
                background: 'var(--surface-card)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display:      'flex',
                  gap:          'var(--space-2)',
                  alignItems:   'flex-end',
                  background:   'var(--surface-page)',
                  border:       '1px solid var(--color-gray-200)',
                  borderRadius: '12px',
                  padding:      'var(--space-2) var(--space-3)',
                  transition:   'border-color 150ms',
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  placeholder="Ask anything…"
                  rows={1}
                  style={{
                    flex:       1,
                    border:     'none',
                    background: 'transparent',
                    resize:     'none',
                    outline:    'none',
                    fontSize:   'var(--text-sm)',
                    color:      'var(--text-primary)',
                    lineHeight: '1.5',
                    maxHeight:  '120px',
                    overflowY:  'auto',
                    fontFamily: 'var(--font-sans, Inter, sans-serif)',
                  }}
                />

                <VoiceButton onTranscript={handleTranscript} disabled={isStreaming} />

                {/* Send button */}
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  style={{
                    width:           '32px',
                    height:          '32px',
                    borderRadius:    '8px',
                    border:          'none',
                    background:      input.trim() && !isStreaming
                      ? 'var(--color-brand-500)'
                      : 'var(--color-gray-200)',
                    color:           input.trim() && !isStreaming
                      ? '#fff'
                      : 'var(--color-gray-400)',
                    cursor:          input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    flexShrink:      0,
                    transition:      'background 150ms, color 150ms',
                  }}
                  title="Send (Enter)"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path
                      d="M2 7h10M7.5 2.5L12 7l-4.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
                Enter to send · Shift+Enter for new line
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
