'use client';

import Image   from 'next/image';
import Link    from 'next/link';
import { useState } from 'react';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { useCart }                  from '@/contexts/CartContext';
import { useWishlist }              from '@/contexts/WishlistContext';
import ReserveModal                 from '@/components/products/ReserveModal';
import ProductScrollRow             from '@/components/products/ProductScrollRow';
import ProductReviews               from '@/components/reviews/ProductReviews';
import type { Product, VariantGroup, Review } from '@/lib/types';
import { CURRENCY_SYMBOLS }                   from '@/lib/types';

const GRADE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  'a1+': { label: 'Excellent',  color: 'text-green-600',  desc: 'Like new · Sealed or minimal use' },
  'a2+': { label: 'Very Good',  color: 'text-blue-600',   desc: 'Light signs of use · Fully functional' },
  'a3+': { label: 'Good',       color: 'text-yellow-600', desc: 'Visible wear · Fully functional' },
};

// Known Apple/device color → CSS background
const COLOR_SWATCHES: Record<string, string> = {
  'black':            '#1c1c1e',
  'space black':      '#2c2c2e',
  'space gray':       '#6e6e73',
  'midnight':         '#1c2433',
  'starlight':        '#f2e8d9',
  'silver':           '#e8e8ed',
  'white':            '#f5f5f7',
  'gold':             '#f5e2b8',
  'rose gold':        '#f0cfc3',
  'pink':             '#fac8d0',
  'red':              '#e0001a',
  'product red':      '#e0001a',
  'blue':             '#3478f6',
  'deep blue':        '#19234d',
  'storm blue':       '#4a6278',
  'alpine green':     '#4e6b5e',
  'green':            '#2d6a3f',
  'purple':           '#7e5bef',
  'yellow':           '#f5e642',
  'orange':           '#f56c1e',
  'cosmic orange':    '#e55b00',
  'coral':            '#ff6b52',
  'natural':          '#d4c5b0',
  'natural titanium': '#baa98c',
  'black titanium':   '#333336',
  'white titanium':   '#f0efed',
  'desert titanium':  '#c5a882',
  'titanium':         '#8e8d92',
};

const isColorGroup = (name: string) => /colo(u?)r/i.test(name);

interface Props { product: Product; similar: Product[]; reviews: Review[] }

