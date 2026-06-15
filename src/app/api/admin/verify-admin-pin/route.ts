import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import { hashPasscode } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const MAX_FAILS  = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: NextRequest) {
  const idToken = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded   = await adminAuth().verifyIdToken(idToken);
    const adminSnap = await adminRtdb().ref(`admins/${decoded.uid}`).get();
    if (!adminSnap.exists()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { pin } = (await req.json()) as { pin?: string };
  if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });

  const snap   = await adminRtdb().ref(`admins/${uid}`).get();
  const config = (snap.val() ?? {}) as {
    pin_hash?:         string;
    pin_lockout_until?: number;
    pin_failed?:       number;
  };

  if (!config.pin_hash) {
    // No PIN configured — pass through
    return NextResponse.json({ ok: true });
  }

  // Lockout check
  if ((config.pin_lockout_until ?? 0) > Date.now()) {
    const secsLeft = Math.ceil(((config.pin_lockout_until ?? 0) - Date.now()) / 1000);
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Try again in ${secsLeft}s.` },
      { status: 429 },
    );
  }

  if (hashPasscode(pin) !== config.pin_hash) {
    const fails  = (config.pin_failed ?? 0) + 1;
    const update: Record<string, number> = { pin_failed: fails };
    if (fails >= MAX_FAILS) update.pin_lockout_until = Date.now() + LOCKOUT_MS;
    await adminRtdb().ref(`admins/${uid}`).update(update);
    return NextResponse.json({ ok: false, error: 'Wrong PIN' }, { status: 401 });
  }

  // Correct — reset counters and record verification time
  await adminRtdb().ref(`admins/${uid}`).update({
    pin_failed:        0,
    pin_lockout_until: 0,
    pin_last_verified: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
