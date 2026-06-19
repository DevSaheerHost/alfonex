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
    const [prodSnap, reviewsSnap] = await Promise.all([
      adminRtdb().ref('products').get(),
      adminRtdb().ref('reviews').get(),
    ]);
    if (!prodSnap.exists()) return [];

    const products = toProducts(prodSnap.val());

    // Merge review aggregates (avg rating + count) onto each product
    if (reviewsSnap.exists()) {
      const byProduct = reviewsSnap.val() as Record<string, Record<string, { rating?: number }>>;
      for (const p of products) {
        const node = byProduct[p.id];
        if (!node) continue;
        const ratings = Object.values(node)
          .map((r) => r.rating)
          .filter((n): n is number => typeof n === 'number' && n > 0);
        if (ratings.length) {
          p.ratingCount = ratings.length;
          p.ratingAvg   = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        }
      }
    }

    return products;
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

export async function getRecentlyViewed(userId: string): Promise<Product[]> {
  try {
    const [viewsSnap, all] = await Promise.all([
      adminRtdb().ref(`product_views/${userId}`).get(),
      getProducts(),
    ]);
    if (!viewsSnap.exists()) return [];

    // For each product node, find the most recent visit timestamp
    const recency: { productId: string; lastSeen: number }[] = [];
    viewsSnap.forEach((node) => {
      const visits: number[] = Object.values((node.val()?.visits ?? {}) as Record<string, number>);
      const lastSeen = visits.length ? Math.max(...visits) : 0;
      recency.push({ productId: node.key!, lastSeen });
    });

    recency.sort((a, b) => b.lastSeen - a.lastSeen);

    const byId = new Map(all.map((p) => [p.id, p]));
    return recency
      .slice(0, 8)
      .map((r) => byId.get(r.productId))
      .filter((p): p is Product => !!p && !p.isHidden);
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

const VIEW_THRESHOLD  = 3;
const NOTIFY_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // re-notify at most once per 7 days
const NOTIFY_DELAY_MS = 2 * 60 * 60 * 1000;       // send 2 hours after threshold hit

export async function recordProductView(productId: string): Promise<void> {
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

  // Skip if already notified or already scheduled this week
  const notifiedAt  = data.notified_at  as number | undefined;
  const scheduledAt = data.scheduled_at as number | undefined;
  if (notifiedAt  !== undefined && notifiedAt  > weekAgo) return;
  if (scheduledAt !== undefined && scheduledAt > weekAgo) return;
  if (recentCount < VIEW_THRESHOLD) return;

  // Threshold hit — fetch product + user data and schedule the notification
  const [productSnap, userSnap] = await Promise.all([
    db.ref(`products/${productId}`).get(),
    db.ref(`users/${uid}`).get(),
  ]);
  const product = productSnap.val() as (Product & { title: string; imageUrl?: string }) | null;
  if (!product) return;
  const userData     = (userSnap.val() ?? {}) as Record<string, string>;
  const customerName = userData.name || userData.displayName || 'Customer';

  const siteBase   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alfonex.com';
  const productUrl = `${siteBase}/${slugify(product.title)}/p/${productId}`;
  const sendAt     = Date.now() + NOTIFY_DELAY_MS;

  // Write scheduled_at on the view record (dedup guard)
  await viewRef.child('scheduled_at').set(sendAt);

  // Store pending notification for the cron job to pick up
  await db.ref(`product_interest_pending/${uid}/${productId}`).set({
    send_at:       sendAt,
    product_title: product.title,
    product_image: product.imageUrl ?? null,
    product_url:   productUrl,
    recent_count:  recentCount,
    customer_name: customerName,
    fcm_token:     userData.fcmToken ?? null,
    uid,
    productId,
  });
}