export default function ProductDetailClient({ product, similar, reviews }: Props) {
  const { currency }    = useApp();
  const getProdPrice    = useProductPrice();
  const { addToCart }   = useCart();
  const { toggle, has } = useWishlist();
  const wished          = has(product.id);
  const [reserveOpen, setReserveOpen] = useState(false);

  const price  = getProdPrice(product);
  const symbol = CURRENCY_SYMBOLS[currency];
  const grade  = GRADE_INFO[product.grade];
  const isOOS  = product.isOOS || product.stock === 0;

  // Variant selection
  const [selected, setSelected] = useState<Record<string, string>>({});

  const variantLabel = product.variants
    ?.map((g: VariantGroup) => `${g.name}: ${selected[g.name] ?? ''}`)
    .filter((s) => s.endsWith(': ') === false && !s.endsWith(': '))
    .join(' / ') ?? '';

  const allSelected = product.variants?.every((g) => selected[g.name]);
  const canAddToCart = !isOOS && (product.variants?.length === 0 || allSelected);

  const handleAddToCart = () => {
    if (!canAddToCart) return;

    const cartId = product.variants?.length
      ? `${product.id}__${variantLabel}`
      : product.id;

    addToCart({
      id:           cartId,
      productId:    product.id,
      name:         product.title,
      price,
      costPrice:    product.costPrice,
      imageUrl:     product.imageUrl,
      qty:          1,
      variantLabel: variantLabel || '',
      grade:        product.grade,
    });
  };

  return (
    <div className="page-wrapper">
      {/* Back */}
      <Link href="/" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" /> Back
      </Link>

      {/* Desktop: side-by-side | Mobile: stacked */}
      <div className="lg:flex lg:gap-8">

        {/* Image */}
        <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800 lg:mb-0 lg:w-[420px] lg:flex-shrink-0">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-contain p-4"
            sizes="(max-width: 1024px) 100vw, 420px"
            priority
          />
          {product.isOnSale     && <span className="badge badge-red absolute left-3 top-3">On Sale</span>}
          {product.isNewArrival && <span className="badge badge-green absolute left-3 top-3">New Arrival</span>}
        </div>

        {/* Right column */}
        <div className="flex flex-1 flex-col">
          {/* Info */}
          <div className="mb-4">
            <h1 className="font-heading text-xl font-bold leading-snug dark:text-gray-100 lg:text-2xl">
              {product.title}
            </h1>

            {grade && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-sm font-semibold ${grade.color}`}>{grade.label}</span>
                <span className="text-xs text-gray-400">— {grade.desc}</span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 lg:text-3xl">
                {symbol}{price.toLocaleString()}
              </p>
              <button
                onClick={() => toggle(product.id)}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium transition hover:border-red-300 hover:text-red-500 dark:border-gray-700 dark:text-gray-300"
              >
                <i className={`fa-heart text-sm ${wished ? 'fa-solid text-red-500' : 'fa-regular text-gray-400'}`} />
                {wished ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Variants */}
          {product.variants?.map((group: VariantGroup) => {
            const currentVal = selected[group.name];
            const colorGroup = isColorGroup(group.name);
            return (
              <div key={group.name} className="mb-5">
                {/* Label row: "Color: Silver" */}
                <p className="mb-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {group.name}
                  {currentVal && (
                    <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                      : {currentVal}
                    </span>
                  )}
                </p>

                {colorGroup ? (
                  /* ── Color swatches ── */
                  <div className="flex flex-wrap gap-3">
                    {group.values.map((v) => {
                      const active = currentVal === v.label;
                      const oos    = v.stock === 0;
                      const bg     = COLOR_SWATCHES[v.label.toLowerCase()] ?? '#e5e7eb';
                      const isLight = ['starlight', 'silver', 'white', 'white titanium', 'gold', 'starlight'].includes(v.label.toLowerCase());
                      return (
                        <button
                          key={v.label}
                          disabled={oos}
                          onClick={() => setSelected((prev) => ({ ...prev, [group.name]: v.label }))}
                          className={`flex flex-col items-center gap-1 transition ${oos ? 'cursor-not-allowed opacity-40' : 'hover:opacity-90'}`}
                        >
                          <span
                            className={`flex h-11 w-11 rounded-xl border-2 transition ${
                              active
                                ? 'border-primary-500 ring-2 ring-primary-400 ring-offset-1 dark:ring-offset-gray-900'
                                : `border-gray-200 dark:border-gray-700 ${!oos ? 'hover:border-primary-300' : ''}`
                            } ${oos ? 'relative overflow-hidden' : ''}`}
                            style={{ backgroundColor: bg, boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,.08)' : undefined }}
                          >
                            {oos && (
                              /* diagonal strikethrough line for OOS color swatches */
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="h-px w-[130%] rotate-45 bg-gray-400 opacity-70" />
                              </span>
                            )}
                          </span>
                          <span className={`text-[10px] font-medium leading-tight ${
                            active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                          } ${oos ? 'line-through' : ''}`}>
                            {v.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Pill buttons (Storage / RAM / etc.) ── */
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((v) => {
                      const active = currentVal === v.label;
                      const oos    = v.stock === 0;
                      return (
                        <button
                          key={v.label}
                          disabled={oos}
                          onClick={() => setSelected((prev) => ({ ...prev, [group.name]: v.label }))}
                          className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition
                            ${oos
                              ? 'cursor-not-allowed border-gray-100 text-gray-300 line-through dark:border-gray-800 dark:text-gray-600'
                              : active
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-gray-300 text-gray-700 hover:border-primary-400 dark:border-gray-600 dark:text-gray-300'}`}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Description */}
          {product.description && (
            <div className="card mb-4 p-4">
              <p className="mb-1 text-sm font-semibold dark:text-gray-100">About this product</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {product.description}
              </p>
            </div>
          )}

          {/* Add to cart + Reserve — sticky on mobile, static on desktop */}
          <div className="sticky bottom-20 bg-gray-100 pb-2 pt-2 dark:bg-[#111] lg:static lg:bg-transparent lg:pb-0 lg:pt-0 lg:dark:bg-transparent">
            {isOOS ? (
              <div className="rounded-2xl bg-gray-200 py-4 text-center text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Out of Stock
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
                  className="btn-primary flex-1 lg:flex-none lg:px-10"
                >
                  <i className="fa fa-shopping-bag" />
                  {canAddToCart
                    ? 'Add to Cart'
                    : product.variants?.length
                    ? 'Select options'
                    : 'Add to Cart'}
                </button>
                <button
                  onClick={() => setReserveOpen(true)}
                  className="flex items-center gap-2 rounded-xl border-2 border-primary-500 px-4 py-3 text-sm font-semibold text-primary-600 transition hover:bg-primary-50 active:scale-95 dark:hover:bg-primary-900/20"
                >
                  <i className="fa fa-bookmark" />
                  <span className="hidden sm:inline">Reserve</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReserveModal
        product={product}
        price={price}
        variantLabel={variantLabel}
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
      />

      <ProductReviews reviews={reviews} />

      <div className="mt-6">
        <ProductScrollRow title="Similar Products" products={similar} />
      </div>
    </div>
  );
}
