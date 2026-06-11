importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCTM2dhEVY5lFq7bNkIR7Gne-phh0nABXQ',
  authDomain:        'update1-b4bf5.firebaseapp.com',
  databaseURL:       'https://update1-b4bf5-default-rtdb.firebaseio.com',
  projectId:         'update1-b4bf5',
  storageBucket:     'update1-b4bf5.firebasestorage.app',
  messagingSenderId: '1049308656123',
  appId:             '1:1049308656123:web:c966f04f25a0322ac71b5e',
});

const messaging = firebase.messaging();

// Show notification when app is in background / closed
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Alfonex';
  const body  = payload.notification?.body  ?? '';
  self.registration.showNotification(title, {
    body,
    icon:    '/assets/meta/icon/logo.png',
    badge:   '/assets/meta/icon/logo.png',
    vibrate: [200, 100, 200],
    data:    payload.data ?? {},
  });
});

// Tap on notification → open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const url = orderId ? `/orders/${orderId}` : '/orders';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) => w.url.startsWith(self.location.origin));
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return clients.openWindow(url);
      }),
  );
});
