/* TaskPilot Service Worker — manual PWA (tanpa Workbox) */
const CACHE_VERSION = 'taskpilot-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = '/offline';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('taskpilot-') && key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(request, url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(css|js|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|eot)$/.test(url.pathname)
  );
}

function isCrossOriginStatic(url) {
  // Google Fonts & CDN assets — safe to cache, stale-while-revalidate
  return (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    // Only cache successful basic HTML responses
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request).catch(() => undefined);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL).catch(() => undefined);
    if (offline) return offline;
    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request).catch(() => undefined);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => undefined);
  // Return cache immediately when available, update in background
  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }
  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  return Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache API / auth / supabase traffic — always network only
  if (isApiRequest(url)) return;

  // Navigations (page loads): network-first with offline fallback
  if (request.mode === 'navigate') {
    // Let the offline page itself load fast from cache
    if (url.pathname === OFFLINE_URL) {
      event.respondWith(
        caches.match(OFFLINE_URL).then((cached) => cached || fetch(request))
      );
      return;
    }
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  if (isStaticAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Google fonts: stale-while-revalidate in static cache
  if (isCrossOriginStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request).catch(() => undefined);
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        } catch (err) {
          if (cached) return cached;
          return Response.error();
        }
      })()
    );
    return;
  }
});
