/* StockPilot : démarrage instantané (copie locale de l'application, mise à jour en arrière-plan) */
const CACHE = 'stockpilot-20261003105739';
const ASSETS = ['./', 'index.html', 'app.js', 'style.css', 'logo-tunisie-silicone.png', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  const key = r.mode === 'navigate' ? 'index.html' : r;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(key, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res && res.ok) c.put(key, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
