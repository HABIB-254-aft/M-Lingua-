// M-Lingua Enhanced Service Worker
// Handles offline caching, background sync, and PWA functionality

const APP_VERSION = '4.0.1';
const CACHE_NAME = `m-lingua-v${APP_VERSION}`;
const RUNTIME_CACHE = `m-lingua-runtime-v${APP_VERSION}`;
const STATIC_CACHE = `m-lingua-static-v${APP_VERSION}`;

// Assets to cache on install (static assets - cache-first strategy)
const STATIC_ASSETS = [
  '/',
  '/home',
  '/home/speech-to-text',
  '/home/text-to-speech',
  '/home/conversation-mode',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Dynamic routes that should be cached (network-first, then cache)
const DYNAMIC_ROUTES = [
  '/home',
  '/home/speech-to-text',
  '/home/text-to-speech',
  '/home/conversation-mode',
];

// API endpoints that should use network-first with background sync
const API_ENDPOINTS = [
  'api.mymemory.translated.net',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker, version:', APP_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Service Worker install error:', error);
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker, version:', APP_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Delete old caches that don't match current version
        const deletePromises = cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== RUNTIME_CACHE && 
                   cacheName !== STATIC_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        return self.clients.claim(); // Take control of all pages
      })
      .then(() => {
        // Notify all clients about the new service worker
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: APP_VERSION,
            });
          });
        });
      })
  );
});

// Helper: Check if request is for static asset
function isStaticAsset(url) {
  const staticPatterns = [
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
    /\/_next\/static\//,
    /\/icon-/,
    /\/manifest\.json$/,
  ];
  
  return staticPatterns.some(pattern => pattern.test(url.pathname));
}

// Helper: Check if request is for dynamic route
function isDynamicRoute(url) {
  return DYNAMIC_ROUTES.some(route => url.pathname.startsWith(route));
}

// Helper: Check if request is for API endpoint
function isAPIEndpoint(url) {
  return API_ENDPOINTS.some(endpoint => url.hostname.includes(endpoint));
}

// Cache-first strategy: For static assets
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    // Return a basic offline response for HTML requests
    if (request.destination === 'document') {
      return cache.match('/') || new Response('Offline', { status: 503 });
    }
    throw error;
  }
}

// Network-first strategy: For dynamic content and API calls
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    
    // If network fails, try cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If both fail, return error response
    if (request.destination === 'document') {
      return cache.match('/') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy: For frequently accessed resources
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Return cached version immediately (even if stale)
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // Update cache in background
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Ignore network errors, we already have cached version
    });
  
  // Return cached version immediately, update in background
  return cachedResponse || fetchPromise;
}

// Fetch event - route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests (except for background sync)
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip requests that are likely to fail
  if (url.pathname.includes('logo.png') && !url.pathname.includes('Logo_')) {
    return;
  }
  
  // Route to appropriate caching strategy
  if (isStaticAsset(url)) {
    // Static assets: Cache-first
    event.respondWith(cacheFirst(request));
  } else if (isAPIEndpoint(url)) {
    // API endpoints: Network-first with background sync
    event.respondWith(networkFirst(request));
  } else if (isDynamicRoute(url) || url.pathname === '/') {
    // Dynamic routes: Stale-while-revalidate for better UX
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.origin === self.location.origin) {
    // Same-origin requests: Network-first
    event.respondWith(networkFirst(request));
  } else {
    // External requests: Network-first
    event.respondWith(networkFirst(request));
  }
});

// Helper: Open IndexedDB for sync queue
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mlingua_sync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Sync queued translations
async function syncQueuedTranslations() {
  try {
    // Get queued translations from IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const queued = await store.getAll();
    
    for (const item of queued) {
      if (item.type === 'translation') {
        try {
          // Retry the translation request
          const response = await fetch(item.url, item.options);
          
          if (response.ok) {
            // Success - remove from queue
            await store.delete(item.id);
            console.log('[SW] Synced translation:', item.id);
            
            // Notify client about successful sync
            const clients = await self.clients.matchAll();
            clients.forEach((client) => {
              client.postMessage({
                type: 'TRANSLATION_SYNCED',
                id: item.id,
              });
            });
          }
        } catch (error) {
          console.error('[SW] Failed to sync translation:', error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Error syncing translations:', error);
  }
}

// Sync queued API requests
async function syncQueuedAPIRequests() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const queued = await store.getAll();
    
    for (const item of queued) {
      if (item.type === 'api') {
        try {
          const response = await fetch(item.url, item.options);
          
          if (response.ok) {
            await store.delete(item.id);
            console.log('[SW] Synced API request:', item.id);
          }
        } catch (error) {
          console.error('[SW] Failed to sync API request:', error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Error syncing API requests:', error);
  }
}

// Background Sync: Queue failed requests for retry when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-translations') {
    event.waitUntil(syncQueuedTranslations());
  } else if (event.tag === 'sync-api-requests') {
    event.waitUntil(syncQueuedAPIRequests());
  }
});

// Message handler: Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  // Future: Handle push notifications
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
