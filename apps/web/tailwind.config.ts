// Avanti — Tailwind Config
// Tailwind is used for TOKENS ONLY — not component utility classes.
// All actual components are hand-built with CSS modules + CSS custom properties.
// See packages/ui-tokens/tokens/*.css for the actual token values.

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui-tokens/src/**/*.{ts,tsx}',
  ],
  theme: {
    // Map all Tailwind color names to our CSS custom properties.
    // This means using a Tailwind class (if ever needed) will use our tokens.
    // But per architecture: prefer direct CSS var() usage in CSS modules.
    extend: {
      colors: {
        brand: {
          50:  'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          900: 'var(--color-brand-900)',
        },
        accent: {
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
        },
        surface: {
          page:    'var(--surface-page)',
          card:    'var(--surface-card)',
          sidebar: 'var(--surface-sidebar)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        sm:    'var(--shadow-sm)',
        md:    'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        focus: 'var(--shadow-focus)',
      },
    },
  },
  plugins: [],
};

export default config;
