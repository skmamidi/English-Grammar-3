importScripts('/assets/offline-cache-policy.js');
importScripts('/assets/service-worker-core.js');

const core = self.GrammarQuestServiceWorkerCore;
const sourceHash = new URL(self.location.href).searchParams.get('sourceHash') || 'dev';
const cacheNames = core.buildCacheNames(sourceHash);
const managedCacheNames = new Set(Object.values(cacheNames));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheNames.static)
    .then(cache => cache.addAll(core.buildPrecacheUrls()))
    .then(recordPrecachedShell)
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(runCacheCleanup()
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (core.isRetiredFullBankRequest(url)) return;

  if (core.isChunkRequest(url)) {
    event.respondWith(cacheFirst(event.request, cacheNames.chunks, url));
    return;
  }

  if (core.isStaticAssetRequest(url)) {
    event.respondWith(staleWhileRevalidate(event.request, cacheNames.static, url));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, cacheNames.static, url));
  }
});

async function cacheFirst(request, cacheName, url) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    await touchCacheRecord(request.url);
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) await putWithPolicy(cache, request, response.clone(), cacheName, url);
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

async function staleWhileRevalidate(request, cacheName, url) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then(response => {
      if (response && response.ok) putWithPolicy(cache, request, response.clone(), cacheName, url);
      return response;
    })
    .catch(() => null);
  if (cached) await touchCacheRecord(request.url);
  return cached || update;
}

async function networkFirst(request, cacheName, url) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) await putWithPolicy(cache, request, response.clone(), cacheName, url);
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || cache.match('/index.html') || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function putWithPolicy(cache, request, response, cacheName, url) {
  try {
    await cache.put(request, response.clone());
    await writeCacheRecord(request.url, cacheName, response, core.classifyServiceWorkerCacheRequest({
      url,
      request
    }).priorityGroup);
    await runCacheCleanup();
  } catch (error) {
    if (core.isQuotaExceededError(error)) {
      await notifyClients({
        type: 'GRAMMAR_QUEST_CACHE_STATUS',
        status: 'quota_exceeded',
        recoverable: true
      });
      await runCacheCleanup({ quotaExceeded: true });
      return;
    }
    throw error;
  }
}

async function recordPrecachedShell() {
  const cache = await caches.open(cacheNames.static);
  await Promise.all(core.buildPrecacheUrls().map(async url => {
    const response = await cache.match(url);
    if (response) await writeCacheRecord(new URL(url, self.location.origin).href, cacheNames.static, response, 'appShell');
  }));
  await runCacheCleanup();
}

async function writeCacheRecord(url, cacheName, response, priorityGroup) {
  const metadata = await readCacheMetadata();
  metadata.records = metadata.records.filter(record => record && record.url !== url);
  metadata.records.push(core.createServiceWorkerCacheRecord({
    url: new URL(url, self.location.origin).pathname,
    cacheName,
    priorityGroup,
    bytes: await estimateResponseBytes(response),
    cachedAt: Date.now(),
    lastAccessedAt: Date.now(),
    sourceHash
  }));
  await writeCacheMetadata(metadata);
}

async function touchCacheRecord(url) {
  const metadata = await readCacheMetadata();
  const path = new URL(url, self.location.origin).pathname;
  let changed = false;
  metadata.records = metadata.records.map(record => {
    if (record && record.url === path) {
      changed = true;
      return Object.assign({}, record, { lastAccessedAt: Date.now() });
    }
    return record;
  });
  if (changed) await writeCacheMetadata(metadata);
}

async function runCacheCleanup() {
  const keys = await caches.keys();
  await Promise.all(keys
    .filter(key => key.startsWith(`${core.CACHE_PREFIX}-`) && !managedCacheNames.has(key))
    .map(key => caches.delete(key)));

  const metadata = await readCacheMetadata();
  const cleanup = core.evaluateServiceWorkerCacheCleanup({
    records: metadata.records,
    activeCacheNames: Array.from(managedCacheNames),
    now: Date.now()
  });
  await Promise.all(cleanup.evictions.map(deleteCacheRecord));
  await writeCacheMetadata({ records: cleanup.retained });
  await notifyClients(Object.assign({
    type: 'GRAMMAR_QUEST_CACHE_STATUS',
    status: 'cleanup_complete'
  }, cleanup.metrics));
  return cleanup;
}

async function deleteCacheRecord(record) {
  if (!record || !record.cacheName || !record.url) return;
  const cache = await caches.open(record.cacheName);
  await cache.delete(record.url);
}

async function readCacheMetadata() {
  try {
    const cache = await caches.open(cacheNames.metadata);
    const response = await cache.match('/__grammarquest_cache_metadata__');
    if (!response) return { records: [] };
    const payload = await response.json();
    return {
      records: Array.isArray(payload.records) ? payload.records : []
    };
  } catch (error) {
    return { records: [] };
  }
}

async function writeCacheMetadata(metadata) {
  const cache = await caches.open(cacheNames.metadata);
  await cache.put('/__grammarquest_cache_metadata__', new Response(JSON.stringify({
    records: Array.isArray(metadata.records) ? metadata.records : []
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }));
}

async function estimateResponseBytes(response) {
  const header = response && response.headers && response.headers.get('content-length');
  const headerBytes = Number(header) || 0;
  if (headerBytes > 0) return headerBytes;
  try {
    const blob = await response.clone().blob();
    return blob && Number(blob.size) || 0;
  } catch (error) {
    return 0;
  }
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}
