'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCompare } from '@/contexts/CompareContext';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { CURRENCY_SYMBOLS } from '@/lib/types';
import type { Product } from '@/lib/types';
import { productHref } from '@/lib/slug';
import { cldUrl } from '@/lib/cldUrl';

const GRADE_LABELS: Record<string, string> = {
  'a1+': 'Excellent',
  'a2+': 'Very Good',
  'a3+': 'Good',
};

const ROWS: { label: string; key: keyof Product | 'price' | 'grade_label' | 'status' }[] = [
  { label: 'Price',    key: 'price' },
  { label: 'Category', key: 'category' },
  { label: 'Grade',    key: 'grade_label' },
  { label: 'Stock',    key: 'stock' },
  { label: 'Status',   key: 'status' },
];

export default function ComparePage() {
  const { ids, remove, clear } = useCompare();
  const { currency }           = useApp();
  const getProdPrice           = useProductPrice();
  const symbol                 = CURRENCY_SYMBOLS[currency];

  const [products, setProducts] = useState<(Product | null)[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`)
          .then((r) => r.ok ? r.json() : null)
          .catch(() => null),
      ),
    ).then((ps) => { setProducts(ps); setLoading(false); });
  }, [ids]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <i className="fa fa-spinner fa-spin text-2xl text-primary-500" />
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <i className="fa fa-scale-balanced mb-4 text-4xl text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-semibold dark:text-white">Nothing to compare</p>
        <p className="mt-1 text-sm text-gray-500">Add products using the compare icon on product cards.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">Browse Products</Link>
      </div>
    );
  }

  const validProducts = products.filter(Boolean) as Product[];

  function getCellValue(product: Product, key: string): string {
    if (key === 'price') {
      const p = getProdPrice(product);
      return `${symbol}${p.toLocaleString()}`;
    }
    if (key === 'grade_label') return GRADE_LABELS[product.grade] ?? product.grade ?? '—';
    if (key === 'status') {
      const oos = product.isOOS || product.stock === 0;
      return oos ? 'Out of Stock' : 'In Stock';
    }
    const val = (product as unknown as Record<string, unknown>)[key];
    if (val === undefined || val === null || val === '') return '—';
    return String(val);
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold dark:text-white">Compare Products</h1>
        <button onClick={clear} className="text-sm text-gray-400 hover:text-red-500">
          Clear all
        </button>
      </div>

      {/* Horizontal scroll table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] table-fixed border-collapse">
          {/* Product images + titles header */}
          <thead>
            <tr>
              <th className="w-28 pb-3 pr-3 text-left text-xs font-medium text-gray-400" />
              {validProducts.map((p) => (
                <th key={p.id} className="pb-3 pr-3 text-left align-top">
                  <div className="relative">
                    <button
                      onClick={() => remove(p.id)}
                      className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 dark:bg-gray-700 dark:text-gray-300"
                    >
                      <i className="fa fa-xmark text-[9px]" />
                    </button>
                    <Link href={productHref(p)}>
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
                        <Image
                          src={cldUrl(p.imageUrl, 'f_auto,q_auto,w_200')}
                          alt={p.title}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-snug dark:text-white">
                        {p.title}
                      </p>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Spec rows */}
          <tbody>
            {ROWS.map(({ label, key }) => (
              <tr key={key} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {label}
                </td>
                {validProducts.map((p) => {
                  const val = getCellValue(p, key as string);
                  const isOOS = key === 'status' && val === 'Out of Stock';
                  const isInStock = key === 'status' && val === 'In Stock';
                  return (
                    <td key={p.id} className="py-3 pr-3 text-sm dark:text-gray-200">
                      {isOOS && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">{val}</span>}
                      {isInStock && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{val}</span>}
                      {!isOOS && !isInStock && val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ids.length < 3 && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center dark:border-gray-700">
          <i className="fa fa-plus mb-1 text-gray-300 dark:text-gray-600" />
          <p className="text-xs text-gray-400">Add up to {3 - ids.length} more product{3 - ids.length > 1 ? 's' : ''} to compare</p>
          <Link href="/" className="mt-2 inline-block text-xs font-medium text-primary-500">Browse Products</Link>
        </div>
      )}
    </div>
  );
}
