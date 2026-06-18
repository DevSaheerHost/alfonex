export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminRtdb } from '@/lib/firebase/admin';
import { notifyAdmins } from '@/lib/firebase/notify-admins';

const LOW_STOCK_THRESHOLD = 3; // notify when stock <= this value

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db   = adminRtdb();
  const snap = await db.ref('products').get();
  if (!snap.exists()) return NextResponse.json({ ok: true, alerts: 0 });

  const products = snap.val() as Record<string, {
    title?: string; stock?: number; isOOS?: boolean; isHidden?: boolean;
  }>;

  const lowStock: { id: string; title: string; stock: number }[] = [];

  for (const [id, p] of Object.entries(products)) {
    if (p.isHidden || p.isOOS) continue;
    const stock = p.stock ?? 0;
    if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
      lowStock.push({ id, title: p.title ?? id, stock });
    }
  }

  if (lowStock.length === 0) {
    return NextResponse.json({ ok: true, alerts: 0 });
  }

  // Check which ones are newly low (not yet alerted today)
  const today     = new Date().toISOString().slice(0, 10);
  const alertsRef = db.ref('low_stock_alerts');
  const prevSnap  = await alertsRef.get();
  const prev      = prevSnap.val() as Record<string, string> ?? {};

  const toAlert = lowStock.filter((p) => prev[p.id] !== today);

  if (toAlert.length > 0) {
    const lines = toAlert.map((p) => `${p.title}: ${p.stock} left`).join('\n');
    await notifyAdmins(
      `⚠️ Low Stock Alert — ${toAlert.length} product${toAlert.length > 1 ? 's' : ''}`,
      lines,
      { type: 'low_stock' },
    );

    // Mark as alerted today so we don't spam
    const updates: Record<string, string> = {};
    for (const p of toAlert) updates[p.id] = today;
    await alertsRef.update(updates);
  }

  return NextResponse.json({ ok: true, alerts: toAlert.length, products: toAlert });
}
