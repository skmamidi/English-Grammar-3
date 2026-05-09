const assert = require('node:assert/strict');
const test = require('node:test');

const {
  classifyOfflineCacheRequest,
  classifyQuotaError,
  createCacheMetadataRecord,
  evaluateOfflineCacheCleanup,
  normalizeOfflineCachePolicy
} = require('../assets/offline-cache-policy');

test('offline cache policy exposes deterministic priority defaults', () => {
  const policy = normalizeOfflineCachePolicy({
    maxBytes: 1024,
    maxPreloadChunks: 2,
    maxRetainedQuizChunks: 3
  });

  assert.equal(policy.maxBytes, 1024);
  assert.equal(policy.maxPreloadChunks, 2);
  assert.equal(policy.maxRetainedQuizChunks, 3);
  assert.ok(policy.priorities.appShell > policy.priorities.currentRequiredChunk);
  assert.ok(policy.priorities.currentRequiredChunk > policy.priorities.recentRequiredChunk);
  assert.ok(policy.priorities.recentRequiredChunk > policy.priorities.preloadChunk);
  assert.ok(policy.priorities.preloadChunk > policy.priorities.staleVersion);
});

test('offline cache cleanup evicts stale and preload chunks before required chunks', () => {
  const now = Date.parse('2026-04-30T12:00:00Z');
  const records = [
    record('/index.html', 'appShell', 500, now - 1000),
    record('/assets/question-chunks/grammar/current.js', 'currentRequiredChunk', 420, now - 1000),
    record('/assets/question-chunks/grammar/recent.js', 'recentRequiredChunk', 420, now - 2000),
    record('/assets/question-chunks/grammar/preload-old.js', 'preloadChunk', 300, now - 5000),
    record('/assets/question-chunks/grammar/preload-new.js', 'preloadChunk', 300, now - 1000),
    record('/assets/question-chunks/grammar/stale.js', 'staleVersion', 300, now - 20000)
  ];

  const result = evaluateOfflineCacheCleanup({
    records,
    now,
    activeCacheNames: ['grammarquest-static-live', 'grammarquest-chunks-live'],
    policy: {
      maxBytes: 1540,
      maxPreloadChunks: 1,
      maxRetainedQuizChunks: 2
    }
  });

  assert.deepEqual(result.evictions.map(item => item.url), [
    '/assets/question-chunks/grammar/stale.js',
    '/assets/question-chunks/grammar/preload-old.js',
    '/assets/question-chunks/grammar/preload-new.js'
  ]);
  assert.equal(result.metrics.evictedChunkCount, 3);
  assert.equal(result.metrics.staleCacheCleanupCount, 1);
  assert.equal(result.metrics.requiredCachedBytes, 840);
  assert.equal(result.metrics.preloadCachedBytes, 0);
  assert.equal(result.retained.some(item => item.priorityGroup === 'appShell'), true);
  assert.equal(result.retained.some(item => item.priorityGroup === 'currentRequiredChunk'), true);
});

test('offline cache cleanup tolerates corrupted metadata records', () => {
  const result = evaluateOfflineCacheCleanup({
    records: [
      null,
      { url: '', bytes: 'bad', priorityGroup: 'surprise' },
      record('/assets/question-chunks/grammar/preload.js', 'preloadChunk', 128, 1000)
    ],
    policy: { maxBytes: 64, maxPreloadChunks: 0 }
  });

  assert.deepEqual(result.evictions.map(item => item.url), ['/assets/question-chunks/grammar/preload.js']);
  assert.equal(result.metrics.corruptMetadataCount, 2);
});

test('offline cache request classification honors preload intent and current chunks', () => {
  assert.equal(
    classifyOfflineCacheRequest({
      url: 'https://grammar.test/assets/question-chunks/grammar/grammar-sentence-types.js',
      preload: true
    }).priorityGroup,
    'preloadChunk'
  );
  assert.equal(
    classifyOfflineCacheRequest({
      url: 'https://grammar.test/assets/question-chunks/grammar/grammar-sentence-types.js',
      requiredChunkUrls: ['/assets/question-chunks/grammar/grammar-sentence-types.js']
    }).priorityGroup,
    'currentRequiredChunk'
  );
  assert.equal(
    classifyOfflineCacheRequest({ url: 'https://grammar.test/assets/styles.css' }).priorityGroup,
    'appShell'
  );
  const sparse = classifyOfflineCacheRequest({ url: 'https://grammar.test/api/questions/sparse?refs=q1' });
  assert.equal(sparse.priorityGroup, 'questionObjectData');
  assert.equal(sparse.storageTarget, 'indexedDB');
  assert.equal(sparse.cacheApiDurable, false);
});

test('quota errors are classified without depending on browser quota behavior', () => {
  assert.equal(classifyQuotaError(new DOMException('full', 'QuotaExceededError')).code, 'quota_exceeded');
  assert.equal(classifyQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }).recoverable, true);
  assert.equal(classifyQuotaError(new Error('network failed')).code, 'cache_write_failed');
});

function record(url, priorityGroup, bytes, lastAccessedAt) {
  return createCacheMetadataRecord({
    url,
    cacheName: priorityGroup === 'appShell' ? 'grammarquest-static-live' : 'grammarquest-chunks-live',
    priorityGroup,
    bytes,
    lastAccessedAt,
    cachedAt: lastAccessedAt
  });
}
