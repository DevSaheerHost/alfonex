'use server';

import { cache }    from 'react';
import { cookies }  from 'next/headers';
import { adminRtdb, adminAuth, adminMessaging } from '@/lib/firebase/admin';
import { notifyAdmins } from '@/lib/firebase/notify-admins';
import { slugify }  from '@/lib/slug';
import type { Product } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toProducts(snapshot: Record<string, unknown>): Product[] {
  return Object.entries(snapshot)
    .map(([id, data]) => ({ id, ...(data as object) } as Product))
    .filter((p) => !p.isHidden)
    .sort((a, b) => {
      const t = (v: string | number | undefined) =>
        typeof v === 'number' ? v : new Date(v ?? 0).getTime();
      return t(b.createdAt) - t(a.createdAt);
    });
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export const getProducts = cache(async function getProducts(): Promise<Product[]> {
  try {
    const snap = await adminRtdb().ref('products').get();
    if (!snap.exists()) return [];
    return toProducts(snap.val());
  } catch {
    return [];
  }
});

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const all = await getProducts();
    return all.filter((p) => p.isFeatured).slice(0, 12);
  } catch {
    return [];
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await adminRtdb().ref(`products/${id}`).get();
  if (!snap.exists()) return null;
  return { id, ...snap.val() } as Product;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function getRecommendedProducts(userId: string | null): Promise<Product[]> {
  if (!userId) return getFeaturedProducts();
  try {
    const [ordersSnap, allProducts] = await Promise.all([
      adminRtdb().ref('orders').orderByChild('userId').equalTo(userId).get(),
      getProducts(),
    ]);

    if (!ordersSnap.exists()) return getFeaturedProducts();

    const purchasedIds = new Set<string>();
    const categories   = new Set<string>();

    for (const order of Object.values(ordersSnap.val() as Record<string, { items?: { productId: string }[] }>)) {
      for (const item of order.items ?? []) {
        purchasedIds.add(item.productId);
        const prod = allProducts.find((p) => p.id === item.productId);
        if (prod?.category) categories.add(prod.category);
      }
    }

    if (categories.size === 0) return getFeaturedProducts();

    const recs = allProducts
      .filter((p) => !p.isOOS && !p.isHidden && categories.has(p.category) && !purchasedIds.has(p.id))
      .slice(0, 8);

    return recs.length > 0 ? recs : getFeaturedProducts();
  } catch {
    return getFeaturedProducts();
  }
}

export async function getSimilarProducts(productId: string, category: string): Promise<Product[]> {
  try {
    const all = await getProducts();
    return all
      .filter((p) => p.category === category && p.id !== productId && !p.isOOS && !p.isHidden)
      .slice(0, 6);
  } catch {
    return [];
  }
}

// ─── Stock decrement (inside a transaction) ───────────────────────────────────

export async function decrementProductStock(
  productId: string,
  qty: number,
  variantLabel?: string,
): Promise<void> {
  const ref = adminRtdb().ref(`products/${productId}`);

  await ref.transaction((product: Product | null) => {
    if (!product) return; // abort
    const newStock = (product.stock ?? 0) - qty;
    if (newStock < 0) throw new Error('Insufficient stock');
    product.stock = newStock;

    if (variantLabel && Array.isArray(product.variants)) {
      for (const group of product.variants) {
        const hit = group.values.find((v) =>
          variantLabel.includes(`${group.name}: ${v.label}`),
        );
        if (hit) hit.stock = Math.max(0, hit.stock - qty);
      }
    }
    return product;
  });
}

// ─── Product view tracking ────────────────────────────────────────────────────

const VIEW_THRESHOLD  = 3;         // visits within a week triggers notification
const NOTIFY_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // re-notify at most once per 7 days

export async function recordProductView(productId: string): Promise<void> {
  // Skip silently for unauthenticated users
  let uid: string;
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) return;
    const decoded = await adminAuth().verifySessionCookie(session, true);
    uid = decoded.uid;
  } catch {
    return;
  }

  const db      = adminRtdb();
  const viewRef = db.ref(`product_views/${uid}/${productId}`);

  // Record this visit
  await viewRef.child('visits').push(Date.now());

  // Read back the full record
  const snap    = await viewRef.get();
  const data    = snap.val() ?? {};
  const weekAgo = Date.now() - NOTIFY_COOLDOWN;

  // Count visits in the last 7 days
  const visits: number[] = Object.values(data.visits ?? {}) as number[];
  const recentCount = visits.filter((ts) => ts > weekAgo).length;

  // Skip if already notified this week or threshold not met
  if ((data.notified_at as number | undefined) > weekAgo) return;
  if (recentCount < VIEW_THRESHOLD) return;

  // Fetch product + user data together
  const [productSnap, userSnap] = await Promise.all([
    db.ref(`products/${productId}`).get(),
    db.ref(`users/${uid}`).get(),
  ]);
  const product  = productSnap.val() as (Product & { title: string; imageUrl?: string }) | null;
  if (!product) return;
  const userData     = (userSnap.val() ?? {}) as Record<string, string>;
  const fcmToken     = userData.fcmToken;
  const customerName = userData.name || userData.displayName || 'Customer';

  // Mark notified before sending so concurrent triggers don't double-fire
  await viewRef.child('notified_at').set(Date.now());

  const siteBase   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alfonex.com';
  const productUrl = `${siteBase}/products/${slugify(product.title)}/p/${productId}`;

  // Push to customer
  if (fcmToken) {
    try {
      await adminMessaging().send({
        token: fcmToken,
        notification: {
          title: `Still thinking about it? 👀`,
          body:  `You've looked at "${product.title}" ${recentCount} times this week — grab it before it's gone!`,
        },
        data: { productId, type: 'product_interest', url: productUrl },
        webpush: {
          notification: {
            icon:  product.imageUrl ?? `${siteBase}/assets/meta/icon/logo.png`,
            badge: `${siteBase}/assets/meta/icon/logo.png`,
          },
          fcmOptions: { link: productUrl },
        },
      });
    } catch { /* stale token — ignore */ }
  }

  // Alert admins
  try {
    await notifyAdmins(
      `🔥 Hot Lead — ${customerName}`,
      `Viewed "${product.title}" ${recentCount}× this week. Good time to reach out!`,
      { productId, uid, type: 'product_interest' },
    );
  } catch { /* never block tracking */ }
}
