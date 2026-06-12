'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import type { LoyaltyEntry } from '@/lib/types';

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');
  return adminAuth().verifySessionCookie(session, true);
}

export async function getMyLoyalty(): Promise<{
  points:       number;
  history:      LoyaltyEntry[];
  referralCode: string;
}> {
  const user = await verifySession();

  const [pointsSnap, historySnap, codeSnap] = await Promise.allSettled([
    adminRtdb().ref(`users/${user.uid}/loyaltyPoints`).get(),
    adminRtdb().ref(`loyalty_history/${user.uid}`).orderByChild('createdAt').limitToLast(20).get(),
    adminRtdb().ref(`users/${user.uid}/referralCode`).get(),
  ]);

  const points = pointsSnap.status === 'fulfilled'
    ? ((pointsSnap.value.val() as number | null) ?? 0)
    : 0;

  const history: LoyaltyEntry[] =
    historySnap.status === 'fulfilled' && historySnap.value.exists()
      ? Object.entries(historySnap.value.val() as Record<string, Omit<LoyaltyEntry, 'id'>>)
          .map(([id, data]) => ({ id, ...data } as LoyaltyEntry))
          .sort((a, b) => b.createdAt - a.createdAt)
      : [];

  let referralCode: string =
    codeSnap.status === 'fulfilled'
      ? ((codeSnap.value.val() as string | null) ?? '')
      : '';

  if (!referralCode) {
    referralCode = user.uid.slice(0, 8).toUpperCase();
    try {
      await adminRtdb().ref(`users/${user.uid}/referralCode`).set(referralCode);
    } catch { /* non-fatal */ }
  }

  return { points, history, referralCode };
}

export async function applyReferralCode(code: string): Promise<void> {
  if (!code) return;
  try {
    const user = await verifySession();

    // Don't apply if already referred
    const alreadySnap = await adminRtdb().ref(`users/${user.uid}/referredBy`).get();
    if (alreadySnap.exists()) return;

    // Find the referrer uid by code
    const usersSnap = await adminRtdb()
      .ref('users')
      .orderByChild('referralCode')
      .equalTo(code.toUpperCase())
      .get();

    if (!usersSnap.exists()) return;
    const referrerId = Object.keys(usersSnap.val() as Record<string, unknown>)[0];
    if (!referrerId || referrerId === user.uid) return;

    // Mark current user as referred (points awarded when they place first order)
    await adminRtdb().ref(`users/${user.uid}/referredBy`).set(referrerId);
  } catch {
    // Never block registration
  }
}
