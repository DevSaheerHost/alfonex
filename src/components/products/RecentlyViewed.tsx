'use client';

import { useEffect, useState } from 'react';
import { getProducts }         from '@/actions/products';
import ProductCard             from '@/components/products/ProductCard';
import type { Product }        from '@/lib/types';

const KEY   = 'alfonex_recently_viewed';
const MAX   = 10;

export function saveRecentlyViewed(productId: string) {
  try {
    const raw  = localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [productId, ...list.filter((id) => id !== productId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

interface Props {
  excludeId?: string;
}

export default function RecentlyViewed({ excludeId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const raw  = localStorage.getItem(KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const ids  = list.filter((id) => id !== excludeId).slice(0, 6);
      if (!ids.length) return;
      getProducts().then((all) => {
        const map = new Map(all.map((p) => [p.id, p]));
        const found = ids.map((id) => map.get(id)).filter(Boolean) as Product[];
        setProducts(found);
      }).catch(() => {});
    } catch {}
  }, [excludeId]);

  if (!products.length) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-white">Recently Viewed</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <div key={p.id} className="w-40 flex-shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
