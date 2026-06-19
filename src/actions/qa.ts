'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import { notifyAdmins } from '@/lib/firebase/notify-admins';

export interface QAItem {
  id:            string;
  productId:     string;
  question:      string;
  askedBy:       string;   // uid
  askedByName:   string;
  askedAt:       number;
  answer?:       string;
  answeredAt?:   number;
}

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');
  return adminAuth().verifySessionCookie(session, true);
}

export async function getProductQA(productId: string): Promise<QAItem[]> {
  const snap = await adminRtdb().ref(`product_qa/${productId}`).orderByChild('askedAt').get();
  if (!snap.exists()) return [];
  const items: QAItem[] = [];
  snap.forEach((child) => {
    items.push({ id: child.key!, productId, ...child.val() });
  });
  return items.reverse(); // newest first
}

export async function askQuestion(
  productId: string,
  question: string,
): Promise<{ id: string; askedByName: string; askedAt: number }> {
  const user = await verifySession();
  const q = question.trim();
  if (!q || q.length < 5) throw new Error('Question too short');
  if (q.length > 400) throw new Error('Question too long');

  const [userSnap, productSnap] = await Promise.all([
    adminRtdb().ref(`users/${user.uid}`).get(),
    adminRtdb().ref(`products/${productId}/title`).get(),
  ]);
  const name: string = userSnap.val()?.name || 'Customer';
  const productTitle: string = productSnap.val() || 'a product';
  const askedAt = Date.now();

  const ref = await adminRtdb().ref(`product_qa/${productId}`).push({
    question:    q,
    askedBy:     user.uid,
    askedByName: name,
    askedAt,
    answer:      null,
    answeredAt:  null,
  });

  // Notify admins — never block the question save
  notifyAdmins(
    `❓ New Question — ${productTitle}`,
    `${name}: ${q.length > 80 ? q.slice(0, 80) + '…' : q}`,
    { type: 'qa', productId },
  ).catch(() => {});

  return { id: ref.key!, askedByName: name, askedAt };
}
