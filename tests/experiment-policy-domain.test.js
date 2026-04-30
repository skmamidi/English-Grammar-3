const assert = require('node:assert/strict');
const test = require('node:test');

const experiments = require('../assets/experiment-policy-domain');

test('experiment enrollment is denied without explicit consent preferences', () => {
  const result = experiments.evaluateExperimentEnrollment({
    experimentId: 'adaptive-review-copy',
    configEnabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: true,
      experimentParticipationEnabled: false
    }
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'experiment_consent_required');
});

test('experiment enrollment is denied in parent preview and when telemetry is disabled', () => {
  assert.equal(experiments.evaluateExperimentEnrollment({
    experimentId: 'adaptive-review-copy',
    configEnabled: true,
    consent: { telemetry: true },
    parentPreview: true,
    privacyPreferences: {
      telemetryEnabled: true,
      experimentParticipationEnabled: true
    }
  }).reason, 'parent_preview');

  assert.equal(experiments.evaluateExperimentEnrollment({
    experimentId: 'adaptive-review-copy',
    configEnabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: false,
      experimentParticipationEnabled: true
    }
  }).reason, 'telemetry_disabled');
});

test('experiment enrollment is allowed only after every consent boundary passes', () => {
  const result = experiments.evaluateExperimentEnrollment({
    experimentId: 'adaptive-review-copy',
    configEnabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: true,
      experimentParticipationEnabled: true
    }
  });

  assert.deepEqual(result, {
    allowed: true,
    reason: 'eligible',
    experimentId: 'adaptive-review-copy'
  });
});
