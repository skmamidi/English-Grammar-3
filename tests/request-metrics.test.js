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
    'http://127.0.0.1:4173/assets/styles.css'
  ];
  const responses = [
    { url: requests[0], status: 200, bytes: 40 },
    { url: requests[1], status: 200, bytes: 900 },
    { url: requests[2], status: 200, bytes: 100 },
    { url: requests[3], status: 200, bytes: 300 }
  ];

  const metrics = summarizeRequestMetrics({ requests, responses });

  assert.equal(metrics.manifestBytes, 40);
  assert.equal(metrics.questionBankBytes, 900);
  assert.equal(metrics.questionChunkBytes, 100);
  assert.equal(metrics.questionPayloadBytes, 1040);
  assert.deepEqual(metrics.loadedFullBanks, ['assets/question-banks/grammar.js']);
  assert.deepEqual(metrics.loadedChunks, ['assets/question-chunks/capitalization/capitalization-proper-names-titles.js']);
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

test('normalizeAssetPath removes origins and query strings', () => {
  assert.equal(
    normalizeAssetPath('http://grammar.test/assets/question-manifest.js?v=1'),
    'assets/question-manifest.js'
  );
});
