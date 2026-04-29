const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  CACHE_PREFIX,
  buildCacheNames,
  buildPrecacheUrls,
  getSourceHashCacheKey,
  isChunkRequest,
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
  assert.ok(urls.includes('/assets/question-loader.js'));
  assert.equal(urls.some(url => /\/assets\/question-banks\//.test(url)), false);
});

test('service worker routes generated chunks but never retired full banks', () => {
  assert.equal(isChunkRequest(new URL('https://example.test/assets/question-chunks/grammar/grammar-sentence-types.js')), true);
  assert.equal(isChunkRequest(new URL('https://example.test/assets/question-manifest.js')), false);
  assert.equal(isRetiredFullBankRequest(new URL('https://example.test/assets/question-banks/grammar.js')), true);
});

test('production HTML registers the service worker through the safe registration helper', () => {
  const index = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const registration = fs.readFileSync(path.join(repoRoot, 'assets', 'service-worker-registration.js'), 'utf8');
  const worker = fs.readFileSync(path.join(repoRoot, 'sw.js'), 'utf8');

  assert.match(index, /assets\/service-worker-registration\.js/);
  assert.match(registration, /navigator\.serviceWorker\.register/);
  assert.match(registration, /QUESTION_MANIFEST/);
  assert.match(worker, /service-worker-core\.js/);
});
