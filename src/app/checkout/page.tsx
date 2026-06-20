'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCart }   from '@/contexts/CartContext';
import { useAuth }   from '@/contexts/AuthContext';
import { useApp }    from '@/contexts/AppContext';
import { placeOrder } from '@/actions/orders';
import { getAddresses } from '@/actions/users';
import { getMyLoyalty } from '@/actions/loyalty';
import { validateDiscountCode, redeemDiscountCode } from '@/actions/discounts';
import { CURRENCY_SYMBOLS } from '@/lib/types';
import type { CheckoutFormData, PayMethod, Address } from '@/lib/types';
import Link from 'next/link';

const PAYMENT_METHODS: { id: PayMethod; label: string; icon: string; available: boolean }[] = [
  { id: 'cod',       label: 'Pay on Delivery', icon: 'fa-money-bill-wave', available: true },
  { id: 'card',      label: 'Card',            icon: 'fa-credit-card',    available: false },
  { id: 'apple_pay', label: 'Apple Pay',       icon: 'fa-apple',         available: false },
];

const SHIPPING_RATES = { usd: 50, aed: 120, inr: 3000 } as const;

const GRADE_LABELS: Record<string, { label: string; color: string }> = {
  'a1+': { label: 'Excellent',  color: 'bg-green-100 text-green-700' },
  'a2+': { label: 'Very Good',  color: 'bg-blue-100 text-blue-700' },
  'a3+': { label: 'Good',       color: 'bg-yellow-100 text-yellow-700' },
};

