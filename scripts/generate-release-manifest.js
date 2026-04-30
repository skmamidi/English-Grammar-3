#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const featureFlags = require('../assets/feature-flag-domain');

function buildReleaseManifest(options = {}) {
  const questionManifest = options.questionManifest || loadDefaultQuestionManifest();
  const normalizedFlags = featureFlags.normalizeFeatureFlags(options.featureFlags || {});
  const base = {
    appVersion: String(options.appVersion || process.env.npm_package_version || '0.0.0'),
    gitSha: String(options.gitSha || process.env.GITHUB_SHA || 'local'),
    generatedAt: String(options.generatedAt || new Date().toISOString()),
    questionManifestSourceHash: String(questionManifest.artifact && questionManifest.artifact.sourceHash || ''),
    questionManifestArtifactVersion: Number(questionManifest.artifact && questionManifest.artifact.artifactSchemaVersion) || 0,
    serviceWorkerCacheVersion: String(options.serviceWorkerCacheVersion || serviceWorkerCacheVersion(questionManifest)),
    chunkCount: Array.isArray(questionManifest.sets) ? questionManifest.sets.length : 0,
    workflowRunId: String(options.workflowRunId || process.env.GITHUB_RUN_ID || ''),
    featureFlagConfigHash: featureFlags.getFeatureFlagConfigHash(normalizedFlags)
  };
  base.releaseId = `rel_${hash([base.appVersion, base.gitSha, base.questionManifestSourceHash, base.featureFlagConfigHash].join('|')).slice(0, 16)}`;
  return base;
}

function buildPublicReleaseMetadata(manifest) {
  return {
    releaseId: manifest.releaseId,
    appVersion: manifest.appVersion,
    generatedAt: manifest.generatedAt,
    questionManifestSourceHash: manifest.questionManifestSourceHash,
    serviceWorkerCacheVersion: manifest.serviceWorkerCacheVersion,
    featureFlagConfigHash: manifest.featureFlagConfigHash
  };
}

function writeReleaseManifest(options = {}) {
  const manifest = buildReleaseManifest(options);
  const publicMetadata = buildPublicReleaseMetadata(manifest);
  const outputJson = options.outputJson || path.join(__dirname, '..', 'assets', 'release-manifest.json');
  const outputJs = options.outputJs || path.join(__dirname, '..', 'assets', 'release-manifest.js');
  fs.mkdirSync(path.dirname(outputJson), { recursive: true });
  fs.mkdirSync(path.dirname(outputJs), { recursive: true });
  fs.writeFileSync(outputJson, `${JSON.stringify(publicMetadata, null, 2)}\n`);
  fs.writeFileSync(outputJs, `window.GrammarQuestReleaseManifest = ${JSON.stringify(publicMetadata, null, 2)};\n`);
  return { manifest, publicMetadata, outputJson, outputJs };
}

function loadDefaultQuestionManifest() {
  return require('../assets/question-manifest.json');
}

function serviceWorkerCacheVersion(questionManifest) {
  const sourceHash = questionManifest.artifact && questionManifest.artifact.sourceHash || 'dev';
  return `gq-${sourceHash.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

if (require.main === module) {
  writeReleaseManifest({});
}

module.exports = {
  buildPublicReleaseMetadata,
  buildReleaseManifest,
  writeReleaseManifest
};
