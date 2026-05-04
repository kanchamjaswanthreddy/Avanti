import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@avanti/types', '@avanti/ui-tokens', '@avanti/utils'],
  experimental: {},
};

export default config;
