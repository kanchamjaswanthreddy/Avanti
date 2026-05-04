'use client';

// Avanti — AI Chat Message Components
// ChatMessage: rendered message bubble (user or assistant).
// StreamingMessage: in-progress assistant reply with blinking cursor.

import type { AIMessage } from '@avanti/types';

// ── ChatMessage ───────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: AIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser   = message.role === 'user';
  const hasTools = message.toolCalls && message.toolCalls.length > 0;

  return (
    <div
      style={{
        display:       'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom:  'var(--space-3)',
      }}
    >
      <div
        style={{
          maxWidth:     '82%',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding:      'var(--space-3) var(--space-4)',
          background:   isUser ? 'var(--color-brand-500)' : 'var(--surface-card)',
          color:        isUser ? '#fff' : 'var(--text-primary)',
          border:       isUser ? 'none' : '1px solid var(--color-gray-200)',
          fontSize:     'var(--text-sm)',
          lineHeight:   '1.65',
          whiteSpace:   'pre-wrap',
          wordBreak:    'break-word',
        }}
      >
        {/* Tool call badges (assistant only) */}
        {hasTools && (
          <div style={{ marginBottom: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {message.toolCalls!.map(tc => (
              <span
                key={tc.id}
                style={{
                  fontSize:   '10px',
                  fontFamily: 'var(--font-mono, monospace)',
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: '4px',
                  padding:    '2px 6px',
                  color:      'var(--text-muted)',
                }}
              >
                {tc.name}
              </span>
            ))}
          </div>
        )}

        {message.content ?? ''}
      </div>
    </div>
  );
}

// ── StreamingMessage ──────────────────────────────────────────────────────────

interface StreamingMessageProps {
  text:        string;
  activeTools: { id: string; name: string }[];
}

export function StreamingMessage({ text, activeTools }: StreamingMessageProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 'var(--space-3)' }}>
      <div
        style={{
          maxWidth:     '82%',
          borderRadius: '14px 14px 14px 4px',
          padding:      'var(--space-3) var(--space-4)',
          background:   'var(--surface-card)',
          color:        'var(--text-primary)',
          border:       '1px solid var(--color-gray-200)',
          fontSize:     'var(--text-sm)',
          lineHeight:   '1.65',
          whiteSpace:   'pre-wrap',
          wordBreak:    'break-word',
        }}
      >
        {/* Active tool badges */}
        {activeTools.length > 0 && (
          <div style={{ marginBottom: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {activeTools.map(t => (
              <span
                key={t.id}
                style={{
                  fontSize:   '10px',
                  fontFamily: 'var(--font-mono, monospace)',
                  background: 'var(--color-brand-50, #eff6ff)',
                  borderRadius: '4px',
                  padding:    '2px 6px',
                  color:      'var(--color-brand-600, #1d4ed8)',
                  border:     '1px solid var(--color-brand-200, #bfdbfe)',
                }}
              >
                ⚙ {t.name}
              </span>
            ))}
          </div>
        )}

        {text || (activeTools.length === 0 && (
          <span style={{ opacity: 0.5 }}>Thinking…</span>
        ))}

        {/* Blinking cursor */}
        <span
          style={{
            display:       'inline-block',
            width:         '2px',
            height:        '1em',
            background:    'var(--color-brand-500, #1A3C6B)',
            marginLeft:    '2px',
            verticalAlign: 'text-bottom',
            animation:     'avanti-blink 1s step-end infinite',
          }}
        />
        <style>{`@keyframes avanti-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    </div>
  );
}
