'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import { decrementProductStock } from './products';
import type { Order, CheckoutFormData, CartItem, Currency } from '@/lib/types';

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');
  return adminAuth().verifySessionCookie(session, true);
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

  const shipping = SHIPPING_RATES[currency];
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total    = subtotal + shipping;
  const cost     = cart.reduce((s, i) => s + (i.costPrice ?? 0) * i.qty, 0);
  const profit   = total - cost - shipping;

  const items = cart.map((i) => ({
    productId:    i.productId,
    title:        i.name,
    variantLabel: i.variantLabel || '',
    qty:          i.qty,
    unitPrice:    i.price,
    costPrice:    i.costPrice ?? 0,
    lineTotal:    i.price * i.qty,
    grade:        i.grade ?? '',
  }));

  const now = new Date().toISOString();
  const orderRef = adminRtdb().ref('orders').push();

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

  // Decrement stock for each line item
  await Promise.all(
    cart.map((item) =>
      decrementProductStock(item.productId, item.qty, item.variantLabel),
    ),
  );

  // Write in-app notification for the customer
  await adminRtdb().ref(`notifications/${user.uid}`).push({
    title: 'Order Placed!',
    body: `Your order has been placed. We'll process it shortly.`,
    type: 'order_placed',
    orderId: orderRef.key,
    read: false,
    createdAt: Date.now(),
  });

  return { orderId: orderRef.key! };
}

// ─── Get user orders ──────────────────────────────────────────────────────────

export async function getUserOrders(): Promise<Order[]> {
  const user = await verifySession();

  const snap = await adminRtdb()
    .ref('orders')
    .orderByChild('userId')
    .equalTo(user.uid)
    .get();

  if (!snap.exists()) return [];

  return Object.entries(snap.val() as Record<string, object>)
    .map(([id, data]) => ({ id, ...data }) as Order)
    .sort((a, b) => {
      const t = (v: string | number | undefined) =>
        typeof v === 'number' ? v : new Date(v ?? 0).getTime();
      return t(b.createdAt) - t(a.createdAt);
    });
}

// ─── Get single order (owner-only) ────────────────────────────────────────────

export async function getOrder(orderId: string): Promise<Order> {
  const user = await verifySession();

  const snap = await adminRtdb().ref(`orders/${orderId}`).get();
  if (!snap.exists()) throw new Error('Order not found');

  const order = { id: orderId, ...snap.val() } as Order;
  if (order.userId !== user.uid) throw new Error('Forbidden');

  return order;
}
