export const runtime = 'nodejs';

/**
 * Consolidated daily cron — runs all customer & admin alert jobs in one pass.
 * Vercel Hobby allows only 2 cron jobs total; this file merges:
 *   - price-alerts   (notify customers when a product hits their target price)
 *   - stock-alerts   (notify customers when an OOS product is back)
 *   - low-stock      (notify admins when stock ≤ 3)
 *   - product-interest (send scheduled "you viewed this" nudges)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb, adminMessaging } from '@/lib/firebase/admin';
import { notifyAdmins }              from '@/lib/firebase/notify-admins';
import { slugify }                   from '@/lib/slug';

const LOW_STOCK_THRESHOLD = 3;

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db  = adminRtdb();
  const now = Date.now();

  // Load shared data once
  const [productsSnap, priceAlertsSnap, stockAlertsSnap, interestSnap] = await Promise.all([
    db.ref('products').get(),
    db.ref('price_alerts').get(),
    db.ref('stock_notifications').get(),
    db.ref('product_interest_pending').get(),
  ]);

  const products: Record<string, {
    title?: string; priceAED?: number; price?: number;
    isOOS?: boolean; stock?: number; isHidden?: boolean;
  }> = productsSnap.val() ?? {};

  const sends: Promise<void>[] = [];
  const results = { priceAlerts: 0, stockAlerts: 0, lowStockAlerts: 0, interestSent: 0 };

  // ── 1. Price-drop alerts ──────────────────────────────────────────────────
  if (priceAlertsSnap.exists()) {
    priceAlertsSnap.forEach((productNode) => {
      const productId    = productNode.key!;
      const product      = products[productId];
      if (!product || product.isHidden) return;
      const currentPrice = product.priceAED ?? product.price ?? 0;

      productNode.forEach((userNode) => {
        const uid = userNode.key!;
        const sub = userNode.val() as {
          fcmToken: string; targetPrice: number; productTitle: string; productImage: string;
        };
        if (currentPrice >= sub.targetPrice) return;

        sends.push((async () => {
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
            results.priceAlerts++;
          } catch {
            await db.ref(`users/${uid}/fcmToken`).remove().catch(() => {});
          }
          await db.ref(`price_alerts/${productId}/${uid}`).remove();
        })());
      });
    });
  }

  // ── 2. Back-in-stock alerts ───────────────────────────────────────────────
  if (stockAlertsSnap.exists()) {
    stockAlertsSnap.forEach((productNode) => {
      const productId = productNode.key!;
      const product   = products[productId];
      if (!product || product.isOOS || (product.stock ?? 0) <= 0) return;

      productNode.forEach((userNode) => {
        const uid = userNode.key!;
        const sub = userNode.val() as {
          fcmToken: string; productTitle: string; productImage: string;
        };

        sends.push((async () => {
          const freshSnap = await db.ref(`users/${uid}/fcmToken`).get();
          const token     = freshSnap.exists() ? (freshSnap.val() as string) : sub.fcmToken;
          if (!token) return;
          try {
            await adminMessaging().send({
              token,
              data: {
                title:    `✅ Back in Stock — ${sub.productTitle || product.title || 'Product'}`,
                body:     "It's available again. Grab it before it sells out!",
                imageUrl: sub.productImage || '',
              },
              webpush: { headers: { Urgency: 'high' } },
            });
            results.stockAlerts++;
          } catch {
            await db.ref(`users/${uid}/fcmToken`).remove().catch(() => {});
          }
          await db.ref(`stock_notifications/${productId}/${uid}`).remove();
        })());
      });
    });
  }

  // ── 3. Low-stock admin alerts ─────────────────────────────────────────────
  const lowStock: { id: string; title: string; stock: number }[] = [];
  for (const [id, p] of Object.entries(products)) {
    if (p.isHidden || p.isOOS) continue;
    const stock = p.stock ?? 0;
    if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
      lowStock.push({ id, title: p.title ?? id, stock });
    }
  }
  if (lowStock.length > 0) {
    const today    = new Date().toISOString().slice(0, 10);
    const prevSnap = await db.ref('low_stock_alerts').get();
    const prev     = (prevSnap.val() as Record<string, string>) ?? {};
    const toAlert  = lowStock.filter((p) => prev[p.id] !== today);
    if (toAlert.length > 0) {
      sends.push((async () => {
        try {
          await notifyAdmins(
            `⚠️ Low Stock — ${toAlert.length} product${toAlert.length > 1 ? 's' : ''}`,
            toAlert.map((p) => `${p.title}: ${p.stock} left`).join('\n'),
            { type: 'low_stock' },
          );
          results.lowStockAlerts = toAlert.length;
        } catch { /* never block */ }
        const updates: Record<string, string> = {};
        for (const p of toAlert) updates[p.id] = today;
        await db.ref('low_stock_alerts').update(updates);
      })());
    }
  }

  // ── 4. Product-interest nudges ────────────────────────────────────────────
  if (interestSnap.exists()) {
    interestSnap.forEach((userSnap) => {
      userSnap.forEach((notifSnap) => {
        const d = notifSnap.val() as {
          send_at: number; product_title: string; product_image: string | null;
          product_url: string; recent_count: number; customer_name: string;
          fcm_token: string | null; uid: string; productId: string;
        };
        if (!d || d.send_at > now) return;

        sends.push((async () => {
          await notifSnap.ref.remove();
          await db.ref(`product_views/${d.uid}/${d.productId}/notified_at`).set(now);

          const title = `Still thinking about it? 👀`;
          const body  = `You've checked "${d.product_title}" ${d.recent_count}× this week — grab it before it's gone!`;

          if (d.fcm_token) {
            try {
              await adminMessaging().send({
                token: d.fcm_token,
                notification: { title, body },
                data: { productId: d.productId, type: 'product_interest', url: d.product_url },
                webpush: {
                  notification: {
                    icon:  d.product_image ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alfonex.com'}/assets/meta/icon/logo.png`,
                    badge: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alfonex.com'}/assets/meta/icon/logo.png`,
                  },
                  fcmOptions: { link: d.product_url },
                },
              });
              results.interestSent++;
            } catch { /* stale token */ }
          }

          try {
            await notifyAdmins(
              `🔥 Hot Lead — ${d.customer_name}`,
              `Viewed "${d.product_title}" ${d.recent_count}× this week. Good time to reach out!`,
              { productId: d.productId, uid: d.uid, type: 'product_interest' },
            );
          } catch { /* never block */ }
        })());
      });
    });
  }

  await Promise.allSettled(sends);
  return NextResponse.json({ ok: true, ...results });
}
