/* StockPilot : toujours la dernière version en ligne, copie locale si pas de réseau */
const CACHE = 'stockpilot-20261005105645';
const ASSETS = ['./', 'index.html', 'app.js', 'style.css', 'logo-tunisie-silicone.png', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('version.json')) return;
  const key = r.mode === 'navigate' ? 'index.html' : r;
  const fresh = r.mode === 'navigate' || /\.(js|css|html)$/.test(u.pathname) && !u.pathname.includes('/vendor/');
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(key, { ignoreSearch: true });
    const net = fetch(r, { cache: 'no-cache' }).then(res => { if (res && res.ok) c.put(key, res.clone()); return res; });
    if (!fresh) return hit || net.catch(() => hit);
    /* toujours la dernière version quand le réseau répond (4 s max), sinon la copie locale */
    const timeout = new Promise(res => setTimeout(() => res(null), 4000));
    try { const res = await Promise.race([net, hit ? timeout : net]); if (res) return res; } catch (err) { /* hors ligne */ }
    return hit || net;
  }));
});
