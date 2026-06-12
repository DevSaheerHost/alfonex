'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb, adminMessaging } from '@/lib/firebase/admin';
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
  discountPoints = 0,
): Promise<{ orderId: string }> {
  const user = await verifySession();

  if (!cart.length) throw new Error('Cart is empty');

  const shipping = SHIPPING_RATES[currency];
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Validate and apply loyalty points redemption
  let loyaltyDiscount = 0;
  if (discountPoints > 0) {
    const balSnap = await adminRtdb().ref(`users/${user.uid}/loyaltyPoints`).get();
    const balance = (balSnap.val() as number | null) ?? 0;
    if (balance < discountPoints) throw new Error('Insufficient loyalty points');
    loyaltyDiscount = Math.floor(discountPoints / 100);
  }

  const total = subtotal + shipping - loyaltyDiscount;
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

  // Deduct redeemed points before saving order
  if (discountPoints > 0) {
    await adminRtdb().ref(`users/${user.uid}/loyaltyPoints`).transaction(
      (pts: number | null) => Math.max(0, (pts ?? 0) - discountPoints),
    );
    await adminRtdb().ref(`loyalty_history/${user.uid}`).push({
      points:    -discountPoints,
      type:      'redeemed',
      createdAt: Date.now(),
    });
  }

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

  // Write in-app notification (RTDB bell)
  await adminRtdb().ref(`notifications/${user.uid}`).push({
    title: 'Order Placed!',
    body:  "Your order has been placed. We'll process it shortly.",
    type:  'order_placed',
    orderId: orderRef.key,
    read:  false,
    createdAt: Date.now(),
  });

  // Award loyalty points (1 pt per 10 units of currency)
  try {
    const earnedPts = Math.floor(total / 10);
    if (earnedPts > 0) {
      await adminRtdb().ref(`users/${user.uid}/loyaltyPoints`).transaction(
        (pts: number | null) => (pts ?? 0) + earnedPts,
      );
      const histRef = await adminRtdb().ref(`loyalty_history/${user.uid}`).push({
        points:    earnedPts,
        type:      'earned',
        orderId:   orderRef.key,
        createdAt: Date.now(),
      });

      // First-order referral bonus: if this is the only history entry, reward referrer
      const histSnap = await adminRtdb().ref(`loyalty_history/${user.uid}`).get();
      if (histSnap.exists() && Object.keys(histSnap.val()).length === 1) {
        const referredBySnap = await adminRtdb().ref(`users/${user.uid}/referredBy`).get();
        if (referredBySnap.exists()) {
          const referrerId = referredBySnap.val() as string;
          await adminRtdb().ref(`users/${referrerId}/loyaltyPoints`).transaction(
            (pts: number | null) => (pts ?? 0) + 50,
          );
          await adminRtdb().ref(`loyalty_history/${referrerId}`).push({
            points:    50,
            type:      'referral_bonus',
            createdAt: Date.now(),
          });
        }
      }
      void histRef; // suppress unused var
    }
  } catch {
    // Points failure must never fail the order
  }

  // Send background push if user has an FCM token
  try {
    const tokenSnap = await adminRtdb().ref(`users/${user.uid}/fcmToken`).get();
    if (tokenSnap.exists()) {
      await adminMessaging().send({
        token: tokenSnap.val() as string,
        notification: {
          title: 'Order Placed!',
          body:  "Your order has been placed. We'll process it shortly.",
        },
        data:    { orderId: orderRef.key! },
        webpush: {
          fcmOptions: { link: `/orders/${orderRef.key}` },
          notification: {
            icon:  '/assets/meta/icon/logo.png',
            badge: '/assets/meta/icon/logo.png',
          },
        },
      });
    }
  } catch {
    // Push failure must not fail the order
  }

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
