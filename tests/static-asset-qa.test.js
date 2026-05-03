const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const staticAssets = require('../scripts/qa/static-asset-qa');
const requestMetrics = require('./helpers/request-metrics');

const repoRoot = path.resolve(__dirname, '..');

test('static asset QA fails oversized image fixtures with deterministic diagnostics', () => {
  const root = makeFixtureRoot();
  const imagePath = path.join(root, 'assets', 'images', 'hero.png');
  writeBytes(imagePath, 260 * 1024);

  const result = staticAssets.checkStaticAssets({
    root,
    metadataByPath: {
      'assets/images/hero.png': {
        cacheCategory: 'lazy-ui',
        dimensions: { width: 1200, height: 630 }
      }
    }
  });

  assert.ok(result.errors.some(error => error.code === 'asset_file_over_budget'));
  assert.ok(result.errors[0].path);
  assert.equal(JSON.stringify(result).includes(root), false, 'diagnostics should not depend on temp absolute paths');
});

test('static asset QA rejects unsupported extensions', () => {
  const root = makeFixtureRoot();
  writeBytes(path.join(root, 'assets', 'images', 'raw.bmp'), 1024);

  const result = staticAssets.checkStaticAssets({ root });

  assert.ok(result.errors.some(error => error.code === 'unsupported_asset_extension'));
});

test('static asset QA requires image dimensions and cache category', () => {
  const root = makeFixtureRoot();
  writeBytes(path.join(root, 'assets', 'images', 'card.webp'), 1024);

  const result = staticAssets.checkStaticAssets({ root });

  assert.ok(result.errors.some(error => error.code === 'missing_asset_dimensions'));
  assert.ok(result.errors.some(error => error.code === 'missing_cache_category'));
});

test('static asset manifest is deterministic and timestamp-free', () => {
  const root = makeFixtureRoot();
  writeBytes(path.join(root, 'assets', 'icons', 'app.svg'), 512);
  writeBytes(path.join(root, 'assets', 'fonts', 'ui.woff2'), 2048);

  const options = {
    root,
    metadataByPath: {
      'assets/icons/app.svg': {
        cacheCategory: 'critical-shell',
        dimensions: { width: 24, height: 24 }
      },
      'assets/fonts/ui.woff2': {
        cacheCategory: 'critical-shell',
        fallback: 'system-ui, sans-serif'
      }
    }
  };
  const first = staticAssets.buildStaticAssetManifest(options);
  const second = staticAssets.buildStaticAssetManifest(options);

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first).includes('generatedAt'), false);
  assert.deepEqual(first.files.map(file => file.path), ['assets/fonts/ui.woff2', 'assets/icons/app.svg']);
  assert.match(first.files[0].sha256, /^[a-f0-9]{64}$/);
});

test('live static asset inventory matches the checked-in manifest and budgets', () => {
  const result = staticAssets.checkStaticAssets({ root: repoRoot });
  const committed = JSON.parse(fs.readFileSync(path.join(repoRoot, 'assets', 'static-asset-manifest.json'), 'utf8'));

  assert.deepEqual(result.errors, []);
  assert.deepEqual(committed, result.manifest);
});

test('service worker critical shell cache stays within the static asset budget', () => {
  const result = staticAssets.evaluateServiceWorkerCriticalCache({ root: repoRoot });

  assert.deepEqual(result.errors, []);
  assert.ok(result.bytes > 0);
  assert.ok(result.urls.includes('/assets/styles.css'));
});

test('request metrics classify static images fonts and icons separately from question chunks', () => {
  const summary = requestMetrics.summarizeRequestMetrics({
    requests: [
      'http://127.0.0.1:4173/assets/images/hero.webp',
      'http://127.0.0.1:4173/assets/fonts/ui.woff2',
      'http://127.0.0.1:4173/assets/icons/app.svg',
      'http://127.0.0.1:4173/assets/question-chunks/grammar/grammar-sentence-types.js'
    ],
    responses: [
      { url: 'http://127.0.0.1:4173/assets/images/hero.webp', status: 200, bytes: 1000 },
      { url: 'http://127.0.0.1:4173/assets/fonts/ui.woff2', status: 200, bytes: 2000 },
      { url: 'http://127.0.0.1:4173/assets/icons/app.svg', status: 200, bytes: 300 },
      { url: 'http://127.0.0.1:4173/assets/question-chunks/grammar/grammar-sentence-types.js', status: 200, bytes: 4000 }
    ]
  });

  assert.deepEqual(summary.staticAssets, [
    'assets/fonts/ui.woff2',
    'assets/icons/app.svg',
    'assets/images/hero.webp'
  ]);
  assert.equal(summary.imageBytes, 1000);
  assert.equal(summary.fontBytes, 2000);
  assert.equal(summary.iconBytes, 300);
  assert.equal(summary.requiredChunkBytes, 4000);
});

test('static asset docs define design asset cache and preload policy', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'performance', 'static-assets.md'), 'utf8');

  [
    'critical-shell',
    'lazy-ui',
    'generated-content',
    'decorative'
  ].forEach(category => {
    assert.match(docs, new RegExp('`' + category + '`'), `static asset docs should define ${category}`);
  });

  assert.match(docs, /^## Preload Rules$/m);
  assert.match(docs, /critical-shell[\s\S]*service worker precache/i);
  assert.match(docs, /lazy-ui[\s\S]*not preload/i);
  assert.match(docs, /generated-content[\s\S]*question content/i);
  assert.match(docs, /decorative[\s\S]*must not be preloaded/i);
  assert.match(docs, /npm run qa:static-assets/);
  assert.match(docs, /npm run qa:app-shell/);
  assert.match(docs, /node --test tests\/service-worker-cache\.test\.js/);
  assert.match(docs, /generated question payloads remain separate/i);
});

function makeFixtureRoot() {
  return fs.mkdtempSync(path.join(repoRoot, 'test-results', 'static-asset-qa-'));
}

function writeBytes(filePath, bytes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.alloc(bytes, 1));
}
