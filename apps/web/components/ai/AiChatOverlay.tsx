'use client';

// Vidyut — AI Chat Overlay
// Renders the floating "✦" trigger button (bottom-right) + the ChatPanel.
// This is the only AI-related import needed in the dashboard layout.

import { motion } from 'motion/react';
import { useChatStore } from '../../store/chatStore';
import { ChatPanel } from './ChatPanel';

export function AiChatOverlay() {
  const isOpen = useChatStore(s => s.isOpen);
  const toggle = useChatStore(s => s.toggle);

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position:        'fixed',
          bottom:          '24px',
          right:           '24px',
          width:           '48px',
          height:          '48px',
          borderRadius:    '50%',
          border:          'none',
          background:      isOpen
            ? 'var(--color-gray-800, #1f2937)'
            : 'var(--color-brand-500, #1A3C6B)',
          color:           '#fff',
          cursor:          'pointer',
          zIndex:          'var(--z-overlay, 400)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.18))',
          transition:      'background 200ms',
        }}
        title={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3.5 3.5l9 9M12.5 3.5l-9 9"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <span style={{ fontSize: '20px', lineHeight: 1 }}>✦</span>
        )}
      </motion.button>

      <ChatPanel />
    </>
  );
}
