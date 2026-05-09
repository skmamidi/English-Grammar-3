const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  CACHE_PREFIX,
  buildCacheNames,
  buildPrecacheUrls,
  buildRuntimeStaticUrls,
  classifyServiceWorkerCacheRequest,
  createServiceWorkerCacheRecord,
  evaluateServiceWorkerCacheCleanup,
  getSourceHashCacheKey,
  isQuotaExceededError,
  isChunkRequest,
  isImmutableMediaRequest,
  isRetiredFullBankRequest
} = require('../assets/service-worker-core');

const repoRoot = path.resolve(__dirname, '..');

test('service worker cache names are derived from manifest source hash', () => {
  const names = buildCacheNames('sha256:abc123/+/=');

  assert.equal(names.static, `${CACHE_PREFIX}-static-sha256-abc123`);
  assert.equal(names.chunks, `${CACHE_PREFIX}-chunks-sha256-abc123`);
  assert.equal(getSourceHashCacheKey('sha256:abc123/+/='), 'sha256-abc123');
});

test('service worker precache avoids retired full-bank artifacts', () => {
  const urls = buildPrecacheUrls();

  assert.ok(urls.includes('/assets/design-tokens.css'));
  assert.ok(urls.includes('/assets/question-manifest.js'));
  assert.ok(urls.includes('/assets/question-preload-policy.js'));
  assert.ok(urls.includes('/assets/question-preloader.js'));
  assert.ok(urls.includes('/assets/question-loader.js'));
  assert.ok(urls.includes('/assets/session-domain.js'));
  assert.ok(urls.includes('/assets/learner-state-migration.js'));
  assert.equal(urls.some(url => /\/assets\/question-banks\//.test(url)), false);
});

test('service worker runtime cache includes guided mission route assets without precaching the catalog', () => {
  const precache = buildPrecacheUrls();
  const runtime = buildRuntimeStaticUrls();

  assert.equal(precache.includes('/assets/guided-mission-catalog.js'), false);
  assert.ok(runtime.includes('/mission.html'));
  assert.ok(runtime.includes('/assets/page-shell.js'));
  assert.ok(runtime.includes('/assets/guided-mission-catalog.js'));
  assert.ok(runtime.includes('/assets/guided-mission-domain.js'));
  assert.ok(runtime.includes('/assets/guided-mission-ui.js'));
});

test('service worker routes generated chunks but never retired full banks', () => {
  assert.equal(isChunkRequest(new URL('https://example.test/assets/question-chunks/grammar/grammar-sentence-types.js')), true);
  assert.equal(isChunkRequest(new URL('https://example.test/assets/question-manifest.js')), false);
  assert.equal(isRetiredFullBankRequest(new URL('https://example.test/assets/question-banks/grammar.js')), true);
});

test('service worker cache names include isolated metadata cache', () => {
  const names = buildCacheNames('sha256:abc123');

  assert.equal(names.metadata, `${CACHE_PREFIX}-metadata-sha256-abc123`);
});

test('service worker classifies sparse question JSON for IndexedDB instead of durable Cache API', () => {
  const sparse = classifyServiceWorkerCacheRequest({
    url: new URL('https://example.test/api/questions/sparse?refs=q1,q2')
  });
  const media = classifyServiceWorkerCacheRequest({
    url: new URL('https://example.test/assets/audio/spelling/immediately.wav')
  });

  assert.equal(sparse.priorityGroup, 'questionObjectData');
  assert.equal(sparse.storageTarget, 'indexedDB');
  assert.equal(sparse.cacheApiDurable, false);
  assert.equal(media.priorityGroup, 'immutableMedia');
  assert.equal(media.storageTarget, 'cacheAPI');
  assert.equal(isImmutableMediaRequest(new URL('https://example.test/assets/audio/spelling/immediately.wav')), true);
});

test('service worker classifies preload chunk intent separately from required chunks', () => {
  const preload = classifyServiceWorkerCacheRequest({
    url: new URL('https://example.test/assets/question-chunks/grammar/grammar-run-on-sentences.js'),
    request: { headers: new Map([['X-GrammarQuest-Cache-Intent', 'preload']]) }
  });
  const required = classifyServiceWorkerCacheRequest({
    url: new URL('https://example.test/assets/question-chunks/grammar/grammar-sentence-types.js')
  });

  assert.equal(preload.priorityGroup, 'preloadChunk');
  assert.equal(required.priorityGroup, 'currentRequiredChunk');
});

test('service worker cache cleanup keeps shell and required chunks ahead of preload chunks', () => {
  const now = Date.parse('2026-04-30T12:00:00Z');
  const cleanup = evaluateServiceWorkerCacheCleanup({
    records: [
      createServiceWorkerCacheRecord({ url: '/index.html', cacheName: 'grammarquest-static-a', priorityGroup: 'appShell', bytes: 512, cachedAt: now }),
      createServiceWorkerCacheRecord({ url: '/assets/question-chunks/grammar/current.js', cacheName: 'grammarquest-chunks-a', priorityGroup: 'currentRequiredChunk', bytes: 512, cachedAt: now }),
      createServiceWorkerCacheRecord({ url: '/assets/question-chunks/grammar/preload-1.js', cacheName: 'grammarquest-chunks-a', priorityGroup: 'preloadChunk', bytes: 256, cachedAt: now - 2000 }),
      createServiceWorkerCacheRecord({ url: '/assets/question-chunks/grammar/preload-2.js', cacheName: 'grammarquest-chunks-a', priorityGroup: 'preloadChunk', bytes: 256, cachedAt: now - 1000 })
    ],
    now,
    policy: { maxBytes: 1280, maxPreloadChunks: 1 }
  });

  assert.deepEqual(cleanup.evictions.map(record => record.url), ['/assets/question-chunks/grammar/preload-1.js']);
  assert.equal(cleanup.metrics.evictedChunkCount, 1);
  assert.equal(cleanup.metrics.requiredCachedBytes, 512);
  assert.equal(cleanup.metrics.preloadCachedBytes, 256);
});

test('service worker classifies quota errors as recoverable cache pressure', () => {
  assert.equal(isQuotaExceededError(new DOMException('full', 'QuotaExceededError')), true);
  assert.equal(isQuotaExceededError(new Error('network failed')), false);
});

test('production HTML registers the service worker through the safe registration helper', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const registration = fs.readFileSync(path.join(repoRoot, 'assets', 'service-worker-registration.js'), 'utf8');
  const worker = fs.readFileSync(path.join(repoRoot, 'sw.js'), 'utf8');

  assert.match(index, /assets\/service-worker-registration\.js/);
  assert.match(registration, /navigator\.serviceWorker\.register/);
  assert.match(registration, /QUESTION_MANIFEST/);
  assert.match(registration, /navigator\.storage\.estimate/);
  assert.match(registration, /GRAMMAR_QUEST_CACHE_QUOTA_EXCEEDED/);
  assert.match(worker, /service-worker-core\.js/);
  assert.match(worker, /offline-cache-policy\.js/);
  assert.match(worker, /runCacheCleanup/);
});
