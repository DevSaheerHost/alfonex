export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb, adminMessaging } from '@/lib/firebase/admin';

const ABANDON_MS  =  2 * 60 * 60 * 1000; // 2 hours idle = abandoned
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // re-notify at most once per 24 h
const LOW_STOCK   = 5;                    // "Only X left" threshold

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db  = adminRtdb();
  const now = Date.now();

  const [cartsSnap, usersSnap, productsSnap] = await Promise.all([
    db.ref('carts').get(),
    db.ref('users').get(),
    db.ref('products').get(),
  ]);

  if (!cartsSnap.exists()) return NextResponse.json({ ok: true, notified: 0 });

  const users: Record<string, {
    fcmToken?: string;
    name?: string;
    displayName?: string;
    abandonedCartNotifiedAt?: number;
  }> = usersSnap.val() ?? {};

  const products: Record<string, { title?: string; stock?: number; isOOS?: boolean }> =
    productsSnap.val() ?? {};

  let notified = 0;
  const sends: Promise<void>[] = [];

  cartsSnap.forEach((cartNode) => {
    const uid   = cartNode.key!;
    const items = cartNode.val() as Record<string, {
      name?: string;
      productId?: string;
      updatedAt?: number;
      qty?: number;
    }> | null;

    if (!items || typeof items !== 'object') return;

    const itemList = Object.values(items);
    if (!itemList.length) return;

    // Only notify carts idle for at least ABANDON_MS
    const lastUpdate = itemList.reduce((max, it) => Math.max(max, it.updatedAt ?? 0), 0);
    if (lastUpdate === 0 || now - lastUpdate < ABANDON_MS) return;

    const user = users[uid];
    if (!user?.fcmToken) return;

    // Cooldown — don't spam the same user
    if (user.abandonedCartNotifiedAt && now - user.abandonedCartNotifiedAt < COOLDOWN_MS) return;

    // Pick the first item to feature in the notification
    const firstItem   = itemList[0];
    const productId   = firstItem.productId;
    const product     = productId ? products[productId] : null;
    const productName = product?.title ?? firstItem.name ?? 'your item';
    const stock       = product?.stock;
    const isOOS       = product?.isOOS;

    // Don't remind about out-of-stock items — pointless
    if (isOOS || stock === 0) return;

    const totalItems = itemList.length;
    const title = totalItems === 1
      ? `Still thinking about ${productName}? 🤔`
      : `You left ${totalItems} items in your cart 🛒`;

    const body = (stock !== undefined && stock > 0 && stock <= LOW_STOCK)
      ? `Only ${stock} left in stock — grab it before it's gone!`
      : totalItems === 1
        ? `Don't let it slip away. Complete your order now.`
        : `Complete your order before items sell out.`;

    sends.push((async () => {
      try {
        await adminMessaging().send({
          token: user.fcmToken!,
          data:  { title, body, url: '/cart' },
          webpush: { headers: { Urgency: 'high' } },
        });
        await db.ref(`users/${uid}/abandonedCartNotifiedAt`).set(now);
        notified++;
      } catch {
        // Stale token — clean up
        await db.ref(`users/${uid}/fcmToken`).remove().catch(() => {});
      }
    })());
  });

  await Promise.allSettled(sends);
  return NextResponse.json({ ok: true, notified });
}
