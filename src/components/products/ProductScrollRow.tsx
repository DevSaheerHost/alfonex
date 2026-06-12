'use client';

import ProductCard from './ProductCard';
import type { Product } from '@/lib/types';

interface Props {
  products: Product[];
  title:    string;
}

export default function ProductScrollRow({ products, title }: Props) {
  if (products.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="mb-3 font-heading text-base font-bold dark:text-gray-100">{title}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {products.map((p) => (
          <div key={p.id} className="w-44 flex-shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
