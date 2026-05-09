const assert = require('node:assert/strict');
const test = require('node:test');

const telemetry = require('../assets/mission-telemetry-policy');

test('mission telemetry policy is disabled until mission telemetry flag and consent are present', () => {
  assert.deepEqual(telemetry.evaluateMissionTelemetryPolicy({
    flags: { missionTelemetryEnabled: false },
    privacyPreferences: { telemetryEnabled: true }
  }), { enabled: false, reason: 'feature_flag_disabled' });

  assert.deepEqual(telemetry.evaluateMissionTelemetryPolicy({
    flags: { missionTelemetryEnabled: true },
    privacyPreferences: { telemetryEnabled: false }
  }), { enabled: false, reason: 'telemetry_consent_required' });

  assert.deepEqual(telemetry.evaluateMissionTelemetryPolicy({
    flags: { missionTelemetryEnabled: true },
    privacyPreferences: { telemetryEnabled: true },
    parentPreview: true
  }), { enabled: false, reason: 'parent_preview_read_only' });
});

test('mission telemetry normalizes only privacy-safe operational events', () => {
  const event = telemetry.normalizeMissionTelemetryEvent({
    type: 'mission_step_completed',
    route: '/mission.html?learnerId=secret',
    missionId: 'Mission Sentence Detectives!',
    stepId: 'lesson-intro',
    stepType: 'lesson',
    grade: 4,
    outcome: 'Completed',
    reasonCodes: ['offline_resume', 'raw answer shown', 'offline_resume'],
    durationSeconds: 93
  });

  assert.deepEqual(event, {
    schemaVersion: 1,
    type: 'mission_step_completed',
    route: '/mission.html',
    missionId: 'mission_sentence_detectives_',
    stepId: 'lesson-intro',
    stepType: 'lesson',
    grade: 4,
    outcome: 'completed',
    reasonCodes: ['offline_resume'],
    durationSeconds: 93,
    severity: 'info'
  });
  assert.doesNotThrow(() => telemetry.assertMissionTelemetryPrivacy(event));
});

test('mission telemetry supports rollout-critical lifecycle events without content payloads', () => {
  const events = [
    telemetry.normalizeMissionTelemetryEvent({
      type: 'mission_start',
      route: '/mission.html',
      missionId: 'mission-sentence-detectives',
      source: 'recommendation'
    }),
    telemetry.normalizeMissionTelemetryEvent({
      type: 'mission_step_completed',
      route: '/mission.html',
      missionId: 'mission-sentence-detectives',
      stepId: 'practice-core',
      stepType: 'practice',
      outcome: 'completed'
    }),
    telemetry.normalizeMissionTelemetryEvent({
      type: 'mission_recommendation_impression',
      route: '/dashboard.html',
      missionId: 'mission-sentence-detectives',
      source: 'weak_skill'
    }),
    telemetry.normalizeMissionTelemetryEvent({
      type: 'mission_assignment_open',
      route: '/mission.html',
      missionId: 'mission-sentence-detectives',
      assignmentScope: 'class'
    }),
    telemetry.normalizeMissionTelemetryEvent({
      type: 'mission_reminder_action',
      route: '/mission.html',
      missionId: 'mission-sentence-detectives',
      reminderChannel: 'in_app',
      outcome: 'opened'
    }),
    telemetry.normalizeMissionTelemetryEvent({
      type: 'mission_completion_outcome',
      route: '/mission.html',
      missionId: 'mission-sentence-detectives',
      outcome: 'server_authoritative',
      reasonCodes: ['reward_projected']
    })
  ];

  assert.deepEqual(events.map(event => event.type), telemetry.MISSION_TELEMETRY_TYPES);
  events.forEach(event => {
    assert.equal(JSON.stringify(event).includes('learner'), false);
    assert.doesNotThrow(() => telemetry.assertMissionTelemetryPrivacy(event));
  });
});

test('mission telemetry rejects unsafe learner, lesson, question, answer, and provider payloads', () => {
  [
    { type: 'mission_start', missionId: 'mission-a', learnerId: 'learner-1' },
    { type: 'mission_start', missionId: 'mission-a', question: 'What is the answer?' },
    { type: 'mission_start', missionId: 'mission-a', answerKey: ['a'] },
    { type: 'mission_start', missionId: 'mission-a', lessonBody: 'raw lesson' },
    { type: 'mission_start', missionId: 'mission-a', providerPayload: { raw: true } }
  ].forEach(payload => assert.throws(() => telemetry.assertMissionTelemetryPrivacy(payload), /unsafe_(mission|app)_telemetry/));
});
