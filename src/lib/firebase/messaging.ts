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

export async function requestPushToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const permission   = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(clientMessaging(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch {
    return null;
  }
}

export function subscribeForeground(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void,
) {
  return onMessage(clientMessaging(), callback);
}
