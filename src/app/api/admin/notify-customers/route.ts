import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminRtdb, adminMessaging } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Auth guard — same pattern as /api/admin/orders/[id]
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

  const { title, body, imageUrl, clickUrl } = (await req.json()) as {
    title:      string;
    body:       string;
    imageUrl?:  string;
    clickUrl?:  string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  // Collect all customer FCM tokens
  const usersSnap = await adminRtdb().ref('users').get();
  const entries: { uid: string; token: string }[] = [];
  usersSnap.forEach((child) => {
    const token = (child.val() as { fcmToken?: string }).fcmToken;
    if (token) entries.push({ uid: child.key!, token });
  });

  if (!entries.length) {
    await adminRtdb().ref('push_notifications').push({
      title, body, imageUrl: imageUrl ?? null, clickUrl: clickUrl ?? null,
      sentAt: Date.now(), sentCount: 0, failedCount: 0,
    });
    return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0 });
  }

  // Create RTDB record first to get the key — embed notifId in FCM data for click tracking
  const notifRef = adminRtdb().ref('push_notifications').push();
  const notifId  = notifRef.key!;
  await notifRef.set({
    title, body, imageUrl: imageUrl ?? null, clickUrl: clickUrl ?? null,
    sentAt: Date.now(), sentCount: 0, failedCount: 0,
  });

  // fcmOptions.link requires an absolute URL; relative paths (from product selector) need the origin prepended
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alfonex.com').replace(/\s.*$/, '').replace(/\/$/, '');
  const absClickUrl = clickUrl
    ? (clickUrl.startsWith('http') ? clickUrl : `${siteBase}${clickUrl.startsWith('/') ? '' : '/'}${clickUrl}`)
    : undefined;

  // Data-only message — service worker shows exactly one notification; no FCM auto-display
  const msgData: Record<string, string> = { notifId, title, body };
  if (clickUrl)  msgData.url      = clickUrl;
  if (imageUrl)  msgData.imageUrl = imageUrl;

  const result = await adminMessaging().sendEachForMulticast({
    tokens: entries.map((e) => e.token),
    data: msgData,
    webpush: {
      headers: { Urgency: 'high' },
      ...(absClickUrl ? { fcmOptions: { link: absClickUrl } } : {}),
    },
  });

  const sentCount   = result.successCount;
  const failedCount = result.failureCount;

  // Clean up stale tokens
  const staleUids = result.responses
    .map((r, i) =>
      !r.success && r.error?.code === 'messaging/registration-token-not-registered'
        ? entries[i].uid
        : null,
    )
    .filter((uid): uid is string => uid !== null);

  if (staleUids.length) {
    await Promise.all(
      staleUids.map((uid) => adminRtdb().ref(`users/${uid}/fcmToken`).remove()),
    );
  }

  // Update the pre-created record with real sent/failed counts
  await notifRef.update({ sentCount, failedCount });

  return NextResponse.json({ ok: true, sent: sentCount, failed: failedCount, total: entries.length });
}
