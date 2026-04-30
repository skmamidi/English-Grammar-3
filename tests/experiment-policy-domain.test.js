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

test('experiment definitions require duration metrics and rollback criteria', () => {
  const invalid = experiments.validateExperimentDefinition({
    id: 'adaptive-review-copy',
    status: 'active',
    eligibleRoles: ['student'],
    requiredConsent: ['telemetry', 'experiment'],
    featureFlag: 'adaptiveReviewCopy',
    successMetrics: ['assignment_completion_rate'],
    guardrailMetrics: ['fallback_rate'],
    startsAt: '2030-04-01T00:00:00.000Z'
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.includes('endsAt_required'));
  assert.ok(invalid.errors.includes('rollbackCriteria_required'));

  const valid = experiments.validateExperimentDefinition({
    id: 'adaptive-review-copy',
    status: 'active',
    eligibleRoles: ['student'],
    requiredConsent: ['telemetry', 'experiment'],
    featureFlag: 'adaptiveReviewCopy',
    successMetrics: ['assignment_completion_rate'],
    guardrailMetrics: ['fallback_rate'],
    rollbackCriteria: [{ metric: 'fallback_rate', operator: '>=', threshold: 0.25 }],
    startsAt: '2030-04-01T00:00:00.000Z',
    endsAt: '2030-05-01T00:00:00.000Z'
  });

  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, []);
});

test('experiment definitions reject unsafe telemetry fields', () => {
  const result = experiments.validateExperimentDefinition({
    id: 'unsafe-fields',
    status: 'draft',
    eligibleRoles: ['student'],
    requiredConsent: ['telemetry', 'experiment'],
    successMetrics: ['assignment_completion_rate', 'learnerId'],
    guardrailMetrics: ['questionText'],
    rollbackCriteria: [{ metric: 'fallback_rate', operator: '>=', threshold: 0.25 }],
    startsAt: '2030-04-01T00:00:00.000Z',
    endsAt: '2030-05-01T00:00:00.000Z'
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('unsafe_metric_field'));
});
