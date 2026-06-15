export const runtime = 'nodejs';

export async function GET() {
  const config = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? '',
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '',
    databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL       ?? '',
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? '',
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? '',
  };

  const sw = /* javascript */`
'use strict';

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Force immediate activation so handler changes take effect without waiting for all tabs to close
self.addEventListener('install',  ()  => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

// Show notification when app is in background / closed
// Messages are sent data-only so FCM doesn't auto-show a duplicate notification.
// Title/body are read from payload.data; payload.notification is a fallback.
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || payload.notification?.title || 'Alfonex';
  const body  = payload.data?.body  || payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon:    '/assets/meta/icon/logo.png',
    badge:   '/assets/meta/icon/logo.png',
    vibrate: [200, 100, 200],
    tag:     payload.data?.orderId ?? payload.data?.notifId ?? 'alfonex-notif',
    data:    payload.data ?? {},
    ...(payload.data?.imageUrl ? { image: payload.data.imageUrl } : {}),
  });
});

// Tap on notification → open/focus the app and navigate to the target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data     = event.notification.data ?? {};
  const url      = data.url || (data.orderId ? '/orders/' + data.orderId : '/');
  const notifId  = data.notifId || '';
  const trackUrl = notifId ? url + (url.includes('?') ? '&' : '?') + '_pnid=' + notifId : url;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) => w.url.startsWith(self.location.origin));
        if (existing) {
          existing.focus();
          return existing.navigate(trackUrl);
        }
        return clients.openWindow(trackUrl);
      }),
  );
});
`;

  return new Response(sw, {
    headers: {
      'Content-Type':           'application/javascript; charset=utf-8',
      'Cache-Control':          'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
