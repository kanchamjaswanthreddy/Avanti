// Avanti — Next.js Proxy (request interceptor)
// Currently a pass-through. Locale routing via next-intl will be
// wired in Phase 4 when multi-language support is added to pages.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
