/* NEXUS service worker - v1.7 */
const CACHE = 'nexus-v1.7';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Hashed build assets: cache-first (immutable)
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.open(CACHE).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; })))
    );
    return;
  }
  // Everything else (HTML, manifest, icons): network-first, fall back to cache offline
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('/ajer-console/')))
  );
});
