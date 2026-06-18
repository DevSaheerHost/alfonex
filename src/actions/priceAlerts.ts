'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');
  return adminAuth().verifySessionCookie(session, true);
}

export async function subscribePriceAlert(
  productId: string,
  productTitle: string,
  productImage: string,
  currentPrice: number,
): Promise<{ ok: boolean }> {
  const user = await verifySession();
  const tokenSnap = await adminRtdb().ref(`users/${user.uid}/fcmToken`).get();
  await adminRtdb().ref(`price_alerts/${productId}/${user.uid}`).set({
    subscribedAt:  Date.now(),
    targetPrice:   currentPrice,
    productTitle,
    productImage:  productImage || '',
    fcmToken:      tokenSnap.exists() ? (tokenSnap.val() as string) : '',
  });
  return { ok: true };
}

export async function unsubscribePriceAlert(productId: string): Promise<{ ok: boolean }> {
  const user = await verifySession();
  await adminRtdb().ref(`price_alerts/${productId}/${user.uid}`).remove();
  return { ok: true };
}

export async function getPriceAlertStatus(productId: string): Promise<boolean> {
  try {
    const user = await verifySession();
    const snap = await adminRtdb().ref(`price_alerts/${productId}/${user.uid}`).get();
    return snap.exists();
  } catch {
    return false;
  }
}
