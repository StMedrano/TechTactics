const CACHE_NAME = 'techtactics-portal-v1.0.41';
const APP_SHELL = [
  './',
  './index.html',
  './directory-login.html',
  './manifest.webmanifest',
  './assets/pwa-icon.svg',
  './assets/pwa-icon-192.png',
  './assets/pwa-icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/techtactics-logo.png'
];

function getPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch {
    return {
      title: 'TechTactics Portal',
      body: event.data.text()
    };
  }
}

function normalizeNotificationUrl(value) {
  const fallbackUrl = new URL('./', self.location.href).href;
  if (!value) {
    return fallbackUrl;
  }

  try {
    return new URL(value, self.location.href).href;
  } catch {
    return fallbackUrl;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return response;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  const payload = getPushPayload(event);
  const title = payload.title || 'TechTactics Portal';
  const url = normalizeNotificationUrl(payload.url);
  const badgeCount = Number(payload.badgeCount || 0);

  const options = {
    body: payload.body || 'You have a new portal update.',
    icon: './assets/pwa-icon-192.png',
    badge: './assets/pwa-icon-192.png',
    tag: payload.tag || 'techtactics-portal',
    renotify: true,
    data: {
      ...(payload.data || {}),
      url
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        if (badgeCount > 0 && navigator.setAppBadge) {
          return navigator.setAppBadge(badgeCount).catch(() => {});
        }
        return null;
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = normalizeNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url === targetUrl) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});

self.addEventListener('notificationclose', () => {
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch(() => {});
  }
});
