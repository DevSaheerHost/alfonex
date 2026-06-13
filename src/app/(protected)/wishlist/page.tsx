'use client';

import { useEffect, useState } from 'react';
import Image  from 'next/image';
import Link   from 'next/link';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { useCart }                  from '@/contexts/CartContext';
import { useWishlist }              from '@/contexts/WishlistContext';
import { clientAuth }               from '@/lib/firebase/client';
import { getDatabase, ref, get }    from 'firebase/database';
import { getApp }                   from 'firebase/app';
import type { Product }             from '@/lib/types';
import { CURRENCY_SYMBOLS }         from '@/lib/types';
import { productHref }              from '@/lib/slug';

export default function WishlistPage() {
  const { ids, toggle }         = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const { currency }            = useApp();
  const getProdPrice            = useProductPrice();
  const { addToCart }           = useCart();
  const symbol                  = CURRENCY_SYMBOLS[currency];

  useEffect(() => {
    if (!ids.length) { setProducts([]); return; }
    clientAuth();
    const db = getDatabase(getApp());
    Promise.all(
      ids.map((id) =>
        get(ref(db, `products/${id}`)).then((snap) =>
          snap.exists() ? ({ id: snap.key, ...snap.val() } as Product) : null,
        ),
      ),
    ).then((ps) => setProducts(ps.filter(Boolean) as Product[]));
  }, [ids]);

  if (!ids.length) {
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
      <h1 className="mb-4 font-heading text-xl font-bold dark:text-gray-100">
        Wishlist ({ids.length})
      </h1>
      <div className="flex flex-col gap-3">
        {products.map((p) => {
          const price = getProdPrice(p);
          const isOOS = p.isOOS || p.stock === 0;
          return (
            <div key={p.id} className="card flex gap-3 p-3">
              <Link href={productHref(p)} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
                <Image src={p.imageUrl} alt={p.title} fill className="object-contain p-1" sizes="80px" />
              </Link>
              <div className="flex flex-1 flex-col justify-between overflow-hidden">
                <div>
                  <Link href={productHref(p)}>
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
                  <button
                    onClick={() => toggle(p.id)}
                    aria-label="Remove from wishlist"
                    className="flex items-center justify-center rounded-xl border border-gray-200 px-3 text-red-400 hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                  >
                    <i className="fa-solid fa-heart text-sm" />
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
