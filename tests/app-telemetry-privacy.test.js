const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertAppTelemetryPrivacy,
  sanitizeAppTelemetryPayload
} = require('../assets/app-telemetry-privacy');

test('app telemetry privacy guard rejects learner content, stacks, query strings, and secrets', () => {
  [
    { learnerId: 'learner-1' },
    { route: '/quiz.html?student=secret' },
    { stack: 'raw stack' },
    { question: 'raw prompt' },
    { choices: ['A', 'B'] },
    { answer: 'A' },
    { explanation: 'Because...' },
    { storyBeats: [{ narrative: 'raw lesson body' }] },
    { guidedChecks: [{ answer: 'raw guided answer' }] },
    { authToken: 'secret' },
    { leaderboardParticipantRef: 'leaderboardParticipants/current' },
    { participantRef: 'leaderboardParticipants/current' },
    { rawLeaderboardId: 'periods/weekly/entries/learner-1' },
    { providerPayload: { raw: true } },
    { personalizationFeatureSnapshot: { learnerId: 'learner-1', questionText: 'raw question' } },
    { featureStoreProviderPayload: { vectorId: 'provider-vector' } },
    { learningExperimentAuditRecord: { learnerId: 'learner-1' } },
    { experimentProviderPayload: { token: 'secret' } },
    { rawExperimentOutcome: { questionText: 'raw question' } },
    { personalizationRolloutRawEvent: { learnerId: 'learner-1' } },
    { personalizationProviderDiagnostics: { vector: [1, 2, 3] } },
    { rawMission: { steps: [{ questionText: 'raw question' }] } },
    { missionProgressSnapshot: { learnerId: 'learner-1' } }
  ].forEach(payload => assert.throws(() => assertAppTelemetryPrivacy(payload), /unsafe_app_telemetry/));
});

test('app telemetry privacy sanitizer keeps safe operational fields', () => {
  const payload = sanitizeAppTelemetryPayload({
    type: 'route_load_failed',
    route: '/reports.html?student=secret',
    category: 'missing_state',
    leaderboardParticipantRef: 'leaderboardParticipants/current',
    rawMission: { steps: [{ questionText: 'raw question' }] },
    learningExperimentAuditRecord: { learnerId: 'learner-1' },
    experimentProviderPayload: { token: 'secret' },
    personalizationRolloutRawEvent: { learnerId: 'learner-1' },
    personalizationFeatureSnapshot: { snapshotRef: 'feature-snapshot:abc', learnerId: 'learner-1', questionText: 'raw question' },
    missionProgressSnapshot: { learnerId: 'learner-1' },
    lesson: { setId: 'grammar-sentence-types', grade: 4, storyBeats: [{ narrative: 'raw lesson body' }] },
    featureFlags: { telemetryEnabled: true, privateKeyRef: 'secret' }
  });

  assert.equal(payload.route, '/reports.html');
  assert.deepEqual(payload.lesson, { setId: 'grammar-sentence-types', grade: 4 });
  assert.equal(Object.hasOwn(payload, 'learningExperimentAuditRecord'), false);
  assert.equal(Object.hasOwn(payload, 'experimentProviderPayload'), false);
  assert.equal(Object.hasOwn(payload, 'personalizationRolloutRawEvent'), false);
  assert.equal(Object.hasOwn(payload, 'personalizationFeatureSnapshot'), false);
  assert.deepEqual(payload.featureFlags, { telemetryEnabled: true });
  assert.doesNotThrow(() => assertAppTelemetryPrivacy(payload));
});
