'use client';

import Link  from 'next/link';
import Image from 'next/image';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { useCart }                  from '@/contexts/CartContext';
import { useWishlist }              from '@/contexts/WishlistContext';
import type { Product }             from '@/lib/types';
import { CURRENCY_SYMBOLS }         from '@/lib/types';
import { productHref }              from '@/lib/slug';
import { cldUrl }                   from '@/lib/cldUrl';

const GRADE_LABELS: Record<string, { label: string; color: string }> = {
  'a1+': { label: 'Excellent',  color: 'bg-green-100 text-green-700' },
  'a2+': { label: 'Very Good',  color: 'bg-blue-100 text-blue-700' },
  'a3+': { label: 'Good',       color: 'bg-yellow-100 text-yellow-700' },
};

interface Props {
  product: Product;
  searchQuery?: string; // when set, appended as ?q= for analytics tracking
}

export default function ProductCard({ product, searchQuery }: Props) {
  const { currency } = useApp();
  const getProdPrice = useProductPrice();
  const { addToCart } = useCart();
  const { toggle, has } = useWishlist();
  const wished = has(product.id);

  const price     = getProdPrice(product);
  const symbol    = CURRENCY_SYMBOLS[currency];
  const grade     = GRADE_LABELS[product.grade];
  const isOOS     = product.isOOS || product.stock === 0;
  const hasVariants = product.variants?.length > 0;

  // Build the destination URL — append ?q= only when coming from a search
  const href = searchQuery
    ? `${productHref(product)}?q=${encodeURIComponent(searchQuery.trim())}`
    : productHref(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOOS || hasVariants) return;

    addToCart({
      id:           product.id,
      productId:    product.id,
      name:         product.title,
      price,
      costPrice:    product.costPrice,
      imageUrl:     product.imageUrl,
      qty:          1,
      variantLabel: '',
    });
  };

  return (
    <Link href={href} className="group flex h-full flex-col">
      <div className="card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">

        {/* Image — fixed square, never shrinks */}
        <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden bg-gray-50 dark:bg-gray-800">
          <Image
            src={cldUrl(product.imageUrl, 'f_auto,q_auto,w_400')}
            alt={product.title}
            fill
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
          />

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.isOnSale     && <span className="badge badge-red">Sale</span>}
            {product.isNewArrival && <span className="badge badge-green">New</span>}
            {product.isFeatured   && <span className="badge badge-yellow">Featured</span>}
            {isOOS                && <span className="badge badge-gray">Out of Stock</span>}
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); toggle(product.id); }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition hover:scale-110 active:scale-95 dark:bg-gray-900/80"
          >
            <i className={`fa-heart text-sm ${wished ? 'fa-solid text-red-500' : 'fa-regular text-gray-400'}`} />
          </button>
        </div>

        {/* Info — flex-col so price row always sits at bottom */}
        <div className="flex flex-1 flex-col p-3">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-800 dark:text-gray-100">
            {product.title}
          </p>

          {/* Grade badge — fixed min-height so cards without a grade still align */}
          <div className="mt-1 min-h-[20px]">
            {grade && (
              <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${grade.color}`}>
                {grade.label}
              </span>
            )}
          </div>

          {/* Push price row to bottom */}
          <div className="mt-auto pt-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-bold text-primary-600 dark:text-primary-400">
                {symbol}{price.toLocaleString()}
              </p>

              {!isOOS && !hasVariants && (
                <button
                  onClick={handleAddToCart}
                  aria-label="Add to cart"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition hover:bg-primary-600 active:scale-95"
                >
                  <i className="fa fa-plus text-[11px]" />
                </button>
              )}

              {hasVariants && !isOOS && (
                <span className="text-[10px] text-gray-400">Choose options</span>
              )}
            </div>

            {!!product.purchaseCount && product.purchaseCount > 0 && (
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                <i className="fa fa-fire text-orange-400 mr-0.5" />
                {product.purchaseCount >= 1000
                  ? `${Math.floor(product.purchaseCount / 1000)}k+ sold`
                  : product.purchaseCount >= 100
                    ? `${Math.floor(product.purchaseCount / 100) * 100}+ sold`
                    : `${product.purchaseCount} sold`}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
