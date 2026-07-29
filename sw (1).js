const CACHE_NAME = 'trading-dashboard-v1';
const SHELL_FILES = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell; always go to network for live data endpoints
// (Google Apps Script Web App URLs) so signal data is never stale from cache.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isDataEndpoint = url.indexOf('script.google.com') !== -1;

  if (isDataEndpoint) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
