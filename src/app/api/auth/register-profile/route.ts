import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  const { uid, name, email, phone } = await request.json();

  if (!uid || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await adminDb().collection('users').doc(uid).set({
    name:      name ?? '',
    email,
    whatsapp:  phone ?? '',
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ status: 'ok' });
}
