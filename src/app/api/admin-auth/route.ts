import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken, hashPasscode } from '@/lib/adminAuth';
import { adminRtdb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const COOKIE      = '__admin_sess';
const MAX_FAILS   = 5;
const LOCKOUT_MS  = 10 * 60 * 1000; // 10 minutes

const SESSION_MAP: Record<number, { jwt: string; maxAge: number }> = {
  1:   { jwt: '1h',  maxAge: 3_600 },
  8:   { jwt: '8h',  maxAge: 28_800 },
  24:  { jwt: '24h', maxAge: 86_400 },
  168: { jwt: '7d',  maxAge: 604_800 },
};

// Public — returns passcode type so login form renders the right input
export async function GET() {
  try {
    const snap = await adminRtdb().ref('admin_config/passcode_type').get();
    const type  = (snap.val() as string | null) ?? 'digit6';
    return NextResponse.json({ type });
  } catch {
    return NextResponse.json({ type: 'digit6' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { passcode } = (await req.json()) as { passcode?: string };
    if (!passcode) {
      return NextResponse.json({ ok: false, error: 'Passcode required' }, { status: 400 });
    }

    const cfg = await adminRtdb().ref('admin_config').get();
    const config = (cfg.val() ?? {}) as {
      passcode_hash?:   string;
      session_hours?:   number;
      lockout_until?:   number;
      failed_attempts?: number;
    };

    // Lockout check
    if ((config.lockout_until ?? 0) > Date.now()) {
      const secsLeft = Math.ceil(((config.lockout_until ?? 0) - Date.now()) / 1000);
      return NextResponse.json(
        { ok: false, error: `Too many attempts. Try again in ${secsLeft}s.` },
        { status: 429 },
      );
    }

    // If RTDB has a stored hash use it; otherwise fall back to ADMIN_PASSWORD env var
    const expectedHash = config.passcode_hash
      ?? hashPasscode(process.env.ADMIN_PASSWORD ?? '');

    if (hashPasscode(passcode) !== expectedHash) {
      const fails = (config.failed_attempts ?? 0) + 1;
      const update: Record<string, number> = { failed_attempts: fails };
      if (fails >= MAX_FAILS) update.lockout_until = Date.now() + LOCKOUT_MS;
      await adminRtdb().ref('admin_config').update(update);
      return NextResponse.json({ ok: false, error: 'Wrong passcode' }, { status: 401 });
    }

    // Correct — reset counters, record login time
    const sessionHours = config.session_hours ?? 24;
    const sess = SESSION_MAP[sessionHours] ?? SESSION_MAP[24];
    await adminRtdb().ref('admin_config').update({
      failed_attempts: 0,
      lockout_until:   0,
      last_login_at:   Date.now(),
    });

    const token = await signAdminToken(sess.jwt);
    const res   = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure:   true,
      sameSite: 'strict',
      maxAge:   sess.maxAge,
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
