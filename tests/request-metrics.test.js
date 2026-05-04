const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeAssetPath,
  summarizeRequestMetrics
} = require('./helpers/request-metrics');

test('request metrics categorize manifest, full banks, and chunks', () => {
  const requests = [
    'http://127.0.0.1:4173/assets/question-manifest.js',
    'http://127.0.0.1:4173/assets/question-banks/grammar.js',
    'http://127.0.0.1:4173/assets/question-chunks/capitalization/capitalization-proper-names-titles.js',
    'http://127.0.0.1:4173/assets/story-lesson-chunks/grammar/grammar-sentence-types.js',
    'http://127.0.0.1:4173/assets/styles.css',
    'http://127.0.0.1:4173/assets/build/app-entry.js',
    'http://127.0.0.1:4173/sw.js',
    'http://127.0.0.1:4173/assets/build/frontend-manifest.json'
  ];
  const responses = [
    { url: requests[0], status: 200, bytes: 40 },
    { url: requests[1], status: 200, bytes: 900 },
    { url: requests[2], status: 200, bytes: 100 },
    { url: requests[3], status: 200, bytes: 80 },
    { url: requests[4], status: 200, bytes: 300 },
    { url: requests[5], status: 200, bytes: 200 },
    { url: requests[6], status: 200, bytes: 90 },
    { url: requests[7], status: 200, bytes: 30 }
  ];

  const metrics = summarizeRequestMetrics({ requests, responses });

  assert.equal(metrics.manifestBytes, 40);
  assert.equal(metrics.questionBankBytes, 900);
  assert.equal(metrics.questionChunkBytes, 100);
  assert.equal(metrics.storyLessonChunkBytes, 80);
  assert.equal(metrics.questionPayloadBytes, 1040);
  assert.equal(metrics.lessonPayloadBytes, 80);
  assert.equal(metrics.appShellCssBytes, 300);
  assert.equal(metrics.appShellJsBytes, 200);
  assert.equal(metrics.serviceWorkerBytes, 90);
  assert.equal(metrics.releaseMetadataBytes, 30);
  assert.equal(metrics.appShellBytes, 620);
  assert.deepEqual(metrics.loadedFullBanks, ['assets/question-banks/grammar.js']);
  assert.deepEqual(metrics.loadedChunks, ['assets/question-chunks/capitalization/capitalization-proper-names-titles.js']);
  assert.deepEqual(metrics.loadedLessonChunks, ['assets/story-lesson-chunks/grammar/grammar-sentence-types.js']);
  assert.deepEqual(metrics.appShellAssets, [
    'assets/build/app-entry.js',
    'assets/build/frontend-manifest.json',
    'assets/styles.css',
    'sw.js'
  ]);
});

test('request metrics count each delivery asset once', () => {
  const chunkUrl = 'http://127.0.0.1:4173/assets/question-chunks/reference-skills/reference-skills-alphabetical-order.js';
  const metrics = summarizeRequestMetrics({
    requests: [chunkUrl, chunkUrl],
    responses: [
      { url: chunkUrl, status: 200, bytes: 64000 },
      { url: chunkUrl, status: 304, bytes: 0 }
    ]
  });

  assert.deepEqual(metrics.loadedChunks, ['assets/question-chunks/reference-skills/reference-skills-alphabetical-order.js']);
  assert.equal(metrics.questionChunkBytes, 64000);
});

test('request metrics separate preload chunks from required chunk payload', () => {
  const required = 'http://127.0.0.1:4173/assets/question-chunks/grammar/grammar-sentence-types.js';
  const preload = 'http://127.0.0.1:4173/assets/question-chunks/grammar/grammar-run-on-sentences.js';
  const metrics = summarizeRequestMetrics({
    requests: [required, preload],
    preloadRequests: [preload],
    responses: [
      { url: required, status: 200, bytes: 58000 },
      { url: preload, status: 200, bytes: 64000 }
    ]
  });

  assert.deepEqual(metrics.loadedChunks, ['assets/question-chunks/grammar/grammar-sentence-types.js']);
  assert.deepEqual(metrics.preloadedChunks, ['assets/question-chunks/grammar/grammar-run-on-sentences.js']);
  assert.equal(metrics.questionChunkBytes, 58000);
  assert.equal(metrics.preloadChunkBytes, 64000);
  assert.equal(metrics.requiredCachedBytes, 58000);
  assert.equal(metrics.preloadCachedBytes, 64000);
  assert.equal(metrics.evictedChunkCount, 0);
  assert.equal(metrics.staleCacheCleanupCount, 0);
  assert.equal(metrics.questionPayloadBytes, metrics.manifestBytes + metrics.questionBankBytes + metrics.questionChunkBytes);
});

test('request metrics keep generated lesson artifacts separate from shell and question payloads', () => {
  const lessonManifest = 'http://127.0.0.1:4173/assets/story-lesson-manifest.js';
  const lessonChunk = 'http://127.0.0.1:4173/assets/story-lesson-chunks/vocabulary/vocabulary-homophones.js';
  const questionChunk = 'http://127.0.0.1:4173/assets/question-chunks/vocabulary/vocabulary-homophones.js';
  const metrics = summarizeRequestMetrics({
    requests: [lessonManifest, lessonChunk, questionChunk],
    responses: [
      { url: lessonManifest, status: 200, bytes: 54000 },
      { url: lessonChunk, status: 200, bytes: 6200 },
      { url: questionChunk, status: 200, bytes: 58000 }
    ]
  });

  assert.equal(metrics.lessonPayloadBytes, 60200);
  assert.equal(metrics.questionPayloadBytes, 58000);
  assert.equal(metrics.appShellBytes, 0);
  assert.deepEqual(metrics.loadedLessonChunks, ['assets/story-lesson-chunks/vocabulary/vocabulary-homophones.js']);
  assert.deepEqual(metrics.lessonManifestRequests, ['assets/story-lesson-manifest.js']);
});

test('request metrics include offline cache policy telemetry counters', () => {
  const metrics = summarizeRequestMetrics({
    cacheEvents: [
      {
        type: 'grammarquest:offline-cache-cleanup',
        detail: {
          requiredCachedBytes: 120000,
          preloadCachedBytes: 64000,
          evictedChunkCount: 2,
          staleCacheCleanupCount: 1
        }
      },
      {
        detail: {
          requiredCachedBytes: 8000,
          evictedChunkCount: 1
        }
      }
    ]
  });

  assert.equal(metrics.requiredCachedBytes, 128000);
  assert.equal(metrics.preloadCachedBytes, 64000);
  assert.equal(metrics.evictedChunkCount, 3);
  assert.equal(metrics.staleCacheCleanupCount, 1);
});

test('normalizeAssetPath removes origins and query strings', () => {
  assert.equal(
    normalizeAssetPath('http://grammar.test/assets/question-manifest.js?v=1'),
    'assets/question-manifest.js'
  );
});
