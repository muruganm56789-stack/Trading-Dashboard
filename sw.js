/**
 * sw.js — Signal Desk PWA Service Worker
 */

const SHELL_CACHE = 'signal-desk-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Network-first for live data API, Cache-first for App Shell
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  if (req.method !== 'GET') return;

  // Never cache Google Apps Script API calls
  if (req.url.includes('script.google.com') || req.url.includes('format=json')) {
    return;
  }

  event.respondWith(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});
