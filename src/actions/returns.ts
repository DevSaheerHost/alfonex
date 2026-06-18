'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import { notifyAdmins } from '@/lib/firebase/notify-admins';

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');
  return adminAuth().verifySessionCookie(session, true);
}

export type ReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'not_as_described'
  | 'changed_mind'
  | 'other';

export type ReturnStatus =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'refunded'
  | 'replaced';

export interface ReturnRequest {
  id:          string;
  uid:         string;
  orderId:     string;
  productName: string;
  reason:      ReturnReason;
  description: string;
  status:      ReturnStatus;
  adminNotes:  string;
  createdAt:   number;
  updatedAt:   number;
}

export async function submitReturn(data: {
  orderId:     string;
  productName: string;
  reason:      ReturnReason;
  description: string;
}): Promise<{ ok: boolean }> {
  const user = await verifySession();

  const record: Omit<ReturnRequest, 'id'> = {
    ...data,
    uid:        user.uid,
    status:     'submitted',
    adminNotes: '',
    createdAt:  Date.now(),
    updatedAt:  Date.now(),
  };

  await adminRtdb().ref('return_requests').push(record);

  try {
    await notifyAdmins(
      `↩️ Return Request — ${data.productName}`,
      `Order #${data.orderId.slice(-6)} · ${data.reason.replace(/_/g, ' ')}`,
      { type: 'return', orderId: data.orderId },
    );
  } catch { /* never block submission */ }

  return { ok: true };
}

export async function getMyReturns(): Promise<ReturnRequest[]> {
  const user = await verifySession();
  const snap = await adminRtdb()
    .ref('return_requests')
    .orderByChild('uid')
    .equalTo(user.uid)
    .get();
  if (!snap.exists()) return [];
  return Object.entries(snap.val() as Record<string, Omit<ReturnRequest, 'id'>>)
    .map(([id, v]) => ({ ...v, id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
