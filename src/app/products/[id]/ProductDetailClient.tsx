'use client';

import Image   from 'next/image';
import Link    from 'next/link';
import { useState } from 'react';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { useCart }                  from '@/contexts/CartContext';
import type { Product, VariantGroup } from '@/lib/types';
import { CURRENCY_SYMBOLS }           from '@/lib/types';

const GRADE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  'a1+': { label: 'Excellent',  color: 'text-green-600',  desc: 'Like new · Sealed or minimal use' },
  'a2+': { label: 'Very Good',  color: 'text-blue-600',   desc: 'Light signs of use · Fully functional' },
  'a3+': { label: 'Good',       color: 'text-yellow-600', desc: 'Visible wear · Fully functional' },
};

interface Props { product: Product }

export default function ProductDetailClient({ product }: Props) {
  const { currency }    = useApp();
  const getProdPrice    = useProductPrice();
  const { addToCart }   = useCart();

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
    });
  };

  return (
    <div className="page-wrapper">
      {/* Back */}
      <Link href="/" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" /> Back
      </Link>

      {/* Image */}
      <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          className="object-contain p-4"
          sizes="(max-width: 640px) 100vw, 640px"
          priority
        />
        {product.isOnSale     && <span className="badge badge-red absolute left-3 top-3">On Sale</span>}
        {product.isNewArrival && <span className="badge badge-green absolute left-3 top-3">New Arrival</span>}
      </div>

      {/* Info */}
      <div className="mb-4">
        <h1 className="font-heading text-xl font-bold leading-snug dark:text-gray-100">
          {product.title}
        </h1>

        {grade && (
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-sm font-semibold ${grade.color}`}>{grade.label}</span>
            <span className="text-xs text-gray-400">— {grade.desc}</span>
          </div>
        )}

        <p className="mt-3 text-2xl font-bold text-primary-600 dark:text-primary-400">
          {symbol}{price.toLocaleString()}
        </p>
      </div>

      {/* Variants */}
      {product.variants?.map((group: VariantGroup) => (
        <div key={group.name} className="mb-4">
          <p className="mb-2 text-sm font-semibold dark:text-gray-200">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((v) => {
              const active = selected[group.name] === v.label;
              const oos    = v.stock === 0;
              return (
                <button
                  key={v.label}
                  disabled={oos}
                  onClick={() => setSelected((prev) => ({ ...prev, [group.name]: v.label }))}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition
                    ${oos    ? 'cursor-not-allowed border-gray-100 text-gray-300 line-through dark:border-gray-800 dark:text-gray-700' : ''}
                    ${active ? 'border-primary-500 bg-primary-500 text-white' : ''}
                    ${!oos && !active ? 'border-gray-200 text-gray-700 hover:border-primary-400 dark:border-gray-700 dark:text-gray-200' : ''}`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Description */}
      {product.description && (
        <div className="card mb-4 p-4">
          <p className="mb-1 text-sm font-semibold dark:text-gray-100">About this product</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {product.description}
          </p>
        </div>
      )}

      {/* Add to cart */}
      <div className="sticky bottom-20 bg-gray-100 pb-2 pt-2 dark:bg-[#111]">
        {isOOS ? (
          <div className="rounded-2xl bg-gray-200 py-4 text-center text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            Out of Stock
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="btn-primary w-full"
          >
            <i className="fa fa-shopping-bag" />
            {canAddToCart
              ? 'Add to Cart'
              : product.variants?.length
              ? 'Select options above'
              : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
}
