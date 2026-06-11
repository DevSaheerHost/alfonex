'use client';

import { useState, useMemo } from 'react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/lib/types';

type Filter = 'all' | 'featured' | 'new' | 'sale';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'featured', label: 'Featured' },
  { id: 'new',      label: 'New Arrivals' },
  { id: 'sale',     label: 'On Sale' },
];

interface Props {
  products: Product[];
  featured: Product[];
}

export default function ShopClientShell({ products, featured }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const displayed = useMemo(() => {
    if (filter === 'all')      return products;
    if (filter === 'featured') return products.filter((p) => p.isFeatured);
    if (filter === 'new')      return products.filter((p) => p.isNewArrival);
    if (filter === 'sale')     return products.filter((p) => p.isOnSale);
    return products;
  }, [filter, products]);

  return (
    <div className="page-wrapper">

      {/* Hero strip */}
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-white">
        <p className="font-heading text-xl font-bold">Genuine Apple Devices</p>
        <p className="mt-1 text-sm text-white/80">iPhones · MacBooks · AirPods · Watches</p>
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition
              ${filter === f.id
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-dark-surface dark:text-gray-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <i className="fa fa-box-open text-4xl" />
          <p className="text-sm">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {displayed.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
