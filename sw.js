// ⚠️  Bump this version on every deploy to force cache refresh
const VERSION = 'levain-4a83d08';
const STATIC  = [
  './', './index.html', './manifest.json',
  './icon.svg', './favicon.svg', './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './favicon.ico',
];

// ── Install: cache all static files ──────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(STATIC))
  );
  self.skipWaiting(); // activate immediately, don't wait for old tabs to close
});

// ── Activate: delete old caches, claim all clients ───────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell all open tabs: new version is live
        self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
        );
      })
  );
});

// ── Fetch: network-first for HTML, cache-first for the rest ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHtml = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '';

  if (isHtml) {
    // Always try network first so new deploys are picked up immediately
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
