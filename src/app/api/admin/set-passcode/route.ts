import { NextRequest, NextResponse } from 'next/server';
import { cookies }                    from 'next/headers';
import { verifyAdminToken, hashPasscode } from '@/lib/adminAuth';
import { adminRtdb }                  from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const VALID_TYPES = ['digit4', 'digit6', 'alphanumeric'] as const;
type PasscodeType = (typeof VALID_TYPES)[number];

export async function POST(req: NextRequest) {
  // Verify admin session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('__admin_sess')?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { type, passcode, sessionHours } = (await req.json()) as {
    type?:         string;
    passcode?:     string;
    sessionHours?: number;
  };

  if (!type || !VALID_TYPES.includes(type as PasscodeType)) {
    return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 });
  }
  if (!passcode) {
    return NextResponse.json({ ok: false, error: 'Passcode required' }, { status: 400 });
  }

  // Validate passcode format
  if (type === 'digit4' && !/^\d{4}$/.test(passcode)) {
    return NextResponse.json({ ok: false, error: 'Must be exactly 4 digits' }, { status: 400 });
  }
  if (type === 'digit6' && !/^\d{6}$/.test(passcode)) {
    return NextResponse.json({ ok: false, error: 'Must be exactly 6 digits' }, { status: 400 });
  }
  if (type === 'alphanumeric' && (passcode.length < 6 || passcode.length > 32)) {
    return NextResponse.json({ ok: false, error: 'Must be 6–32 characters' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    passcode_hash: hashPasscode(passcode),
    passcode_type: type,
    // Clear any existing lockout when passcode changes
    failed_attempts: 0,
    lockout_until:   0,
  };
  if (sessionHours && [1, 8, 24, 168].includes(sessionHours)) {
    update.session_hours = sessionHours;
  }

  await adminRtdb().ref('admin_config').update(update);
  return NextResponse.json({ ok: true });
}
