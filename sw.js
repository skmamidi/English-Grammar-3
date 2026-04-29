importScripts('/assets/service-worker-core.js');

const core = self.GrammarQuestServiceWorkerCore;
const sourceHash = new URL(self.location.href).searchParams.get('sourceHash') || 'dev';
const cacheNames = core.buildCacheNames(sourceHash);
const managedCacheNames = new Set(Object.values(cacheNames));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheNames.static)
    .then(cache => cache.addAll(core.buildPrecacheUrls()))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(key => key.startsWith(`${core.CACHE_PREFIX}-`) && !managedCacheNames.has(key))
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (core.isRetiredFullBankRequest(url)) return;

  if (core.isChunkRequest(url)) {
    event.respondWith(cacheFirst(event.request, cacheNames.chunks));
    return;
  }

  if (core.isStaticAssetRequest(url)) {
    event.respondWith(staleWhileRevalidate(event.request, cacheNames.static));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, cacheNames.static));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('window.GRAMMAR_QUEST_OFFLINE_CHUNK_MISSING = true;', {
      status: 503,
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'X-GrammarQuest-Offline': 'chunk-missing'
      }
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || update;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || cache.match('/index.html') || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
