export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb, adminMessaging } from '@/lib/firebase/admin';
import { slugify } from '@/lib/slug';

const ABANDON_MS  = 24 * 60 * 60 * 1000; // 24 hours idle = abandoned
const COOLDOWN_MS =  7 * 24 * 60 * 60 * 1000; // re-notify at most once per 7 days

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db  = adminRtdb();
  const now = Date.now();

  const [cartsSnap, usersSnap] = await Promise.all([
    db.ref('carts').get(),
    db.ref('users').get(),
  ]);

  if (!cartsSnap.exists()) return NextResponse.json({ ok: true, notified: 0 });

  const users: Record<string, { fcmToken?: string; name?: string; displayName?: string; abandonedCartNotifiedAt?: number }> =
    usersSnap.val() ?? {};

  let notified = 0;
  const sends: Promise<void>[] = [];

  cartsSnap.forEach((cartNode) => {
    const uid   = cartNode.key!;
    const items = cartNode.val() as Record<string, { name?: string; updatedAt?: number; qty?: number }> | null;
    if (!items || typeof items !== 'object') return;

    const itemList = Object.values(items);
    if (itemList.length === 0) return;

    // Use the most recent updatedAt across all items
    const lastUpdate = itemList.reduce((max, it) => Math.max(max, it.updatedAt ?? 0), 0);
    if (lastUpdate === 0 || now - lastUpdate < ABANDON_MS) return;

    const user = users[uid];
    if (!user?.fcmToken) return;

    // Cooldown — don't spam
    if (user.abandonedCartNotifiedAt && now - user.abandonedCartNotifiedAt < COOLDOWN_MS) return;

    const firstName = (user.name || user.displayName || '').split(' ')[0] || 'Hey';
    const firstItem = itemList[0];
    const itemCount = itemList.length;

    sends.push((async () => {
      try {
        await adminMessaging().send({
          token: user.fcmToken!,
          data: {
            title: `${firstName}, you left something behind! 🛒`,
            body:  itemCount === 1
              ? `${firstItem.name ?? 'An item'} is still in your cart.`
              : `${itemCount} items are waiting in your cart.`,
            url:   '/cart',
          },
          webpush: { headers: { Urgency: 'high' } },
        });
        await db.ref(`users/${uid}/abandonedCartNotifiedAt`).set(now);
        notified++;
      } catch {
        await db.ref(`users/${uid}/fcmToken`).remove().catch(() => {});
      }
    })());
  });

  await Promise.allSettled(sends);
  return NextResponse.json({ ok: true, notified });
}
