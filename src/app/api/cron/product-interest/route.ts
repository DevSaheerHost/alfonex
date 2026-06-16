export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb, adminMessaging } from '@/lib/firebase/admin';
import { notifyAdmins }              from '@/lib/firebase/notify-admins';

export async function GET(req: NextRequest) {
  // Vercel signs cron requests — reject anything else
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db  = adminRtdb();
  const now = Date.now();

  const snap = await db.ref('product_interest_pending').get();
  if (!snap.exists()) return NextResponse.json({ ok: true, sent: 0 });

  const sends: Promise<void>[] = [];

  snap.forEach((userSnap) => {
    userSnap.forEach((notifSnap) => {
      const d = notifSnap.val() as {
        send_at: number;
        product_title: string;
        product_image: string | null;
        product_url: string;
        recent_count: number;
        customer_name: string;
        fcm_token: string | null;
        uid: string;
        productId: string;
      };

      if (!d || d.send_at > now) return; // not due yet

      const ref = notifSnap.ref;

      sends.push((async () => {
        // Remove first to prevent duplicate sends on concurrent invocations
        await ref.remove();

        // Mark notified on the view record
        await db.ref(`product_views/${d.uid}/${d.productId}/notified_at`).set(now);

        const title = `Still thinking about it? 👀`;
        const body  = `You've checked "${d.product_title}" ${d.recent_count}× this week — grab it before it's gone!`;

        // Push to customer
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
          } catch { /* stale token */ }
        }

        // Alert admins
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

  await Promise.allSettled(sends);
  return NextResponse.json({ ok: true, sent: sends.length });
}
