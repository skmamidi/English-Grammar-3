const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildPlatformContentPackageManifest,
  validatePlatformContentPackageManifest
} = require('../assets/platform-content-package-contract');

const repoRoot = path.resolve(__dirname, '..');

test('platform content package manifest is versioned signature-ready cacheable and rollback-aware', () => {
  const manifest = buildPlatformContentPackageManifest({
    packageVersion: '2026.05.03-native-preview',
    minimumClientVersion: '1.0.0',
    compatibilityWindow: { min: '1.0.0', max: '1.x' },
    questionManifest: fakeQuestionManifest(),
    staticAssetManifest: fakeStaticAssetManifest(),
    frontendManifest: fakeFrontendManifest(),
    releaseManifest: fakeReleaseManifest(),
    localizationKeys: ['quiz.start', 'settings.privacy.title'],
    rollback: { packageId: 'pkg_previous', releaseId: 'rel_previous' },
    signature: { status: 'signature-ready', algorithm: 'ed25519', keyId: 'public-content-key-1' }
  });

  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.packageId, /^pkg_/);
  assert.equal(manifest.packageVersion, '2026.05.03-native-preview');
  assert.equal(manifest.questionManifest.sourceHash, `sha256:${'a'.repeat(64)}`);
  assert.deepEqual(manifest.questionManifest.sets.map(set => set.id), ['grammar-sentence-types']);
  assert.equal(manifest.questionManifest.sets[0].delivery.path, 'assets/question-chunks/grammar/grammar-sentence-types.js');
  assert.match(manifest.staticAssetManifest.hash, /^sha256:/);
  assert.equal(manifest.cache.policy, 'versioned-cacheable');
  assert.deepEqual(manifest.localization.keys, ['quiz.start', 'settings.privacy.title']);
  assert.equal(manifest.signature.status, 'signature-ready');
  assert.equal(manifest.rollback.packageId, 'pkg_previous');
  assert.deepEqual(validatePlatformContentPackageManifest(manifest).errors, []);
});

test('platform content package validation rejects stale hashes unsafe assets and unsupported clients', () => {
  const valid = buildPlatformContentPackageManifest({
    packageVersion: '2026.05.03-native-preview',
    minimumClientVersion: '1.0.0',
    compatibilityWindow: { min: '1.0.0', max: '1.x' },
    questionManifest: fakeQuestionManifest(),
    staticAssetManifest: fakeStaticAssetManifest(),
    frontendManifest: fakeFrontendManifest(),
    releaseManifest: fakeReleaseManifest(),
    rollback: { packageId: 'pkg_previous', releaseId: 'rel_previous' },
    signature: { status: 'signature-ready', algorithm: 'ed25519', keyId: 'public-content-key-1' }
  });

  assert.ok(validatePlatformContentPackageManifest(setPath(valid, ['questionManifest', 'sourceHash'], '')).errors.some(error => error.code === 'missing_question_manifest_source_hash'));
  assert.ok(validatePlatformContentPackageManifest(setPath(valid, ['questionManifest', 'sets', 0, 'delivery', 'sourceHash'], `sha256:${'b'.repeat(64)}`)).errors.some(error => error.code === 'stale_set_source_hash'));
  assert.ok(validatePlatformContentPackageManifest(setPath(valid, ['staticAssets', 0, 'path'], '../private/key.json')).errors.some(error => error.code === 'unsafe_asset_reference'));
  assert.ok(validatePlatformContentPackageManifest(setPath(valid, ['minimumClientVersion'], '0.9.0')).errors.some(error => error.code === 'unsupported_minimum_client_version'));
  assert.ok(validatePlatformContentPackageManifest(setPath(valid, ['rollback', 'packageId'], '')).errors.some(error => error.code === 'missing_rollback_pointer'));
  assert.ok(validatePlatformContentPackageManifest(setPath(valid, ['questionManifest', 'sets', 0, 'question'], 'raw prompt')).errors.some(error => error.code === 'payload_field_forbidden'));
});

test('platform content package docs and unit wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'platform-content-package.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /platform-neutral content and asset package/i);
  assert.match(docs, /question manifest identity/i);
  assert.match(docs, /static asset manifest/i);
  assert.match(docs, /service-worker/i);
  assert.match(docs, /deployment attestation/i);
  assert.match(docs, /native offline storage/i);
  assert.match(pkg.scripts['test:unit'], /tests\/platform-content-package-contract\.test\.js/);
});

function fakeQuestionManifest() {
  return {
    artifact: {
      sourceHash: `sha256:${'a'.repeat(64)}`,
      artifactSchemaVersion: 1
    },
    sets: [{
      id: 'grammar-sentence-types',
      title: 'Sentence Types',
      topic: 'Grammar',
      domain: 'grammar',
      questionCount: 2,
      chunkFile: 'assets/question-chunks/grammar/grammar-sentence-types.js',
      sourceHash: `sha256:${'a'.repeat(64)}`
    }]
  };
}

function fakeStaticAssetManifest() {
  return {
    schemaVersion: 1,
    strategy: 'static-asset-inventory',
    files: [{
      path: 'assets/icons/app.svg',
      type: 'icon',
      bytes: 128,
      sha256: 'c'.repeat(64),
      cacheCategory: 'critical-shell',
      dimensions: { width: 24, height: 24 }
    }],
    totals: { totalBytes: 128 }
  };
}

function fakeFrontendManifest() {
  return {
    schemaVersion: 1,
    strategy: 'native-esm-copy',
    generatedQuestionArtifactsBundled: false,
    files: [{ path: 'assets/build/app-entry.js', bytes: 10, sha256: 'd'.repeat(64) }]
  };
}

function fakeReleaseManifest() {
  return {
    releaseId: 'rel_current',
    appVersion: '1.0.0',
    questionManifestSourceHash: `sha256:${'a'.repeat(64)}`,
    serviceWorkerCacheVersion: 'gq-current',
    featureFlagConfigHash: `sha256:${'e'.repeat(64)}`
  };
}

function setPath(value, parts, replacement) {
  const clone = JSON.parse(JSON.stringify(value));
  let target = clone;
  parts.slice(0, -1).forEach(part => {
    target = target[part];
  });
  target[parts[parts.length - 1]] = replacement;
  return clone;
}
