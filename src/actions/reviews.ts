'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import type { Review } from '@/lib/types';

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');
  return adminAuth().verifySessionCookie(session, true);
}

export async function submitReview(
  productId:  string,
  orderId:    string,
  rating:     number,
  text:       string,
  mediaUrls:  string[],
): Promise<void> {
  const user = await verifySession();

  // Verify the order belongs to this user and is delivered
  const orderSnap = await adminRtdb().ref(`orders/${orderId}`).get();
  if (!orderSnap.exists()) throw new Error('Order not found');
  const order = orderSnap.val() as { userId: string; status: string; delivered_at?: string };
  if (order.userId !== user.uid) throw new Error('Forbidden');
  if (order.status !== 'Delivered') throw new Error('Order not delivered yet');

  // Enforce 30-minute wait after delivery
  if (order.delivered_at) {
    const deliveredMs = new Date(order.delivered_at).getTime();
    if (Date.now() - deliveredMs < 30 * 60 * 1000) {
      throw new Error('Please wait 30 minutes after delivery before reviewing');
    }
  }

  // Prevent duplicate review for this order + product
  const dupSnap = await adminRtdb().ref(`order_reviews/${orderId}/${productId}`).get();
  if (dupSnap.exists()) throw new Error('You have already reviewed this product for this order');

  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

  const userSnap = await adminRtdb().ref(`users/${user.uid}`).get();
  const userName = (userSnap.val() as { name?: string } | null)?.name ?? user.email ?? 'Customer';

  await adminRtdb().ref(`reviews/${productId}`).push({
    productId,
    orderId,
    userId:    user.uid,
    userName,
    rating,
    text:      text.trim(),
    mediaUrls,
    createdAt: Date.now(),
    verified:  true,
  });

  // Mark order+product as reviewed
  await adminRtdb().ref(`order_reviews/${orderId}/${productId}`).set(true);
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  try {
    const snap = await adminRtdb().ref(`reviews/${productId}`).get();
    if (!snap.exists()) return [];
    return Object.entries(snap.val() as Record<string, Omit<Review, 'id'>>)
      .map(([id, data]) => ({ id, ...data } as Review))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function hasReviewed(orderId: string, productId: string): Promise<boolean> {
  try {
    const snap = await adminRtdb().ref(`order_reviews/${orderId}/${productId}`).get();
    return snap.exists();
  } catch {
    return false;
  }
}
