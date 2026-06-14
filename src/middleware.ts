import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') ?? '';

  // ── Admin routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin-auth')) {
    // Block access from the public custom domain
    if (host === 'alfonex.com' || host === 'www.alfonex.com') {
      return new NextResponse(null, { status: 404 });
    }

    // Login page and auth API are publicly reachable (on the Vercel URL)
    if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/admin-auth')) {
      return NextResponse.next();
    }

    // All other /admin/* require the session cookie
    const token = req.cookies.get('__admin_sess')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin-auth', '/api/admin-auth/:path*'],
};
