'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCart }   from '@/contexts/CartContext';
import { useAuth }   from '@/contexts/AuthContext';
import { useApp }    from '@/contexts/AppContext';
import { placeOrder } from '@/actions/orders';
import { getAddresses } from '@/actions/users';
import { CURRENCY_SYMBOLS } from '@/lib/types';
import type { CheckoutFormData, PayMethod, Address } from '@/lib/types';
import Link from 'next/link';

const PAYMENT_METHODS: { id: PayMethod; label: string; icon: string; available: boolean }[] = [
  { id: 'cod',       label: 'Pay on Delivery', icon: 'fa-money-bill-wave', available: true },
  { id: 'card',      label: 'Card',            icon: 'fa-credit-card',    available: false },
  { id: 'apple_pay', label: 'Apple Pay',       icon: 'fa-apple',         available: false },
];

const SHIPPING_RATES = { usd: 50, aed: 120, inr: 3000 } as const;

export default function CheckoutPage() {
  const { items, subtotal, clearCart, totalQty } = useCart();
  const { user }     = useAuth();
  const { currency } = useApp();
  const router       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]            = useState('');

  const symbol   = CURRENCY_SYMBOLS[currency];
  const shipping = SHIPPING_RATES[currency];
  const total    = subtotal + shipping;

  const [form, setForm] = useState<CheckoutFormData>({
    name:      user?.displayName ?? '',
    phone:     '',
    country:   '',
    state:     '',
    district:  '',
    place:     '',
    notes:     '',
    payMethod: 'cod',
  });

  // Saved addresses
  const [addresses, setAddresses]       = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string>('');

  // Load saved addresses and pre-fill with primary
  useEffect(() => {
    if (!user) return;
    getAddresses().then((list) => {
      setAddresses(list);
      const primary = list.find((a) => a.primary) ?? list[0];
      if (primary) {
        setSelectedAddr(primary.id);
        setForm((prev) => ({
          ...prev,
          name:     primary.name     || prev.name,
          phone:    primary.phone    || prev.phone,
          country:  primary.country,
          state:    primary.state,
          district: primary.district,
          place:    primary.place,
        }));
      }
    }).catch(() => {});
  }, [user]);

  const applyAddress = (addr: Address) => {
    setSelectedAddr(addr.id);
    setForm((prev) => ({
      ...prev,
      name:     addr.name     || prev.name,
      phone:    addr.phone    || prev.phone,
      country:  addr.country,
      state:    addr.state,
      district: addr.district,
      place:    addr.place,
    }));
  };

  const set = (field: keyof CheckoutFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = () => {
    if (!user) { router.push('/login?redirect=/checkout'); return; }
    const required: (keyof CheckoutFormData)[] = ['name', 'phone', 'country', 'state', 'district', 'place'];
    for (const f of required) {
      if (!form[f]) { setError(`Please fill in: ${f}`); return; }
    }
    setError('');

    startTransition(async () => {
      try {
        const { orderId } = await placeOrder(form, items, currency);
        clearCart();
        router.push(`/orders/${orderId}?placed=1`);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

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
      <h1 className="mb-4 font-heading text-xl font-bold dark:text-gray-100">Checkout</h1>

      {!user && (
        <div className="card mb-4 p-4 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            <Link href="/login?redirect=/checkout" className="font-semibold text-primary-600">Sign in</Link>{' '}
            to track your orders or{' '}
            <span className="font-semibold">continue as guest</span>.
          </p>
        </div>
      )}

      {/* Saved address picker */}
      {addresses.length > 0 && (
        <div className="card mb-4 p-4">
          <p className="mb-2.5 text-sm font-semibold dark:text-gray-100">
            <i className="fa fa-location-dot mr-1.5 text-primary-500" /> Saved Addresses
          </p>
          <div className="flex flex-col gap-2">
            {addresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => applyAddress(addr)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition
                  ${selectedAddr === addr.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}`}
              >
                <i className={`fa fa-circle mt-0.5 text-xs ${selectedAddr === addr.id ? 'text-primary-500' : 'text-gray-300 dark:text-gray-600'}`} />
                <div className="min-w-0">
                  <p className="font-semibold dark:text-gray-100">{addr.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {[addr.place, addr.district, addr.state, addr.country].filter(Boolean).join(', ')}
                  </p>
                  {addr.primary && (
                    <span className="mt-0.5 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-400">
                      Primary
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Shipping form */}
      <div className="card mb-4 p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Shipping Details</p>
        <div className="flex flex-col gap-3">
          <input className="input" placeholder="Full Name *"            value={form.name}     onChange={set('name')} />
          <input className="input" type="tel" placeholder="Phone / WhatsApp *" value={form.phone}    onChange={set('phone')} />
          <input className="input" placeholder="Country *"              value={form.country}  onChange={set('country')} />
          <input className="input" placeholder="State / Emirates *"     value={form.state}    onChange={set('state')} />
          <input className="input" placeholder="District *"             value={form.district} onChange={set('district')} />
          <input className="input" placeholder="Town / Village / Place *" value={form.place}  onChange={set('place')} />
          <textarea className="input resize-none" rows={2}
            placeholder="Order notes (optional)"
            value={form.notes} onChange={set('notes')} />
        </div>
      </div>

      {/* Payment */}
      <div className="card mb-4 p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Payment Method</p>
        <div className="flex flex-col gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              disabled={!m.available}
              onClick={() => setForm((p) => ({ ...p, payMethod: m.id }))}
              className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition
                ${!m.available ? 'cursor-not-allowed opacity-40' : ''}
                ${form.payMethod === m.id && m.available
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-200'}`}
            >
              <i className={`fa ${m.icon} w-5 text-center`} />
              {m.label}
              {!m.available && <span className="ml-auto text-[10px] text-gray-400">Coming Soon</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="card mb-4 p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Order Summary</p>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>{totalQty} item{totalQty !== 1 ? 's' : ''}</span>
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

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={isPending} className="btn-primary w-full">
        {isPending
          ? <><i className="fa fa-spinner fa-spin" /> Placing Order…</>
          : <><i className="fa fa-lock" /> Place Order</>}
      </button>
    </div>
  );
}
