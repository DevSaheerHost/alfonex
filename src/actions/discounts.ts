'use server';

import { adminRtdb } from '@/lib/firebase/admin';

export interface DiscountResult {
  code:     string;
  type:     'percent' | 'flat';
  value:    number;
  discount: number; // actual amount off (in current currency units)
  label:    string; // e.g. "10% off" or "AED 50 off"
}

export async function validateDiscountCode(
  code:     string,
  subtotal: number,
  symbol:   string,
): Promise<DiscountResult> {
  const upper = code.trim().toUpperCase();
  if (!upper) throw new Error('Enter a discount code');

  const snap = await adminRtdb().ref(`discount_codes/${upper}`).get();
  if (!snap.exists()) throw new Error('Invalid discount code');

  const dc = snap.val();
  if (!dc.isActive)                            throw new Error('This code is no longer active');
  if (dc.expiresAt && Date.now() > dc.expiresAt) throw new Error('This code has expired');
  if (dc.maxUses && dc.usedCount >= dc.maxUses)  throw new Error('This code has reached its usage limit');
  if (dc.minOrder && subtotal < dc.minOrder)     throw new Error(`Minimum order of ${symbol}${dc.minOrder} required`);

  const discount = dc.type === 'percent'
    ? Math.floor((subtotal * dc.value) / 100)
    : Math.min(dc.value, subtotal);

  const label = dc.type === 'percent' ? `${dc.value}% off` : `${symbol}${dc.value} off`;

  return { code: upper, type: dc.type, value: dc.value, discount, label };
}

export async function redeemDiscountCode(code: string): Promise<void> {
  const upper = code.trim().toUpperCase();
  await adminRtdb()
    .ref(`discount_codes/${upper}/usedCount`)
    .transaction((n) => (n ?? 0) + 1);
}
