const CACHE_NAME = 'pfotencard-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  // In a real build process, you'd cache the compiled JS file (e.g., /assets/index-....js)
  // For this setup, we cache the TSX to make it work in the dev environment.
  '/index.tsx',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

// 1. Install the service worker and cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Serve from cache, fallback to network (Cache-First Strategy)
self.addEventListener('fetch', event => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Serve from cache
          return response;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Optional: Cache new requests dynamically
            return caches.open(CACHE_NAME).then(cache => {
              // Be careful not to cache API responses that change frequently
              if (!event.request.url.includes('/api/')) {
                  cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          }
        );
      })
      .catch(error => {
        console.error('Fetching failed:', error);
        // You could return a generic offline page here if you have one cached
      })
  );
});

// TODO: Implement background sync for offline transactions
// This is an advanced topic involving IndexedDB to queue failed POST requests
// and a 'sync' event listener to send them when online again.
