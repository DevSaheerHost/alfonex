'use server';

import { adminRtdb } from '@/lib/firebase/admin';
import type { Product } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toProducts(snapshot: Record<string, unknown>): Product[] {
  return Object.entries(snapshot)
    .map(([id, data]) => ({ id, ...(data as object) } as Product))
    .filter((p) => !p.isHidden)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const snap = await adminRtdb().ref('products').get();
  if (!snap.exists()) return [];
  return toProducts(snap.val());
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => p.isFeatured).slice(0, 12);
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await adminRtdb().ref(`products/${id}`).get();
  if (!snap.exists()) return null;
  return { id, ...snap.val() } as Product;
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
