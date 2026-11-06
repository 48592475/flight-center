// Service worker de Flight Center: permite instalar la página como app.
// La página siempre se pide primero a la red (para tener los datos al día);
// si no hay conexión se muestra la última versión guardada.
const CACHE = 'flight-center-v2';
const BASE = ['./', 'manifest.webmanifest', 'icono-192.png?v=2', 'icono-512.png?v=2', 'apple-touch-icon.png', 'favicon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('./', copia)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  if (/\.(png|webmanifest)$/.test(url.pathname)) e.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
