// M-Lingua Service Worker
// Handles offline caching and PWA functionality

const CACHE_NAME = 'm-lingua-v3';
const RUNTIME_CACHE = 'm-lingua-runtime-v3';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/home',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.log('Service Worker install error:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests (APIs, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip requests that are likely to fail (like non-existent files)
  const url = new URL(event.request.url);
  if (url.pathname.includes('logo.png') && !url.pathname.includes('Logo_')) {
    // Don't handle requests for logo.png (doesn't exist)
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.log('Cache put error:', error);
              });

            return response;
          })
          .catch((error) => {
            console.log('Fetch error:', error);
            // If fetch fails, try to return a cached offline page
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            // Return a proper error response instead of undefined
            return new Response('Network error', { status: 408, statusText: 'Request Timeout' });
          });
      })
      .catch((error) => {
        console.log('Cache match error:', error);
        // Return a proper error response
        return new Response('Cache error', { status: 500, statusText: 'Internal Server Error' });
      })
  );
});

