import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = [
  '/orders',
  '/profile',
  '/wishlist',
  '/addresses',
  '/checkout',
  '/loyalty',
];

const AUTH_PATHS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;
  const isAuthenticated = Boolean(sessionCookie);

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin-auth')) {
    const host = request.headers.get('host') ?? '';
    // Block the public custom domain — admin only via the Vercel deployment URL
    if (host === 'alfonex.com' || host === 'www.alfonex.com') {
      return new NextResponse(null, { status: 404 });
    }
    // Admin HTML handles its own Firebase auth client-side — just pass through.
    return NextResponse.next();
  }

  // ── Customer auth routes ──────────────────────────────────────────────────
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage  = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets|api/auth).*)',
  ],
};

