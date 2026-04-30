const assert = require('node:assert/strict');
const test = require('node:test');

const privacy = require('../assets/privacy-preferences-domain');

test('privacy preferences default telemetry and experiments to disabled', () => {
  assert.deepEqual(privacy.normalizePrivacyPreferences(), {
    schemaVersion: 1,
    telemetryEnabled: false,
    errorTelemetryEnabled: false,
    performanceTelemetryEnabled: false,
    experimentParticipationEnabled: false,
    updatedAt: '',
    updatedBy: '',
    policyVersion: 1
  });
});

test('privacy preferences normalize invalid values to safest disabled state', () => {
  const normalized = privacy.normalizePrivacyPreferences({
    telemetryEnabled: 'yes',
    errorTelemetryEnabled: 1,
    performanceTelemetryEnabled: true,
    experimentParticipationEnabled: true,
    updatedAt: 'not a date',
    updatedBy: ' learner-1 ',
    policyVersion: '2'
  });

  assert.equal(normalized.telemetryEnabled, false);
  assert.equal(normalized.errorTelemetryEnabled, false);
  assert.equal(normalized.performanceTelemetryEnabled, false);
  assert.equal(normalized.experimentParticipationEnabled, false);
  assert.equal(normalized.updatedAt, '');
  assert.equal(normalized.updatedBy, 'learner-1');
  assert.equal(normalized.policyVersion, 2);
});

test('global opt-out disables every telemetry preference immediately', () => {
  const normalized = privacy.normalizePrivacyPreferences({
    telemetryEnabled: true,
    errorTelemetryEnabled: true,
    performanceTelemetryEnabled: true,
    experimentParticipationEnabled: true,
    optOut: true,
    updatedAt: '2030-04-29T12:00:00.000Z',
    updatedBy: 'guardian-1',
    policyVersion: 3
  });

  assert.equal(normalized.telemetryEnabled, false);
  assert.equal(normalized.errorTelemetryEnabled, false);
  assert.equal(normalized.performanceTelemetryEnabled, false);
  assert.equal(normalized.experimentParticipationEnabled, false);
  assert.equal(normalized.updatedAt, '2030-04-29T12:00:00.000Z');
  assert.equal(normalized.updatedBy, 'guardian-1');
  assert.equal(normalized.policyVersion, 3);
});

test('telemetry gate requires config consent preferences and non-preview context', () => {
  const preferences = privacy.normalizePrivacyPreferences({
    telemetryEnabled: true,
    errorTelemetryEnabled: true,
    performanceTelemetryEnabled: true,
    experimentParticipationEnabled: true
  });

  assert.equal(privacy.canSendTelemetry({ enabled: true, consent: { telemetry: true }, preferences, type: 'selection' }), true);
  assert.equal(privacy.canSendTelemetry({ enabled: true, consent: { telemetry: true }, preferences, type: 'error' }), true);
  assert.equal(privacy.canSendTelemetry({ enabled: true, consent: { telemetry: true }, preferences, type: 'performance' }), true);
  assert.equal(privacy.canSendTelemetry({ enabled: false, consent: { telemetry: true }, preferences, type: 'selection' }), false);
  assert.equal(privacy.canSendTelemetry({ enabled: true, consent: { telemetry: false }, preferences, type: 'selection' }), false);
  assert.equal(privacy.canSendTelemetry({ enabled: true, consent: { telemetry: true, optOut: true }, preferences, type: 'selection' }), false);
  assert.equal(privacy.canSendTelemetry({ enabled: true, consent: { telemetry: true }, preferences, type: 'selection', parentPreview: true }), false);
});

test('opt-out prevents experiment telemetry and enrollment eligibility', () => {
  const preferences = privacy.normalizePrivacyPreferences({
    telemetryEnabled: true,
    experimentParticipationEnabled: true,
    optOut: true
  });

  assert.equal(privacy.canSendTelemetry({
    enabled: true,
    consent: { telemetry: true },
    preferences,
    type: 'experiment'
  }), false);
});

test('privacy updates preserve metadata and force child preferences off when telemetry is disabled', () => {
  const updated = privacy.applyPrivacyPreferenceUpdate({
    telemetryEnabled: true,
    errorTelemetryEnabled: true,
    performanceTelemetryEnabled: true,
    experimentParticipationEnabled: true
  }, {
    telemetryEnabled: false
  }, {
    actorId: 'student-1',
    now: () => '2030-04-29T12:00:00.000Z',
    policyVersion: 4
  });

  assert.deepEqual(updated, {
    schemaVersion: 1,
    telemetryEnabled: false,
    errorTelemetryEnabled: false,
    performanceTelemetryEnabled: false,
    experimentParticipationEnabled: false,
    updatedAt: '2030-04-29T12:00:00.000Z',
    updatedBy: 'student-1',
    policyVersion: 4
  });
});
