'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { decrementProductStock } from './products';
import type { Order, CheckoutFormData, CartItem, Currency } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');

  const decoded = await adminAuth().verifySessionCookie(session, true);
  return decoded;
}

// ─── Shipping rates ───────────────────────────────────────────────────────────

const SHIPPING_RATES: Record<Currency, number> = {
  usd: 50,
  aed: 120,
  inr: 3000,
};

// ─── Place order ──────────────────────────────────────────────────────────────

export async function placeOrder(
  form: CheckoutFormData,
  cart: CartItem[],
  currency: Currency,
): Promise<{ orderId: string }> {
  const user = await verifySession();

  if (!cart.length) throw new Error('Cart is empty');

  const totalQty   = cart.reduce((s, i) => s + i.qty, 0);
  const shipping   = SHIPPING_RATES[currency];
  const subtotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total      = subtotal + shipping;
  const cost       = cart.reduce((s, i) => s + (i.costPrice ?? 0) * i.qty, 0);
  const profit     = total - cost - shipping;

  const items = cart.map((i) => ({
    productId:    i.productId,
    title:        i.name,
    variantLabel: i.variantLabel || '',
    qty:          i.qty,
    unitPrice:    i.price,
    costPrice:    i.costPrice ?? 0,
    lineTotal:    i.price * i.qty,
  }));

  const now = new Date().toISOString();

  const orderRef = adminDb().collection('orders').doc();
  await orderRef.set({
    customerName:     form.name,
    customerPhone:    form.phone,
    customerCountry:  form.country,
    customerState:    form.state,
    customerDistrict: form.district,
    customerPlace:    form.place,
    userId:           user.uid,
    userEmail:        user.email ?? '',
    items,
    cost,
    shipping,
    total,
    profit,
    amountPaid:    0,
    paymentStatus: 'Unpaid',
    status:        'Pending',
    payMethod:     form.payMethod,
    currency,
    notes:         form.notes || '',
    courier:       '',
    trackingNo:    '',
    createdAt:     now,
    updatedAt:     now,
    createdBy:     user.uid,
  });

  // Decrement stock for each line item in parallel
  await Promise.all(
    cart.map((item) =>
      decrementProductStock(item.productId, item.qty, item.variantLabel),
    ),
  );

  return { orderId: orderRef.id };
}

// ─── Get user orders ──────────────────────────────────────────────────────────

export async function getUserOrders(): Promise<Order[]> {
  const user = await verifySession();

  const snap = await adminDb()
    .collection('orders')
    .where('userId', '==', user.uid)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

// ─── Get single order (owner-only) ────────────────────────────────────────────

export async function getOrder(orderId: string): Promise<Order> {
  const user = await verifySession();

  const doc = await adminDb().collection('orders').doc(orderId).get();
  if (!doc.exists) throw new Error('Order not found');

  const order = { id: doc.id, ...doc.data() } as Order;
  if (order.userId !== user.uid) throw new Error('Forbidden');

  return order;
}
