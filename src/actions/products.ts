'use server';

import { adminDb } from '@/lib/firebase/admin';
import type { Product } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  return { id, ...data } as Product;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const snap = await adminDb()
    .collection('products')
    .where('isHidden', '==', false)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => toProduct(d.id, d.data()));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const snap = await adminDb()
    .collection('products')
    .where('isHidden', '==', false)
    .where('isFeatured', '==', true)
    .limit(12)
    .get();

  return snap.docs.map((d) => toProduct(d.id, d.data()));
}

export async function getProduct(id: string): Promise<Product | null> {
  const doc = await adminDb().collection('products').doc(id).get();
  if (!doc.exists) return null;
  return toProduct(doc.id, doc.data()!);
}

// ─── Writes (admin-gated in production via Firebase Security Rules) ───────────

export async function decrementProductStock(
  productId: string,
  qty: number,
  variantLabel?: string,
): Promise<void> {
  const ref = adminDb().collection('products').doc(productId);

  await adminDb().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error(`Product ${productId} not found`);

    const data = doc.data()!;
    const newStock = (data.stock as number) - qty;
    if (newStock < 0) throw new Error('Insufficient stock');

    const updates: Record<string, unknown> = {
      stock: FieldValue.increment(-qty),
    };

    // Decrement variant-level stock too
    if (variantLabel && Array.isArray(data.variants)) {
      const variants = structuredClone(data.variants) as Product['variants'];
      for (const group of variants) {
        const hit = group.values.find(
          (v) => variantLabel.includes(`${group.name}: ${v.label}`),
        );
        if (hit) hit.stock = Math.max(0, hit.stock - qty);
      }
      updates.variants = variants;
    }

    tx.update(ref, updates);
  });
}
