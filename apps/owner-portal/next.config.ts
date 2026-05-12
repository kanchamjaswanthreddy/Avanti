import type { NextConfig } from 'next';

const config: NextConfig = {
  // Standalone output — minimal self-contained server for Docker/Cloud Run
  output: 'standalone',

  transpilePackages: ['@avanti/types', '@avanti/ui-tokens', '@avanti/utils'],
  experimental: {},
};

export default config;
