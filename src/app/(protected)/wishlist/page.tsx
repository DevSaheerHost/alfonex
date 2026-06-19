'use client';

import { useEffect, useState } from 'react';
import Image  from 'next/image';
import Link   from 'next/link';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { useCart }                  from '@/contexts/CartContext';
import { useWishlist }              from '@/contexts/WishlistContext';
import { clientAuth, getFirebaseApp } from '@/lib/firebase/client';
import { getDatabase, ref, get }    from 'firebase/database';
import type { Product }             from '@/lib/types';
import { CURRENCY_SYMBOLS }         from '@/lib/types';
import { productHref }              from '@/lib/slug';

interface WishItem {
  wishId:       string;        // the full key stored in wishlist (may be "id::variantLabel")
  product:      Product;
  variantLabel: string | undefined;
  displayImage: string;
}

function parseWishId(wishId: string): { productId: string; variantLabel: string | undefined } {
  const parts = wishId.split('::');
  return { productId: parts[0], variantLabel: parts[1] };
}

export default function WishlistPage() {
  const { ids, toggle }       = useWishlist();
  const [items, setItems]     = useState<WishItem[]>([]);
  const { currency }          = useApp();
  const getProdPrice          = useProductPrice();
  const { addToCart }         = useCart();
  const symbol                = CURRENCY_SYMBOLS[currency];

  useEffect(() => {
    if (!ids.length) { setItems([]); return; }
    clientAuth();
    const db = getDatabase(getFirebaseApp());
    Promise.all(
      ids.map((wishId) => {
        const { productId, variantLabel } = parseWishId(wishId);
        return get(ref(db, `products/${productId}`)).then((snap) => {
          if (!snap.exists()) return null;
          const product = { id: snap.key, ...snap.val() } as Product;
          // Find variant-specific image when wishlisted from an expanded color card
          const variantImage = variantLabel
            ? product.variants
                ?.flatMap((g) => g.values)
                .find((v) => v.label === variantLabel)?.imageUrl
            : undefined;
          return {
            wishId,
            product,
            variantLabel,
            displayImage: variantImage || product.imageUrl,
          } as WishItem;
        });
      }),
    ).then((list) => setItems(list.filter(Boolean) as WishItem[]));
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
        {items.map(({ wishId, product: p, variantLabel, displayImage }) => {
          const price = getProdPrice(p);
          const isOOS = p.isOOS || p.stock === 0;
          return (
            <div key={wishId} className="card flex gap-3 p-3">
              <Link href={productHref(p)} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
                <Image src={displayImage} alt={p.title} fill className="object-contain p-1" sizes="80px" />
              </Link>
              <div className="flex flex-1 flex-col justify-between overflow-hidden">
                <div>
                  <Link href={productHref(p)}>
                    <p className="truncate text-sm font-semibold dark:text-gray-100">{p.title}</p>
                  </Link>
                  {variantLabel && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{variantLabel}</p>
                  )}
                  <p className="mt-0.5 text-sm font-bold text-primary-600">{symbol}{price.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isOOS || !!p.variants?.length}
                    onClick={() => addToCart({ id: p.id, productId: p.id, name: p.title, price, costPrice: p.costPrice, imageUrl: displayImage, qty: 1, variantLabel: variantLabel ?? '' })}
                    className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-40"
                  >
                    {isOOS ? 'Out of Stock' : p.variants?.length ? 'Choose Options' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={() => toggle(wishId)}
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
