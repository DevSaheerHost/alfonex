import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import { hashPasscode } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const VALID_TYPES = ['digit4', 'digit6', 'alphanumeric'] as const;
type PinType = (typeof VALID_TYPES)[number];

export async function POST(req: NextRequest) {
  // Auth: Firebase ID token, must be super_admin
  const idToken = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let callerUid: string;
  try {
    const decoded   = await adminAuth().verifyIdToken(idToken);
    const adminSnap = await adminRtdb().ref(`admins/${decoded.uid}`).get();
    if (!adminSnap.exists()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if ((adminSnap.val() as { role?: string }).role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
    }
    callerUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { targetUid, pinType, pin, sessionHours, remove } = (await req.json()) as {
    targetUid?:    string;
    pinType?:      string;
    pin?:          string;
    sessionHours?: number;
    remove?:       boolean;
  };

  if (!targetUid) return NextResponse.json({ error: 'targetUid required' }, { status: 400 });

  // Confirm target exists
  const targetSnap = await adminRtdb().ref(`admins/${targetUid}`).get();
  if (!targetSnap.exists()) return NextResponse.json({ error: 'Target admin not found' }, { status: 404 });

  // Remove PIN
  if (remove) {
    await adminRtdb().ref(`admins/${targetUid}`).update({
      pin_hash:           null,
      pin_type:           null,
      pin_session_hours:  null,
      pin_last_verified:  null,
      pin_failed:         null,
      pin_lockout_until:  null,
    });
    return NextResponse.json({ ok: true });
  }

  // Validate type
  if (!pinType || !VALID_TYPES.includes(pinType as PinType)) {
    return NextResponse.json({ error: 'Invalid pin type' }, { status: 400 });
  }
  if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });

  // Validate format
  if (pinType === 'digit4' && !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'Must be exactly 4 digits' }, { status: 400 });
  }
  if (pinType === 'digit6' && !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'Must be exactly 6 digits' }, { status: 400 });
  }
  if (pinType === 'alphanumeric' && (pin.length < 6 || pin.length > 32)) {
    return NextResponse.json({ error: 'Must be 6–32 characters' }, { status: 400 });
  }

  // Validate sessionHours (-1 = never expire, 0 = every time, or positive)
  const VALID_SESSIONS = [-1, 0, 1, 8, 24, 168];
  const hours = sessionHours ?? 24;
  if (!VALID_SESSIONS.includes(hours)) {
    return NextResponse.json({ error: 'Invalid session duration' }, { status: 400 });
  }

  await adminRtdb().ref(`admins/${targetUid}`).update({
    pin_hash:          hashPasscode(pin),
    pin_type:          pinType,
    pin_session_hours: hours,
    pin_last_verified: 0,      // force re-auth on next panel open
    pin_failed:        0,
    pin_lockout_until: 0,
    pin_set_by:        callerUid,
    pin_set_at:        Date.now(),
  });

  return NextResponse.json({ ok: true });
}
