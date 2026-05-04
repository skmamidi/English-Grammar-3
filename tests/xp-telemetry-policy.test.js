const assert = require('node:assert/strict');
const test = require('node:test');

const telemetry = require('../assets/xp-telemetry-policy');

test('XP telemetry policy is disabled by default and requires explicit consent flag', () => {
  assert.equal(telemetry.evaluateXpTelemetryPolicy({}).enabled, false);
  assert.equal(telemetry.evaluateXpTelemetryPolicy({
    flags: { xpTelemetryEnabled: true },
    privacyPreferences: { telemetryEnabled: true }
  }).enabled, true);
});

test('XP and leaderboard telemetry events normalize to privacy-safe operational fields', () => {
  const event = telemetry.normalizeXpTelemetryEvent({
    type: 'xp_award_outcome',
    route: '/quiz.html?learnerId=secret',
    outcome: 'awarded',
    awardedXp: 33,
    eligibilityReasons: ['repeat_attempt'],
    learnerId: 'learner-1',
    question: 'raw prompt',
    answer: 'A',
    leaderboardParticipantRef: 'leaderboardParticipants/current'
  });

  assert.deepEqual(event, {
    schemaVersion: 1,
    type: 'xp_award_outcome',
    route: '/quiz.html',
    outcome: 'awarded',
    awardedXp: 33,
    periodType: '',
    reasonCodes: ['repeat_attempt'],
    severity: 'info'
  });
  assert.equal(JSON.stringify(event).includes('learner-1'), false);
  assert.equal(JSON.stringify(event).includes('raw prompt'), false);
  assert.equal(JSON.stringify(event).includes('leaderboardParticipants'), false);
  assert.doesNotThrow(() => telemetry.assertXpTelemetryPrivacy(event));
});

test('XP telemetry accepts reconciliation leaderboard read and materialization health events', () => {
  const events = [
    telemetry.normalizeXpTelemetryEvent({ type: 'xp_sync_reconciliation', outcome: 'duplicate', queueState: 'duplicate' }),
    telemetry.normalizeXpTelemetryEvent({ type: 'leaderboard_read', periodType: 'weekly', topCount: 50, ownRankVisible: true }),
    telemetry.normalizeXpTelemetryEvent({ type: 'leaderboard_materialization_health', periodType: 'monthly', outcome: 'late', materializedCount: 100 })
  ];

  assert.deepEqual(events.map(event => event.type), [
    'xp_sync_reconciliation',
    'leaderboard_read',
    'leaderboard_materialization_health'
  ]);
  events.forEach(event => assert.doesNotThrow(() => telemetry.assertXpTelemetryPrivacy(event)));
});
