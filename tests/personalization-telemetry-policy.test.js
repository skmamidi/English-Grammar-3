const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  assertPersonalizationTelemetryPrivacy,
  evaluatePersonalizationTelemetryPolicy,
  normalizePersonalizationRolloutEvent,
  summarizePersonalizationEvents
} = require('../assets/personalization-telemetry-policy');

const repoRoot = path.resolve(__dirname, '..');

test('personalization telemetry is disabled by default and requires consent flag', () => {
  assert.deepEqual(evaluatePersonalizationTelemetryPolicy({}), { enabled: false, reason: 'feature_flag_disabled' });
  assert.equal(evaluatePersonalizationTelemetryPolicy({
    featureFlags: { personalizationTelemetryEnabled: true },
    privacyPreferences: { telemetryEnabled: true },
    consent: { telemetry: true }
  }).enabled, true);
  assert.equal(evaluatePersonalizationTelemetryPolicy({
    featureFlags: { personalizationTelemetryEnabled: true },
    privacyPreferences: { telemetryEnabled: true },
    consent: { telemetry: true },
    parentPreview: true
  }).reason, 'parent_preview_denied');
});

test('rollout events normalize buckets and reject learner content provider payloads', () => {
  const event = normalizePersonalizationRolloutEvent({
    type: 'assembly_completed',
    policyVersion: 'dynamic-quiz-assembly/v1',
    fallbackReason: 'stale_verified_evidence',
    candidateCount: 37,
    selectedCount: 10,
    latencyMs: 83,
    payloadBytes: 4097,
    fairnessFlags: ['skill_starvation', 'grade_skew', 'learnerId'],
    learnerId: 'learner-unsafe',
    prompt: 'raw prompt',
    answerKey: 'A',
    providerPayload: { vector: [1, 2, 3] }
  });

  assert.equal(event.schemaVersion, 1);
  assert.equal(event.type, 'assembly_completed');
  assert.equal(event.candidateCountBucket, '25-49');
  assert.equal(event.selectedCountBucket, '10-19');
  assert.equal(event.latencyBucket, '50-99ms');
  assert.equal(event.payloadBucket, '4-8kb');
  assert.deepEqual(event.fairnessFlags, ['grade_skew', 'skill_starvation']);
  assert.doesNotThrow(() => assertPersonalizationTelemetryPrivacy(event));
  assert.equal(JSON.stringify(event).includes('learner-unsafe'), false);
  assert.equal(JSON.stringify(event).includes('raw prompt'), false);
});

test('aggregate summary groups fallback fairness latency and payload only', () => {
  const summary = summarizePersonalizationEvents([
    normalizePersonalizationRolloutEvent({ type: 'feature_store_read', policyVersion: 'personalization-feature-store/v1', candidateCount: 0, selectedCount: 0, latencyMs: 12, payloadBytes: 512 }),
    normalizePersonalizationRolloutEvent({ type: 'assembly_completed', policyVersion: 'dynamic-quiz-assembly/v1', fallbackReason: 'missing_personalization_snapshot', candidateCount: 100, selectedCount: 12, latencyMs: 140, payloadBytes: 9000, fairnessFlags: ['grade_skew'] }),
    normalizePersonalizationRolloutEvent({ type: 'experiment_assigned', policyVersion: 'learning-experiment/v1', candidateCount: 0, selectedCount: 0, latencyMs: 20, payloadBytes: 800 })
  ]);

  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.totalEvents, 3);
  assert.equal(summary.byType.assembly_completed, 1);
  assert.equal(summary.fallbackReasons.missing_personalization_snapshot, 1);
  assert.equal(summary.fairnessFlags.grade_skew, 1);
  assert.equal(summary.latencyBuckets['100-249ms'], 1);
  assert.equal(summary.payloadBuckets['8-16kb'], 1);
  assert.doesNotThrow(() => assertPersonalizationTelemetryPrivacy(summary));
});

test('personalization observability docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'personalization-observability.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /PersonalizationRolloutEvent/);
  assert.match(docs, /AssemblyHealthSummary/);
  assert.match(docs, /FallbackSummary/);
  assert.match(docs, /PersonalizationKillSwitch/);
  assert.match(pkg.scripts['test:unit'], /tests\/personalization-telemetry-policy\.test\.js/);
});
