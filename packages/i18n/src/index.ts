// @avanti/i18n — Shared i18n configuration and message loader

export * from './config.js';

// ── Message loader (server-side / build-time) ──────────────────────────────

import type { Locale } from './config.js';

export type Messages = Record<string, unknown>;

// Dynamic import map — bundler-safe
export async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case 'hi': return (await import('./messages/hi.json', { with: { type: 'json' } })).default as Messages;
    case 'te': return (await import('./messages/te.json', { with: { type: 'json' } })).default as Messages;
    case 'ta': return (await import('./messages/ta.json', { with: { type: 'json' } })).default as Messages;
    case 'kn': return (await import('./messages/kn.json', { with: { type: 'json' } })).default as Messages;
    case 'mr': return (await import('./messages/mr.json', { with: { type: 'json' } })).default as Messages;
    default:   return (await import('./messages/en.json', { with: { type: 'json' } })).default as Messages;
  }
}
