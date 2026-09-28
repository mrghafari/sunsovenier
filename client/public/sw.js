const CACHE_VERSION = 'v8-20260928';
const STATIC_CACHE = `momtazchem-static-${CACHE_VERSION}`;
const API_CACHE = `momtazchem-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/shop',
  '/delivery',
  '/manifest.json',
  '/delivery-manifest.json',
  '/favicon.png',
];

const API_CACHE_ROUTES = [
  '/api/products',
  '/api/public/categories',
  '/api/public/content-settings',
  '/api/public/language-settings',
  '/api/footer-settings',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some static assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip admin/auth/session/upload routes
  if (
    url.pathname.startsWith('/api/admin') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/customers/me') ||
    url.pathname.startsWith('/api/upload') ||
    url.pathname.startsWith('/api/cart') ||
    url.pathname.startsWith('/api/orders') ||
    url.pathname.startsWith('/api/payment') ||
    url.pathname.startsWith('/api/wallet')
  ) {
    return;
  }

  // API routes: Network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = API_CACHE_ROUTES.some((route) =>
      url.pathname.startsWith(route)
    );
    if (isCacheable) {
      event.respondWith(networkFirstWithCache(request, API_CACHE, 10000));
    }
    return;
  }

  // Navigation requests (HTML pages): Network first, fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/') || caches.match('/shop')
      )
    );
    return;
  }

  // Application assets: prefer the latest deployed bundle, with cache only as
  // an offline fallback. This prevents users from remaining on an old language
  // bundle after a deployment.
  event.respondWith(networkFirstWithCache(request, STATIC_CACHE, 10000));
});

async function networkFirstWithCache(request, cacheName, timeout) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      ),
    ]);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('Network failed and no cache available');
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    throw err;
  }
}

// Background sync for offline cart/orders (future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  // placeholder for offline cart sync
  console.log('[SW] Background sync: cart');
}

// Push notifications (future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'ممتازکم', {
      body: data.body || '',
      icon: '/pwa-icons/icon-192x192.png',
      badge: '/pwa-icons/icon-72x72.png',
      dir: 'rtl',
      lang: 'fa',
      data: { url: data.url || '/shop' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/shop')
  );
});
