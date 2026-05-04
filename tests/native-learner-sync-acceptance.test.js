const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildNativeLearnerSyncFixtures,
  runNativeLearnerSyncAcceptance,
  validateNativeLearnerSyncEnvelope
} = require('../assets/native-learner-sync-acceptance');
const {
  assertCrossPlatformCommercePrivacy
} = require('../assets/cross-platform-commerce-policy');
const { containsQuestionPayload } = require('../assets/learner-state-sync-domain');

const repoRoot = path.resolve(__dirname, '..');

test('web and future native clients round-trip the shared learner-state envelope', () => {
  const fixtures = buildNativeLearnerSyncFixtures({ now: '2030-04-29T12:00:00.000Z' });
  const result = runNativeLearnerSyncAcceptance(fixtures.webCurrent, fixtures.nativeOfflineCompletion, {
    now: () => '2030-04-29T12:05:00.000Z'
  });

  assert.equal(result.status, 'accepted');
  assert.equal(result.record.learnerId, 'learner-native-1');
  assert.equal(result.record.revision, 8);
  assert.equal(result.record.state.activeQuiz.questionRefs[0].id, 'grammar-sentence-types-q0002');
  assert.equal(result.record.state.reports.sessions[0].id, 'native-session-offline');
  assert.equal(result.record.state.assignments[0].status, 'completed');
  assert.equal(result.record.state.reviewSchedules[0].ref.id, 'grammar-sentence-types-q0001');
  assert.equal(result.record.state.learnerGoals.dailyQuestionTarget, 12);
  assert.equal(result.record.state.privacyPreferences.telemetryEnabled, false);
  assert.equal(result.record.state.entitlementProjection.accessState, 'premium');
  assert.ok(result.record.state.deletionTombstones.some(tombstone => tombstone.learnerId === 'learner-native-1'));
  assert.equal(containsQuestionPayload(result.record.state), false);
  assert.equal(JSON.stringify(result.record).includes('raw prompt'), false);
  assert.doesNotThrow(() => assertCrossPlatformCommercePrivacy(result.record.state.entitlementProjection));
});

test('native sync acceptance reports deterministic multi-device conflicts', () => {
  const fixtures = buildNativeLearnerSyncFixtures({ now: '2030-04-29T12:00:00.000Z' });
  const result = runNativeLearnerSyncAcceptance(fixtures.webCurrent, fixtures.nativeOfflineCompletion, {
    now: () => '2030-04-29T12:05:00.000Z'
  });
  const conflictTypes = result.conflicts.map(conflict => conflict.type).sort();

  assert.ok(conflictTypes.includes('active_quiz'));
  assert.ok(conflictTypes.includes('assignment'));
  assert.ok(conflictTypes.includes('record_revision'));
  assert.ok(conflictTypes.includes('review_schedule'));
});

test('stale native schema and corrupt deletion tombstones fail closed', () => {
  const fixtures = buildNativeLearnerSyncFixtures({ now: '2030-04-29T12:00:00.000Z' });

  assert.deepEqual(validateNativeLearnerSyncEnvelope(fixtures.staleNativeClient), ['native_schema_unsupported']);
  assert.ok(validateNativeLearnerSyncEnvelope({
    learnerId: 'learner-native-1',
    revision: 1,
    source: 'ios',
    state: { deletionTombstones: [{ learnerId: 'learner-native-1' }] }
  }).includes('deletion_tombstone_deleted_at_required'));
});

test('native sync acceptance docs and unit gate are wired', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'native-learner-sync-acceptance.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /native-ready learner sync/i);
  assert.match(docs, /multi-device conflict/i);
  assert.match(docs, /deletion tombstone/i);
  assert.match(docs, /entitlement projection/i);
  assert.match(pkg.scripts['test:unit'], /tests\/native-learner-sync-acceptance\.test\.js/);
});
