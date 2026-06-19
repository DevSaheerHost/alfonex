export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb, adminMessaging } from '@/lib/firebase/admin';
import { slugify } from '@/lib/slug';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db   = adminRtdb();
  const snap = await db.ref('price_alerts').get();
  if (!snap.exists()) return NextResponse.json({ ok: true, notified: 0 });

  // Load all products once
  const productsSnap = await db.ref('products').get();
  const products: Record<string, { priceAED?: number; price?: number; title?: string; isHidden?: boolean }> =
    productsSnap.val() ?? {};

  let notified = 0;
  const sends: Promise<void>[] = [];

  snap.forEach((productNode) => {
    const productId = productNode.key!;
    const product   = products[productId];
    if (!product || product.isHidden) return;

    const currentPrice = product.priceAED ?? product.price ?? 0;

    productNode.forEach((userNode) => {
      const uid = userNode.key!;
      const sub = userNode.val() as {
        fcmToken: string; targetPrice: number; productTitle: string; productImage: string;
      };

      // Only notify if price has actually dropped below what they subscribed at
      if (currentPrice >= sub.targetPrice) return;

      const send = async () => {
        const freshSnap = await db.ref(`users/${uid}/fcmToken`).get();
        const token     = freshSnap.exists() ? (freshSnap.val() as string) : sub.fcmToken;
        if (!token) return;

        try {
          await adminMessaging().send({
            token,
            data: {
              title:    `💰 Price Drop — ${sub.productTitle || product.title || 'Product'}`,
              body:     `Now AED ${currentPrice} (was AED ${sub.targetPrice})`,
              imageUrl: sub.productImage || '',
              url:      `/${slugify(product.title || sub.productTitle || productId)}/p/${productId}`,
            },
            webpush: { headers: { Urgency: 'high' } },
          });
          notified++;
        } catch {
          // Stale token — remove it
          await db.ref(`users/${uid}/fcmToken`).remove().catch(() => {});
        }

        // Remove subscription after notifying (price already dropped)
        await db.ref(`price_alerts/${productId}/${uid}`).remove();
      };

      sends.push(send());
    });
  });

  await Promise.allSettled(sends);
  return NextResponse.json({ ok: true, notified });
}
