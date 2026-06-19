'use client';

import { useState }      from 'react';
import { useCart }       from '@/contexts/CartContext';
import { useRouter }     from 'next/navigation';
import type { OrderItem } from '@/lib/types';

interface Props {
  items: OrderItem[];
}

export default function ReorderButton({ items }: Props) {
  const { addToCart } = useCart();
  const router        = useRouter();
  const [done, setDone] = useState(false);

  function handleReorder() {
    items.forEach((item) => {
      addToCart({
        id:           item.productId + (item.variantLabel ?? ''),
        productId:    item.productId,
        name:         item.title,
        price:        item.unitPrice,
        costPrice:    item.costPrice ?? 0,
        imageUrl:     item.imageUrl  ?? '',
        qty:          item.qty,
        variantLabel: item.variantLabel ?? '',
        grade:        (item.grade as 'a1+' | 'a2+' | 'a3+') ?? undefined,
      });
    });
    setDone(true);
    setTimeout(() => router.push('/cart'), 800);
  }

  return (
    <button
      onClick={handleReorder}
      disabled={done}
      className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-surface dark:text-gray-200 dark:hover:bg-gray-800"
    >
      {done ? (
        <><i className="fa fa-circle-check text-green-500" /> Added to cart</>
      ) : (
        <><i className="fa fa-rotate-right text-primary-500" /> Reorder</>
      )}
    </button>
  );
}
