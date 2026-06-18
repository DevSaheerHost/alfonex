export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb, adminMessaging } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db   = adminRtdb();
  const snap = await db.ref('stock_notifications').get();
  if (!snap.exists()) return NextResponse.json({ ok: true, notified: 0 });

  // Load all products once
  const productsSnap = await db.ref('products').get();
  const products: Record<string, { isOOS?: boolean; stock?: number; title?: string }> =
    productsSnap.val() ?? {};

  let notified = 0;
  const sends: Promise<void>[] = [];

  snap.forEach((productNode) => {
    const productId = productNode.key!;
    const product   = products[productId];

    // Only notify if product is back in stock
    if (!product || product.isOOS || (product.stock ?? 0) <= 0) return;

    productNode.forEach((userNode) => {
      const uid  = userNode.key!;
      const sub  = userNode.val() as {
        fcmToken: string; productTitle: string; productImage: string;
      };

      const send = async () => {
        // Prefer fresh token from users/{uid}/fcmToken
        const freshSnap = await db.ref(`users/${uid}/fcmToken`).get();
        const token     = freshSnap.exists() ? (freshSnap.val() as string) : sub.fcmToken;
        if (!token) return;

        try {
          await adminMessaging().send({
            token,
            data: {
              title:    `✅ Back in Stock — ${sub.productTitle || product.title || 'Product'}`,
              body:     'It\'s available again. Grab it before it sells out!',
              imageUrl: sub.productImage || '',
            },
            webpush: { headers: { Urgency: 'high' } },
          });
          notified++;
        } catch {
          // Stale token — remove it
          await db.ref(`users/${uid}/fcmToken`).remove().catch(() => {});
        }

        // Remove subscription after notifying
        await db.ref(`stock_notifications/${productId}/${uid}`).remove();
      };

      sends.push(send());
    });
  });

  await Promise.allSettled(sends);
  return NextResponse.json({ ok: true, notified });
}
