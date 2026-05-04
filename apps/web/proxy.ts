// Vidyut — Next.js Proxy (locale routing)
// Handles locale detection and routing via next-intl.
// Constants are inlined here (proxy runs in Edge — can't import TS packages).

import createMiddleware from 'next-intl/middleware';

const LOCALES    = ['en', 'hi', 'te', 'ta', 'kn', 'mr'] as const;
const DEFAULT_LOCALE = 'en' as const;

export default createMiddleware({
  locales:       LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Locale prefix is 'as-needed' — English URLs have no /en prefix
  localePrefix:  'as-needed',
});

export const config = {
  // Match all routes except API, _next static, and public assets
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
