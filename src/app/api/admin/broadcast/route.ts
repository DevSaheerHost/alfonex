import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import { notifyAdmins } from '@/lib/firebase/notify-admins';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken    = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const decoded   = await adminAuth().verifyIdToken(idToken);
    const adminSnap = await adminRtdb().ref(`admins/${decoded.uid}`).get();
    if (!adminSnap.exists()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { title, body, data } = (await req.json()) as {
    title: string;
    body:  string;
    data?: Record<string, string>;
  };
  if (!title || !body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  await notifyAdmins(title, body, data);
  return NextResponse.json({ ok: true });
}
