import {
  getMessaging,
  getToken,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { getApp } from '@/lib/firebase/client';

let _messaging: Messaging | null = null;

function clientMessaging(): Messaging {
  if (!_messaging) _messaging = getMessaging(getApp());
  return _messaging;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

export type PushResult =
  | { ok: true;  token: string }
  | { ok: false; reason: 'denied' | 'unsupported' | 'no_vapid' | 'error'; message: string };

export async function requestPushToken(): Promise<PushResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported', message: 'Service workers not supported in this browser.' };
  }
  if (!('Notification' in window)) {
    return { ok: false, reason: 'unsupported', message: 'Notifications not supported in this browser.' };
  }
  if (!VAPID_KEY) {
    return { ok: false, reason: 'no_vapid', message: 'NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set.' };
  }

  const permission = await Notification.requestPermission();
  if (permission === 'denied') {
    return { ok: false, reason: 'denied', message: 'Notification permission denied by the browser.' };
  }
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied', message: 'Notification permission not granted.' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    // Wait for the service worker to be active
    await navigator.serviceWorker.ready;
    const token = await getToken(clientMessaging(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      return { ok: false, reason: 'error', message: 'FCM returned an empty token. Check Firebase Console → Cloud Messaging is enabled.' };
    }
    return { ok: true, token };
  } catch (e: unknown) {
    return {
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : 'Unknown FCM error',
    };
  }
}

export function subscribeForeground(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void,
) {
  return onMessage(clientMessaging(), callback);
}
