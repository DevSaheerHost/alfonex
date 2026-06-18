export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb } from '@/lib/firebase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const snap = await adminRtdb().ref(`products/${id}`).get();
    if (!snap.exists()) return new NextResponse('Not found', { status: 404 });
    return NextResponse.json({ id, ...snap.val() });
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}
