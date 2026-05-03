#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const {
  buildDeploymentAttestation,
  validateDeploymentAttestation
} = require('../../assets/deployment-attestation');
const { buildReleaseManifest } = require('../generate-release-manifest');

const repoRoot = path.resolve(__dirname, '..', '..');

function runDeploymentAttestationQa(options = {}) {
  const questionManifest = readJson('assets/question-manifest.json');
  const frontendManifest = readJson('assets/build/frontend-manifest.json');
  const staticAssetManifest = readJson('assets/static-asset-manifest.json');
  const releaseManifest = buildReleaseManifest({
    appVersion: readJson('package.json').version,
    gitSha: options.commit || process.env.GITHUB_SHA || 'local',
    generatedAt: options.buildTimestamp || process.env.BUILD_TIMESTAMP || '1970-01-01T00:00:00.000Z',
    questionManifest,
    serviceWorkerCacheVersion: options.serviceWorkerCacheVersion,
    workflowRunId: process.env.GITHUB_RUN_ID || '',
    featureFlags: options.featureFlags || {}
  });
  const attestation = buildDeploymentAttestation({
    environment: options.environment || process.env.DEPLOYMENT_ENVIRONMENT || 'local',
    commit: options.commit || process.env.GITHUB_SHA || 'local',
    buildTimestamp: options.buildTimestamp || process.env.BUILD_TIMESTAMP || '1970-01-01T00:00:00.000Z',
    releaseManifest,
    questionManifest,
    frontendManifest,
    staticAssetManifest,
    providerConfigRevision: options.providerConfigRevision || process.env.PROVIDER_CONFIG_REVISION || 'local-disabled',
    validationEvidence: options.validationEvidence || [
      { command: 'npm run test:rules', status: 'passed', completedAt: '1970-01-01T00:00:00.000Z' },
      { command: 'npm run qa:staging-smoke -- --dry-run', status: 'passed', completedAt: '1970-01-01T00:00:00.000Z' }
    ],
    signer: options.signer || { mode: 'unsigned-public-metadata', activePublicKeyIds: [] },
    rollback: options.rollback || {
      releaseId: 'local-previous-release',
      serviceWorkerCacheVersion: 'local-previous-cache'
    }
  });
  const validation = validateDeploymentAttestation(attestation);

  return {
    ok: validation.ok,
    provider: 'local',
    environment: attestation.environment,
    releaseId: attestation.artifacts.releaseManifest.releaseId,
    questionManifestSourceHash: attestation.artifacts.questionManifest.sourceHash,
    serviceWorkerCacheVersion: attestation.config.serviceWorkerCacheVersion,
    featureFlagConfigHash: attestation.config.featureFlagConfigHash,
    providerConfigRevision: attestation.config.providerConfigRevision,
    attestationHash: validation.attestationHash,
    validationEvidenceCount: attestation.validationEvidence.length,
    errors: validation.errors
  };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

if (require.main === module) {
  const json = process.argv.includes('--json');
  const summary = runDeploymentAttestationQa({});
  if (json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    process.stdout.write(`Deployment attestation QA: ${summary.ok ? 'passed' : 'failed'}\n`);
    process.stdout.write(`Attestation hash: ${summary.attestationHash}\n`);
    if (summary.errors.length) process.stdout.write(`${JSON.stringify(summary.errors, null, 2)}\n`);
  }
  process.exitCode = summary.ok ? 0 : 1;
}

module.exports = {
  runDeploymentAttestationQa
};
