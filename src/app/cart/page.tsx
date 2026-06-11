'use client';

import Image from 'next/image';
import Link  from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useApp }  from '@/contexts/AppContext';
import { CURRENCY_SYMBOLS } from '@/lib/types';

const SHIPPING_RATES = { usd: 50, aed: 120, inr: 3000 } as const;

export default function CartPage() {
  const { items, subtotal, totalQty, setQty, removeFromCart } = useCart();
  const { currency } = useApp();

  const symbol   = CURRENCY_SYMBOLS[currency];
  const shipping = SHIPPING_RATES[currency];
  const total    = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="page-wrapper flex flex-col items-center gap-4 py-20">
        <i className="fa fa-shopping-bag text-5xl text-gray-200" />
        <p className="font-semibold text-gray-500">Your cart is empty</p>
        <Link href="/" className="btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <h1 className="mb-4 font-heading text-xl font-bold dark:text-gray-100">
        Cart ({totalQty})
      </h1>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="card flex gap-3 p-3">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
              <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-1" sizes="80px" />
            </div>

            <div className="flex flex-1 flex-col justify-between overflow-hidden">
              <div>
                <p className="truncate text-sm font-semibold dark:text-gray-100">{item.name}</p>
                {item.variantLabel && (
                  <p className="text-xs text-gray-400">{item.variantLabel}</p>
                )}
                <p className="mt-0.5 text-sm font-bold text-primary-600 dark:text-primary-400">
                  {symbol}{(item.price * item.qty).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setQty(item.id, item.qty - 1)}
                    className="px-2 py-1 text-gray-500 hover:text-red-500"
                  >
                    <i className="fa fa-minus text-xs" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold dark:text-gray-100">{item.qty}</span>
                  <button
                    onClick={() => setQty(item.id, item.qty + 1)}
                    className="px-2 py-1 text-gray-500 hover:text-primary-500"
                  >
                    <i className="fa fa-plus text-xs" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="ml-auto text-xs text-gray-400 hover:text-red-500"
                >
                  <i className="fa fa-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card mt-4 p-4">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Subtotal</span>
            <span>{symbol}{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Shipping</span>
            <span>{symbol}{shipping.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold dark:border-gray-700 dark:text-gray-100">
            <span>Total</span>
            <span>{symbol}{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <Link href="/checkout" className="btn-primary mt-4 w-full">
        <i className="fa fa-lock" />
        Proceed to Checkout
      </Link>
    </div>
  );
}