function estimatedDelivery(country: string): string {
  const c = country.toLowerCase().trim();
  if (!c) return '';
  if (c.includes('uae') || c.includes('emirates') || c === 'ae') return '1–2 business days';
  if (c.includes('india') || c === 'in') return '7–12 business days';
  if (c.includes('saudi') || c.includes('ksa') || c === 'sa') return '3–5 business days';
  if (c.includes('qatar') || c === 'qa') return '2–4 business days';
  if (c.includes('bahrain') || c === 'bh') return '2–4 business days';
  if (c.includes('kuwait') || c === 'kw') return '2–4 business days';
  if (c.includes('oman') || c === 'om') return '2–4 business days';
  return '7–21 business days';
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart, totalQty } = useCart();
  const { user }     = useAuth();
  const { currency } = useApp();
  const router       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]            = useState('');

  const symbol   = CURRENCY_SYMBOLS[currency];
  const shipping = SHIPPING_RATES[currency] * totalQty;

  // Loyalty points
  const [loyaltyBalance,   setLoyaltyBalance]   = useState(0);
  const [redeemPoints,     setRedeemPoints]      = useState(0);
  const [redeemInput,      setRedeemInput]       = useState('');

  const [discountCode,    setDiscountCode]    = useState('');
  const [discountInput,   setDiscountInput]   = useState('');
  const [discountResult,  setDiscountResult]  = useState<{ code: string; discount: number; label: string } | null>(null);
  const [discountError,   setDiscountError]   = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyLoyalty().then(({ points }) => setLoyaltyBalance(points)).catch(() => {});
  }, [user]);

  const loyaltyDiscount = Math.floor(redeemPoints / 100);
  const total           = subtotal + shipping - loyaltyDiscount - (discountResult?.discount ?? 0);

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

  async function applyDiscount() {
    if (!discountInput.trim()) return;
    setDiscountLoading(true);
    setDiscountError('');
    setDiscountResult(null);
    try {
      const result = await validateDiscountCode(discountInput, subtotal, symbol);
      setDiscountResult({ code: result.code, discount: result.discount, label: result.label });
      setDiscountCode(result.code);
    } catch (e: unknown) {
      setDiscountError((e as Error).message);
    } finally {
      setDiscountLoading(false);
    }
  }

  const handleSubmit = () => {
    if (!user) { router.push('/login?redirect=/checkout'); return; }
    const required: (keyof CheckoutFormData)[] = ['name', 'phone', 'country', 'state', 'district', 'place'];
    for (const f of required) {
      if (!form[f]) { setError(`Please fill in: ${f}`); return; }
    }
    setError('');

    startTransition(async () => {
      try {
        // Collect attribution data per product from localStorage
        const attribution: Record<string, { ref: string; query?: string; pos?: number }> = {};
        const ATTR_TTL = 24 * 60 * 60 * 1000; // 24 hours
        for (const item of items) {
          try {
            const raw = localStorage.getItem(`attr_${item.productId}`);
            if (!raw) continue;
            const a = JSON.parse(raw) as { ref: string; query?: string; pos?: number; ts?: number };
            if (a.ts && Date.now() - a.ts > ATTR_TTL) { localStorage.removeItem(`attr_${item.productId}`); continue; }
            attribution[item.productId] = { ref: a.ref, ...(a.query && { query: a.query }), ...(a.pos !== undefined && { pos: a.pos }) };
          } catch { /* ignore corrupt entries */ }
        }
        const { orderId } = await placeOrder(form, items, currency, redeemPoints, Object.keys(attribution).length ? attribution : undefined);
        if (discountCode) {
          redeemDiscountCode(discountCode).catch(() => {});
        }
        // Clear attribution entries for purchased items
        for (const item of items) {
          try { localStorage.removeItem(`attr_${item.productId}`); } catch { /* ignore */ }
        }
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

      {/* Loyalty Points */}
      {user && loyaltyBalance > 0 && (
        <div className="card mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold dark:text-gray-100">
              <i className="fa fa-star mr-1.5 text-yellow-400" />
              Loyalty Points
            </p>
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {loyaltyBalance.toLocaleString()} pts
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">100 pts = {symbol}1 off · Use multiples of 100</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="number"
              min={0}
              step={100}
              max={Math.min(loyaltyBalance, Math.floor(subtotal) * 100)}
              placeholder="Points to redeem"
              value={redeemInput}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10) || 0;
                const clamped = Math.min(raw, loyaltyBalance, Math.floor(subtotal) * 100);
                const rounded = Math.floor(clamped / 100) * 100;
                setRedeemInput(e.target.value);
                setRedeemPoints(rounded);
              }}
            />
            <button
              type="button"
              onClick={() => { setRedeemPoints(0); setRedeemInput(''); }}
              className="rounded-xl border border-gray-200 px-3 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Clear
            </button>
          </div>
          {redeemPoints > 0 && (
            <p className="mt-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
              <i className="fa fa-tag mr-1" />
              Discount: {symbol}{loyaltyDiscount.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Discount Code */}
      <div className="card mb-4 p-4">
        <p className="mb-2 font-semibold dark:text-gray-100">
          <i className="fa fa-tag mr-1.5 text-primary-500" />
          Discount Code
        </p>
        {discountResult ? (
          <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2.5 dark:bg-green-950/30">
            <div>
              <p className="text-sm font-bold text-green-700 dark:text-green-400">
                <i className="fa fa-circle-check mr-1.5" />{discountResult.code}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">{discountResult.label} applied</p>
            </div>
            <button
              onClick={() => { setDiscountResult(null); setDiscountCode(''); setDiscountInput(''); }}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="input flex-1 uppercase"
              placeholder="Enter promo code"
              value={discountInput}
              onChange={(e) => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
            />
            <button
              type="button"
              onClick={applyDiscount}
              disabled={discountLoading || !discountInput.trim()}
              className="btn-primary btn-sm px-4"
            >
              {discountLoading ? <i className="fa fa-spinner fa-spin" /> : 'Apply'}
            </button>
          </div>
        )}
        {discountError && <p className="mt-1.5 text-xs text-red-500">{discountError}</p>}
      </div>

      {/* Summary */}
      <div className="card mb-4 p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Order Summary</p>

        {/* Items list with grade */}
        <div className="mb-3 flex flex-col gap-2">
          {items.map((item) => {
            const grade = item.grade ? GRADE_LABELS[item.grade] : null;
            return (
              <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium dark:text-gray-100">{item.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {item.variantLabel && (
                      <span className="text-xs text-gray-400">{item.variantLabel}</span>
                    )}
                    {grade && (
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${grade.color}`}>
                        {grade.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-semibold dark:text-gray-100">{symbol}{(item.price * item.qty).toLocaleString()}</p>
                  {item.qty > 1 && <p className="text-xs text-gray-400">× {item.qty}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 text-sm dark:border-gray-700">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Subtotal</span>
            <span>{symbol}{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Shipping</span>
            <span>{symbol}{shipping.toLocaleString()}</span>
          </div>
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Loyalty Discount</span>
              <span>−{symbol}{loyaltyDiscount.toLocaleString()}</span>
            </div>
          )}
          {discountResult && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Promo ({discountResult.code})</span>
              <span>−{symbol}{discountResult.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold dark:border-gray-700 dark:text-gray-100">
            <span>Total</span>
            <span>{symbol}{total.toLocaleString()}</span>
          </div>
        </div>

        {/* Estimated delivery */}
        {estimatedDelivery(form.country) && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-xs dark:bg-green-950/30">
            <i className="fa fa-truck text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300">
              Estimated delivery: <strong>{estimatedDelivery(form.country)}</strong>
            </span>
          </div>
        )}
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
