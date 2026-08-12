/**
 * sw.js — Signal Desk PWA Service Worker
 */

const SHELL_CACHE = 'signal-desk-shell-v2';
const SHELL_FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) { 
      return cache.addAll(SHELL_FILES); 
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== SHELL_CACHE; }).map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

function isShellRequest(url, selfOrigin) {
  let u;
  try { u = new URL(url); } catch (e) { return false; }
  if (u.origin !== selfOrigin) return false; // Never cache Google Apps Script API endpoints
  return /\.(html|css|js|json|png|svg|ico)$/.test(u.pathname) || u.pathname === '/' || u.pathname.endsWith('/');
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (!isShellRequest(req.url, self.location.origin)) {
    return; // Pass data API calls directly to the network
  }

  event.respondWith(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.match(req).then(function (cached) {
        const network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});

if (typeof module !== 'undefined') module.exports = { isShellRequest };
