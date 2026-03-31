const CACHE_NAME = 'banf-v1';
const ASSETS_TO_CACHE = [
  '/banf/v2/index.html',
  '/banf/v2/events.html',
  '/banf/v2/membership.html',
  '/banf/v2/leadership.html',
  '/banf/v2/gallery.html',
  '/banf/v2/about.html',
  '/banf/v2/jagriti.html',
  '/banf/v2/shared-styles.css',
  '/banf/v2/shared.js',
  '/banf/v2/gallery-data.js',
  '/banf/banf-logo.jpg',
  '/banf/banf-logo.png',
  '/banf/icons/icon-192x192.png',
  '/banf/icons/icon-512x512.png'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // HTML pages: network first, fall back to cache
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('/banf/v2/index.html')))
    );
    return;
  }

  // Other assets: cache first, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }))
  );
});
