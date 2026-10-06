// Minimal PWA Service Worker for Control de Avance
const CACHE_NAME = 'control-avance-v16';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png',
  '/icon.svg',
  '/portada.png',
  '/og-banner.png',
  '/icon-48.png',
  '/icon-128.png',
  '/icon-192.png',
  '/icon-256.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Assets cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Supabase API / external URLs
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Network-first for dynamic content with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful local asset responses
        if (networkResponse && networkResponse.status === 200 && url.origin === location.origin) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
