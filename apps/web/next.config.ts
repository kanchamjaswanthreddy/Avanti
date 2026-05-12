import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  // Standalone output — minimal self-contained server for Docker/Cloud Run
  output: 'standalone',

  // Turbopack enabled via --turbopack flag in dev script
  transpilePackages: [
    '@avanti/types',
    '@avanti/ui-tokens',
    '@avanti/utils',
    '@avanti/api-client',
    '@avanti/schema-engine',
    '@avanti/i18n',
  ],

  experimental: {
    // React Compiler enabled via babel plugin — see babel.config.js when adding
  },

  // Tell Turbopack the monorepo root so CSS @imports and transpilePackages resolve correctly
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // Partial Pre-Rendering (renamed from experimental.ppr in Next.js 16)
  cacheComponents: true,

  // Security headers (full Helmet-equivalent via Next.js)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
