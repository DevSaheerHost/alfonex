import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminRtdb, adminMessaging } from '@/lib/firebase/admin';

// Messages sent for each status transition
const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  Packed:       { title: 'Order Packed',     body: 'Your order has been packed and is ready to ship.' },
  Dispatched:   { title: 'Order Dispatched', body: 'Your order has been dispatched and is on its way!' },
  Shipped:      { title: 'Order Shipped',    body: 'Your order has been shipped. Track it in the app.' },
  'In Transit': { title: 'In Transit',       body: 'Your order is in transit and arriving soon.' },
  Delivered:    { title: 'Delivered!',       body: 'Your order has been delivered. Thank you for shopping with us!' },
};

async function sendNotification(
  userId: string,
  orderId: string,
  title: string,
  body: string,
) {
  // In-app bell (RTDB)
  await adminRtdb().ref(`notifications/${userId}`).push({
    title,
    body,
    type: 'order_status',
    orderId,
    read: false,
    createdAt: Date.now(),
  });

  // Background FCM push
  try {
    const tokenSnap = await adminRtdb().ref(`users/${userId}/fcmToken`).get();
    if (!tokenSnap.exists()) return;
    await adminMessaging().send({
      token: tokenSnap.val() as string,
      notification: { title, body },
      data: { orderId },
      webpush: {
        fcmOptions: { link: `/orders/${orderId}` },
        notification: {
          icon:  '/assets/meta/icon/logo.png',
          badge: '/assets/meta/icon/logo.png',
        },
      },
    });
  } catch {
    // FCM failure must not block the response
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Verify caller is a logged-in admin (Firebase ID token)
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken    = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const decoded   = await adminAuth().verifyIdToken(idToken);
    const adminSnap = await adminRtdb().ref(`admins/${decoded.uid}`).get();
    if (!adminSnap.exists()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as {
    status?:    string;
    trackingNo?: string;
    courier?:   string;
  };

  const orderSnap = await adminRtdb().ref(`orders/${id}`).get();
  if (!orderSnap.exists()) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = orderSnap.val() as {
    userId:     string;
    status:     string;
    trackingNo: string;
  };

  const now     = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (body.status && body.status !== order.status) {
    updates.status = body.status;
    // Timestamp field per status, e.g. packed_at, shipped_at
    const tsKey = body.status.toLowerCase().replace(/\s+/g, '_') + '_at';
    updates[tsKey] = now;
  }
  if (body.trackingNo !== undefined) updates.trackingNo = body.trackingNo;
  if (body.courier    !== undefined) updates.courier    = body.courier;

  await adminRtdb().ref(`orders/${id}`).update(updates);

  const uid = order.userId;

  // Notify on status change
  if (body.status && body.status !== order.status) {
    const msg = STATUS_MESSAGES[body.status];
    if (msg) await sendNotification(uid, id, msg.title, msg.body);
  }

  // Notify when tracking number is first added
  const prevTracking = order.trackingNo ?? '';
  if (body.trackingNo && body.trackingNo !== prevTracking) {
    const courier = body.courier ?? updates.courier ?? '';
    const trackBody = courier
      ? `Tracking: ${body.trackingNo} via ${courier}`
      : `Tracking number: ${body.trackingNo}`;
    await sendNotification(uid, id, 'Tracking Added', trackBody);
  }

  return NextResponse.json({ ok: true });
}
