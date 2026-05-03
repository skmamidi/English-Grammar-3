#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const {
  buildExpectedStagingMetadata,
  validateStagingDeploymentSnapshot
} = require('../../assets/staging-deployment-smoke-policy');

const repoRoot = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (!dryRun) {
  console.error('qa:staging-smoke currently requires --dry-run unless a live staging fetcher is provided by a future PR.');
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tests/fixtures/staging-smoke/matching-snapshot.json'), 'utf8'));
const result = validateStagingDeploymentSnapshot(snapshot, buildExpectedStagingMetadata({ root: repoRoot }));

console.log(JSON.stringify({
  mode: 'dry-run',
  ok: result.ok,
  summary: result.summary,
  failures: result.failures
}, null, 2));

if (!result.ok) process.exitCode = 1;
