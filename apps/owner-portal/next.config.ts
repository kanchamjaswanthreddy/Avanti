import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@vidyut/types', '@vidyut/ui-tokens', '@vidyut/utils'],
  experimental: {},
};

export default config;
