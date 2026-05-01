const assert = require('node:assert/strict');
const test = require('node:test');

const {
  formatOfflineSmokeResourceErrors,
  isAllowedOfflineSmokeResourceNoise,
  isAppOwnedAsset
} = require('./helpers/offline-smoke-errors');

test('offline smoke allows only explicitly scoped browser-default resource noise', () => {
  assert.equal(isAllowedOfflineSmokeResourceNoise({ url: 'http://127.0.0.1:4193/favicon.ico', status: 404 }), true);
  assert.equal(isAllowedOfflineSmokeResourceNoise({ url: 'http://127.0.0.1:4193/favicon.ico?v=1', status: 404 }), true);
  assert.equal(isAllowedOfflineSmokeResourceNoise({ url: 'http://127.0.0.1:4193/assets/favicon.ico', status: 404 }), false);
});

test('offline smoke classifies app-owned resources as fatal assets', () => {
  assert.equal(isAppOwnedAsset('http://127.0.0.1:4193/assets/question-loader.js'), true);
  assert.equal(isAppOwnedAsset('http://127.0.0.1:4193/assets/question-chunks/grammar/grammar-sentence-types.js'), true);
  assert.equal(isAppOwnedAsset('http://127.0.0.1:4193/topics/grammar/subtopics/sentence-types.html'), true);
  assert.equal(isAppOwnedAsset('http://127.0.0.1:4193/reports.html'), true);
  assert.equal(isAppOwnedAsset('http://127.0.0.1:4193/favicon.ico'), false);
});

test('offline smoke reports exact fatal resource URLs and statuses', () => {
  const errors = formatOfflineSmokeResourceErrors([
    { url: 'http://127.0.0.1:4193/favicon.ico', status: 404 },
    { url: 'http://127.0.0.1:4193/assets/question-loader.js', status: 404 },
    { url: 'http://127.0.0.1:4193/assets/question-chunks/grammar/grammar-sentence-types.js', status: 404 }
  ]);

  assert.deepEqual(errors, [
    '404 http://127.0.0.1:4193/assets/question-loader.js',
    '404 http://127.0.0.1:4193/assets/question-chunks/grammar/grammar-sentence-types.js'
  ]);
});

test('offline smoke permits offline chunk failures only for expected fallback cases', () => {
  assert.deepEqual(formatOfflineSmokeResourceErrors([
    { url: 'http://127.0.0.1:4193/assets/question-chunks/grammar/grammar-run-on-sentences.js', status: 503 }
  ], { allowOfflineResourceErrors: true }), []);

  assert.deepEqual(formatOfflineSmokeResourceErrors([
    {
      url: 'http://127.0.0.1:4193/assets/question-chunks/grammar/grammar-run-on-sentences.js',
      failure: 'net::ERR_INTERNET_DISCONNECTED'
    }
  ], { allowOfflineResourceErrors: true }), []);

  assert.deepEqual(formatOfflineSmokeResourceErrors([
    { url: 'http://127.0.0.1:4193/assets/question-chunks/grammar/grammar-run-on-sentences.js', status: 503 }
  ]), [
    '503 http://127.0.0.1:4193/assets/question-chunks/grammar/grammar-run-on-sentences.js'
  ]);
});

test('offline smoke can ignore optional progressive-enhancement feature failures without weakening required assets', () => {
  assert.deepEqual(formatOfflineSmokeResourceErrors([
    { url: 'http://127.0.0.1:4193/assets/question-selection-telemetry.js', status: 404 },
    { url: 'http://127.0.0.1:4193/assets/question-preloader.js', status: 404 },
    { url: 'http://127.0.0.1:4193/assets/auth-service.js', status: 404 },
    { url: 'http://127.0.0.1:4193/assets/question-loader.js', status: 404 }
  ], { allowOptionalFeatureFailures: true }), [
    '404 http://127.0.0.1:4193/assets/question-loader.js'
  ]);
});
