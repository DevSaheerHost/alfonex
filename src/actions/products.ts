'use server';

import { cache } from 'react';
import { adminRtdb } from '@/lib/firebase/admin';
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
