const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildReleaseManifest,
  buildPublicReleaseMetadata,
  writeReleaseManifest
} = require('../scripts/generate-release-manifest');

test('release manifest is deterministic and excludes secrets', () => {
  const manifest = buildReleaseManifest({
    appVersion: '1.0.0',
    gitSha: 'abc123',
    generatedAt: '2030-04-29T12:00:00.000Z',
    questionManifest: {
      artifact: { sourceHash: 'sha256:source', artifactSchemaVersion: 1 },
      sets: [{ id: 'one' }, { id: 'two' }]
    },
    serviceWorkerCacheVersion: 'gq-static-source',
    workflowRunId: 'run-1',
    featureFlags: { preloadingEnabled: true, privateKeyRef: 'secret' }
  });

  assert.equal(manifest.questionManifestSourceHash, 'sha256:source');
  assert.equal(manifest.chunkCount, 2);
  assert.match(manifest.featureFlagConfigHash, /^sha256:/);
  assert.equal(JSON.stringify(manifest).includes('secret'), false);

  const publicMetadata = buildPublicReleaseMetadata(manifest);
  assert.deepEqual(Object.keys(publicMetadata).sort(), [
    'appVersion',
    'featureFlagConfigHash',
    'generatedAt',
    'questionManifestSourceHash',
    'releaseId',
    'serviceWorkerCacheVersion'
  ].sort());
});

test('release manifest writer emits JSON and browser metadata', () => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, '..', 'test-results', 'release-manifest-'));
  const result = writeReleaseManifest({
    outputJson: path.join(tmpDir, 'release-manifest.json'),
    outputJs: path.join(tmpDir, 'release-manifest.js'),
    appVersion: '1.0.0',
    gitSha: 'abc123',
    generatedAt: '2030-04-29T12:00:00.000Z',
    questionManifest: { artifact: { sourceHash: 'sha256:source', artifactSchemaVersion: 1 }, sets: [] },
    serviceWorkerCacheVersion: 'gq-static-source',
    featureFlags: {}
  });

  assert.equal(fs.existsSync(result.outputJson), true);
  assert.equal(fs.existsSync(result.outputJs), true);
  assert.match(fs.readFileSync(result.outputJs, 'utf8'), /GrammarQuestReleaseManifest/);
});
