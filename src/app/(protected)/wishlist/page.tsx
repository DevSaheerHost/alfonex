'use client';

import { useEffect, useState } from 'react';
import Image  from 'next/image';
import Link   from 'next/link';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { useCart }                  from '@/contexts/CartContext';
import { clientDb }                 from '@/lib/firebase/client';
import { doc, getDoc }              from 'firebase/firestore';
import type { Product }             from '@/lib/types';
import { CURRENCY_SYMBOLS }         from '@/lib/types';

const WL_KEY = 'ia_wishlist';

interface WishlistItem { productId: string; variantLabel?: string }

export default function WishlistPage() {
  const [items, setItems]       = useState<WishlistItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { currency }            = useApp();
  const getProdPrice            = useProductPrice();
  const { addToCart }           = useCart();
  const symbol                  = CURRENCY_SYMBOLS[currency];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WL_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!items.length) return;
    Promise.all(
      items.map((i) =>
        getDoc(doc(clientDb(), 'products', i.productId)).then((d) =>
          d.exists() ? ({ id: d.id, ...d.data() } as Product) : null,
        ),
      ),
    ).then((ps) => setProducts(ps.filter(Boolean) as Product[]));
  }, [items]);

  const remove = (productId: string) => {
    const next = items.filter((i) => i.productId !== productId);
    setItems(next);
    setProducts((ps) => ps.filter((p) => p.id !== productId));
    localStorage.setItem(WL_KEY, JSON.stringify(next));
  };

  if (products.length === 0) {
    return (
      <div className="page-wrapper flex flex-col items-center gap-4 py-20">
        <i className="fa fa-heart text-5xl text-gray-200" />
        <p className="text-sm text-gray-400">No saved items yet</p>
        <Link href="/" className="btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <h1 className="mb-4 font-heading text-xl font-bold dark:text-gray-100">Wishlist</h1>
      <div className="flex flex-col gap-3">
        {products.map((p) => {
          const price = getProdPrice(p);
          const isOOS = p.isOOS || p.stock === 0;
          return (
            <div key={p.id} className="card flex gap-3 p-3">
              <Link href={`/products/${p.id}`} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
                <Image src={p.imageUrl} alt={p.title} fill className="object-contain p-1" sizes="80px" />
              </Link>
              <div className="flex flex-1 flex-col justify-between overflow-hidden">
                <div>
                  <Link href={`/products/${p.id}`}>
                    <p className="truncate text-sm font-semibold dark:text-gray-100">{p.title}</p>
                  </Link>
                  <p className="mt-0.5 text-sm font-bold text-primary-600">{symbol}{price.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isOOS || !!p.variants?.length}
                    onClick={() => addToCart({ id: p.id, productId: p.id, name: p.title, price, costPrice: p.costPrice, imageUrl: p.imageUrl, qty: 1, variantLabel: '' })}
                    className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-40"
                  >
                    {isOOS ? 'Out of Stock' : p.variants?.length ? 'Choose Options' : 'Add to Cart'}
                  </button>
                  <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-500">
                    <i className="fa fa-trash text-sm" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
