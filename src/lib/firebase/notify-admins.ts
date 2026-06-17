import 'server-only';
import { adminRtdb, adminMessaging } from '@/lib/firebase/admin';

export async function notifyAdmins(
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const snap = await adminRtdb().ref('admin_fcm_tokens').get();
  if (!snap.exists()) return;

  // Collect uid → token pairs
  const entries: { uid: string; token: string }[] = [];
  snap.forEach((child) => {
    const token = (child.val() as { token?: string }).token;
    if (token) entries.push({ uid: child.key!, token });
  });
  if (!entries.length) return;

  const result = await adminMessaging().sendEachForMulticast({
    tokens: entries.map((e) => e.token),
    data: { title, body, ...(data ?? {}) },
    webpush: {
      headers: { Urgency: 'high' },
      fcmOptions: { link: data?.orderId ? `/admin?order=${data.orderId}` : '/admin' },
    },
  });

  // Remove tokens Firebase reports as no longer registered (PWA uninstalled / token rotated)
  const staleUids = result.responses
    .map((r, i) =>
      !r.success && r.error?.code === 'messaging/registration-token-not-registered'
        ? entries[i].uid
        : null,
    )
    .filter((uid): uid is string => uid !== null);

  if (staleUids.length) {
    await Promise.all(
      staleUids.map((uid) => adminRtdb().ref(`admin_fcm_tokens/${uid}`).remove()),
    );
  }
}
