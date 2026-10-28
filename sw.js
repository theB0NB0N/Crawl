const CACHE = 'crawl-v2';
const ASSETS = ['./','index.html','style.css','manifest.webmanifest','src/main.js','src/dice.js','src/state.js','src/map.js','src/loot.js','src/achievements.js','src/parser.js','src/prompt.js','src/openrouter.js','src/engine.js','src/debug.js','src/data.js','data/classes.json','data/achievements.json','data/items.json','data/floor-1.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('openrouter.ai')) return;
  // network first so updates show up, cache as offline fallback
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
