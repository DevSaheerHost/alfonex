import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/adminAuth';

const COOKIE = '__admin_sess';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json() as { password?: string };
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
    }
    const token = await signAdminToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure:   true,
      sameSite: 'strict',
      maxAge:   60 * 60 * 24, // 24 h
      path:     '/',
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
