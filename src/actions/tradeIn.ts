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

export interface TradeInRequest {
  id?:            string;
  uid?:           string;
  customerName:   string;
  customerPhone:  string;
  deviceModel:    string;
  deviceStorage:  string;
  deviceCondition: 'excellent' | 'good' | 'fair' | 'poor';
  hasCharger:     boolean;
  hasBox:         boolean;
  imei:           string;
  notes:          string;
  desiredProduct: string;
  status:         'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt:      number;
}

export async function submitTradeIn(
  data: Omit<TradeInRequest, 'id' | 'uid' | 'status' | 'createdAt'>,
): Promise<{ ok: boolean }> {
  const user = await verifySession();

  const record: Omit<TradeInRequest, 'id'> = {
    ...data,
    uid:       user.uid,
    status:    'pending',
    createdAt: Date.now(),
  };

  await adminRtdb().ref('trade_in_requests').push(record);

  try {
    await notifyAdmins(
      `🔄 Trade-In Request — ${data.deviceModel}`,
      `${data.customerName} · ${data.deviceCondition} condition · wants ${data.desiredProduct || 'any'}`,
      { type: 'trade_in' },
    );
  } catch { /* never block submission */ }

  return { ok: true };
}

export async function getMyTradeIns(): Promise<TradeInRequest[]> {
  const user = await verifySession();
  const snap = await adminRtdb().ref('trade_in_requests').orderByChild('uid').equalTo(user.uid).get();
  if (!snap.exists()) return [];
  return Object.entries(snap.val() as Record<string, TradeInRequest>)
    .map(([id, v]) => ({ ...v, id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
