export const runtime = 'nodejs';

export async function GET() {
  const fbApiKey           = process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? '';
  const fbAuthDomain       = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '';
  const fbProjectId        = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? '';
  const fbStorageBucket    = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '';
  const fbMessagingSenderId= process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?? '';
  const fbAppId            = process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? '';
  const fbDatabaseUrl      = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL       ?? '';

  const sw = /* javascript */`
'use strict';

// ── Firebase Cloud Messaging (background push) ────────────────────────────────
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            ${JSON.stringify(fbApiKey)},
  authDomain:        ${JSON.stringify(fbAuthDomain)},
  projectId:         ${JSON.stringify(fbProjectId)},
  storageBucket:     ${JSON.stringify(fbStorageBucket)},
  messagingSenderId: ${JSON.stringify(fbMessagingSenderId)},
  appId:             ${JSON.stringify(fbAppId)},
  databaseURL:       ${JSON.stringify(fbDatabaseUrl)},
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification ?? {};
  self.registration.showNotification(n.title || 'Alfonex Admin', {
    body:  n.body || '',
    icon:  n.icon || '/icons/admin-192.png',
    badge: '/icons/admin-192.png',
    data:  payload.data ?? {},
    vibrate: [200, 100, 200],
  });
});

// ── Cache strategy ────────────────────────────────────────────────────────────
const CACHE = 'alfonex-admin-v1';

const PRECACHE = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  '/icons/admin-192.png',
  '/icons/admin-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  // Do NOT call clients.claim() — claiming open pages mid-lifecycle causes
  // browsers (especially mobile) to reload the page, which looks like a loop.
  // The new SW takes effect on the next navigation instead.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = request.url;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Cache-first: CDN static assets
  const isCDN = url.includes('gstatic.com')
    || url.includes('cdnjs.cloudflare.com')
    || url.includes('cdn.jsdelivr.net')
    || url.includes('fonts.googleapis.com')
    || url.includes('fonts.gstatic.com')
    || url.includes('kit.fontawesome.com');

  if (isCDN) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(request, clone)).catch(() => {});
          return resp;
        });
      })
    );
    return;
  }

  // Network-first: admin pages — fall back to offline page
  if (url.includes('/admin')) {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached => cached ?? new Response(
          '<html><head><meta charset="utf-8"><title>Offline</title>'
          + '<style>body{font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#fff}'
          + 'h1{font-size:24px;margin-bottom:8px}.sub{color:#94a3b8;font-size:14px;margin-bottom:24px}'
          + 'button{padding:10px 24px;border-radius:8px;border:none;background:#6366f1;color:#fff;font-size:14px;font-weight:600;cursor:pointer}'
          + '</style></head><body>'
          + '<h1>You\'re offline</h1>'
          + '<p class="sub">Check your connection and try again.</p>'
          + '<button onclick="location.reload()">Retry</button>'
          + '</body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        ))
      )
    );
  }
});

// ── Notification click → focus or open the admin tab ─────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const adminClient = clients.find(c => c.url.includes('/admin'));
      if (adminClient) return adminClient.focus();
      return self.clients.openWindow('/admin');
    })
  );
});
`;

  return new Response(sw, {
    headers: {
      'Content-Type':  'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/admin/',
    },
  });
}
