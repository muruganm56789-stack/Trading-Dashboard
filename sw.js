/**
 * sw.js — Signal Desk PWA service worker.
 *
 * Caching strategy is deliberately conservative given what this app shows: cache the APP
 * SHELL (the HTML/CSS/JS that render the page) so it loads instantly and works offline, but
 * NEVER cache API/data responses — a cached signal, price, or SL/TP level served while
 * offline would look identical to a live one, and acting on stale trading data is a real,
 * not theoretical, risk. If the data can't be fetched fresh, the page should show an error,
 * not a silently-stale number.
 */

const SHELL_CACHE = 'signal-desk-shell-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) { return cache.addAll(SHELL_FILES); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n !== SHELL_CACHE; }).map(function (n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

/** Decides whether a request is eligible for shell caching. Exported for testing. */
function isShellRequest(url, selfOrigin) {
  let u;
  try { u = new URL(url); } catch (e) { return false; }
  if (u.origin !== selfOrigin) return false; // cross-origin (the Apps Script data endpoint) — never
  // Only the app shell's own static files, never anything that looks like a data/API call.
  return /\.(html|css|js|json|png|svg|ico)$/.test(u.pathname) || u.pathname === '/' || u.pathname.endsWith('/');
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept anything but simple reads

  if (!isShellRequest(req.url, self.location.origin)) {
    return; // not the shell (includes the cross-origin data endpoint) — let it go straight to network, untouched
  }

  // Shell files: stale-while-revalidate — serve the cached version instantly if present, but
  // always fetch a fresh copy in the background to update the cache for next time.
  event.respondWith(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.match(req).then(function (cached) {
        const network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () { return cached; }); // offline and nothing fresh — fall back to cache
        return cached || network;
      });
    })
  );
});

if (typeof module !== 'undefined') module.exports = { isShellRequest };
