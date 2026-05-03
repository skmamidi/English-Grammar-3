const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const {
  buildDeploymentAttestation,
  validateDeploymentAttestation
} = require('../assets/deployment-attestation');
const { buildReleaseManifest } = require('../scripts/generate-release-manifest');

const repoRoot = path.resolve(__dirname, '..');

test('deployment attestation captures public-safe artifact identities', () => {
  const questionManifest = fakeQuestionManifest(`sha256:${'c'.repeat(64)}`);
  const releaseManifest = buildReleaseManifest({
    appVersion: '1.2.3',
    gitSha: 'abc123',
    generatedAt: '2030-04-29T12:00:00.000Z',
    questionManifest,
    serviceWorkerCacheVersion: 'gq-question-source',
    workflowRunId: 'run-1',
    featureFlags: { serverSelectionEnabled: true }
  });
  const attestation = buildDeploymentAttestation({
    environment: 'staging',
    commit: 'abc123',
    buildTimestamp: '2030-04-29T12:05:00.000Z',
    releaseManifest,
    questionManifest,
    frontendManifest: fakeFrontendManifest(),
    staticAssetManifest: fakeStaticAssetManifest(),
    providerConfigRevision: 'provider-config-2026-05-03',
    validationEvidence: [
      { command: 'npm run test:rules', status: 'passed', completedAt: '2030-04-29T12:06:00.000Z' },
      { command: 'npm run qa:staging-smoke -- --dry-run', status: 'passed', completedAt: '2030-04-29T12:07:00.000Z' }
    ],
    signer: { mode: 'public-key-only', activePublicKeyIds: ['selection-key-1'] },
    rollback: { releaseId: 'rel_previous', serviceWorkerCacheVersion: 'gq-previous' }
  });

  assert.equal(attestation.schemaVersion, 1);
  assert.equal(attestation.environment, 'staging');
  assert.equal(attestation.commit, 'abc123');
  assert.equal(attestation.artifacts.releaseManifest.releaseId, releaseManifest.releaseId);
  assert.equal(attestation.artifacts.questionManifest.sourceHash, `sha256:${'c'.repeat(64)}`);
  assert.match(attestation.artifacts.frontendManifest.hash, /^sha256:/);
  assert.match(attestation.artifacts.staticAssetManifest.hash, /^sha256:/);
  assert.equal(attestation.config.featureFlagConfigHash, releaseManifest.featureFlagConfigHash);
  assert.equal(attestation.config.providerConfigRevision, 'provider-config-2026-05-03');
  assert.deepEqual(validateDeploymentAttestation(attestation).errors, []);
  assert.equal(JSON.stringify(attestation).includes('privateKey'), false);
});

test('deployment attestation validation rejects stale incomplete and unsafe records', () => {
  const questionManifest = fakeQuestionManifest(`sha256:${'c'.repeat(64)}`);
  const valid = buildDeploymentAttestation({
    environment: 'staging',
    commit: 'abc123',
    buildTimestamp: '2030-04-29T12:05:00.000Z',
    releaseManifest: buildReleaseManifest({
      appVersion: '1.2.3',
      gitSha: 'abc123',
      generatedAt: '2030-04-29T12:00:00.000Z',
      questionManifest,
      serviceWorkerCacheVersion: 'gq-question-source',
      featureFlags: {}
    }),
    questionManifest,
    frontendManifest: fakeFrontendManifest(),
    staticAssetManifest: fakeStaticAssetManifest(),
    providerConfigRevision: 'provider-config-2026-05-03',
    validationEvidence: [{ command: 'npm run test:rules', status: 'passed', completedAt: '2030-04-29T12:06:00.000Z' }],
    signer: { mode: 'public-key-only', activePublicKeyIds: ['selection-key-1'] },
    rollback: { releaseId: 'rel_previous', serviceWorkerCacheVersion: 'gq-previous' }
  });

  assert.ok(validateDeploymentAttestation(Object.assign({}, valid, { commit: '' })).errors.some(error => error.code === 'missing_commit'));
  assert.ok(validateDeploymentAttestation(setPath(valid, ['artifacts', 'releaseManifest', 'questionManifestSourceHash'], 'sha256:stale')).errors.some(error => error.code === 'question_manifest_source_hash_mismatch'));
  assert.ok(validateDeploymentAttestation(setPath(valid, ['artifacts', 'releaseManifest', 'serviceWorkerCacheVersion'], 'gq-stale')).errors.some(error => error.code === 'service_worker_cache_version_mismatch'));
  assert.ok(validateDeploymentAttestation(setPath(valid, ['config', 'featureFlagConfigHash'], 'sha256:stale')).errors.some(error => error.code === 'feature_flag_config_hash_mismatch'));
  assert.ok(validateDeploymentAttestation(setPath(valid, ['validationEvidence', 0, 'rawEnv'], 'PRIVATE_KEY=value')).errors.some(error => error.code === 'secret_like_field'));
});

test('deployment attestation CLI emits a sanitized local validation summary', () => {
  const result = spawnSync(process.execPath, ['scripts/qa/deployment-attestation.js', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.provider, 'local');
  assert.match(summary.attestationHash, /^sha256:/);
  assert.equal(JSON.stringify(summary).includes('PRIVATE_KEY'), false);
});

test('deployment attestation docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'deployment-attestation.md'), 'utf8');
  const rollbackDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'release-and-rollback.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /npm run qa:deployment-attestation/);
  assert.match(docs, /release manifest/i);
  assert.match(docs, /service-worker cache version/i);
  assert.match(docs, /provider config revision/i);
  assert.match(docs, /secret-free/i);
  assert.match(rollbackDocs, /deployment attestation/i);
  assert.match(checklist, /qa:deployment-attestation/);
  assert.equal(pkg.scripts['qa:deployment-attestation'], 'node scripts/qa/deployment-attestation.js');
  assert.match(pkg.scripts['test:unit'], /tests\/deployment-attestation\.test\.js/);
});

function fakeQuestionManifest(sourceHash) {
  return {
    artifact: { sourceHash, artifactSchemaVersion: 1 },
    sets: [{ id: 'grammar-sentence-types' }]
  };
}

function fakeFrontendManifest() {
  return {
    schemaVersion: 1,
    strategy: 'native-esm-copy',
    generatedQuestionArtifactsBundled: false,
    entrypoints: ['assets/build/app-entry.js'],
    files: [{ path: 'assets/build/app-entry.js', bytes: 10, sha256: 'a'.repeat(64) }]
  };
}

function fakeStaticAssetManifest() {
  return {
    schemaVersion: 1,
    strategy: 'static-asset-inventory',
    files: [{ path: 'assets/icons/app.svg', type: 'icon', bytes: 10, sha256: 'b'.repeat(64), cacheCategory: 'critical-shell' }],
    totals: { totalBytes: 10, imageBytes: 0, iconBytes: 10, fontBytes: 0 }
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
