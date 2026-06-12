const CACHE_NAME = 'smart-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/smart-logo-transparent.svg',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API requests: Network only (always fresh data, never cache)
// - Navigation (HTML pages): Network first, NO cache fallback for 4xx/5xx
// - Static assets: Stale-while-revalidate (only cache 2xx responses)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests entirely
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API routes — always go to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network first for all navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only return valid responses — do NOT cache or serve 4xx/5xx from SW
          return response;
        })
        .catch(() => {
          // Offline fallback: try cached root only for genuine network failures
          return caches.match('/').then((cached) => {
            if (cached) return cached;
            // If nothing in cache, let browser handle it normally
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
        })
    );
    return;
  }

  // Cache first for static assets (CSS, JS, images, fonts)
  // IMPORTANT: Only cache successful (2xx) responses
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        // Only cache valid 2xx responses
        if (response && response.status >= 200 && response.status < 300) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() => cached); // Offline: serve from cache if available
      return cached || fetchPromise;
    })
  );
});
