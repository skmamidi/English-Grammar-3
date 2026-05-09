const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildExperimentAuditRecord,
  evaluateLearningExperimentEligibility,
  normalizeExperimentAssignment,
  validateLearningExperimentDefinition,
  validateOutcomeMetric
} = require('../assets/learning-experiment-policy');

const repoRoot = path.resolve(__dirname, '..');

const activeDefinition = {
  id: 'adaptive-assembly-balance-v1',
  status: 'active',
  owner: 'learning-platform',
  featureFlag: 'dynamicQuizAssemblyPilot',
  startsAt: '2030-05-01T00:00:00.000Z',
  endsAt: '2030-06-01T00:00:00.000Z',
  killSwitch: { enabled: false, reason: '' },
  assignmentPolicy: {
    saltRef: 'experiment-salt:adaptive-v1',
    trafficPercent: 50,
    variants: [
      { id: 'holdout', weight: 50, holdout: true },
      { id: 'adaptive_plan', weight: 50 }
    ]
  },
  eligibilityRules: {
    requiredFeatureFlags: ['dynamicQuizAssemblyPilot'],
    requiredConsent: ['telemetry', 'experiments', 'optionalPersonalization'],
    allowParentPreview: false,
    requireAssignmentAuthority: false
  },
  outcomeMetrics: [
    { id: 'verified_mastery_delta', source: 'verified_learning_projection', aggregationLevel: 'cohort', minCohortSize: 10 },
    { id: 'fallback_rate', source: 'assembly_diagnostics', aggregationLevel: 'aggregate', minCohortSize: 10 }
  ],
  rollbackCriteria: [{ metric: 'fallback_rate', operator: '>=', threshold: 0.25 }]
};

test('learning experiment definitions require owner expiry kill switch metrics and rollback', () => {
  const invalid = validateLearningExperimentDefinition({
    id: 'adaptive-assembly-balance-v1',
    status: 'active',
    assignmentPolicy: { variants: [{ id: 'adaptive_plan', weight: 100 }] },
    outcomeMetrics: [{ id: 'raw_answer_metric', source: 'raw', aggregationLevel: 'learner', minCohortSize: 1 }]
  });
  const valid = validateLearningExperimentDefinition(activeDefinition);

  assert.equal(invalid.valid, false);
  ['owner_required', 'featureFlag_required', 'startsAt_required', 'endsAt_required', 'killSwitch_required', 'rollbackCriteria_required', 'unsafe_outcome_metric'].forEach(error => {
    assert.ok(invalid.errors.includes(error), error);
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, []);
});

test('eligibility denies default disabled expired killed opt-out parent-preview and institution-disabled contexts', () => {
  const base = eligibleContext();

  assert.equal(evaluateLearningExperimentEligibility({ definition: activeDefinition, context: Object.assign({}, base, { featureFlags: {} }) }).reason, 'experiment_flag_disabled');
  assert.equal(evaluateLearningExperimentEligibility({ definition: Object.assign({}, activeDefinition, { endsAt: '2030-05-02T00:00:00.000Z' }), context: base }).reason, 'experiment_expired');
  assert.equal(evaluateLearningExperimentEligibility({ definition: Object.assign({}, activeDefinition, { killSwitch: { enabled: true, reason: 'fairness_gate_failed' } }), context: base }).reason, 'experiment_killed');
  assert.equal(evaluateLearningExperimentEligibility({ definition: activeDefinition, context: Object.assign({}, base, { privacyPreferences: { telemetryEnabled: true, experimentParticipationEnabled: false } }) }).reason, 'experiment_consent_required');
  assert.equal(evaluateLearningExperimentEligibility({ definition: activeDefinition, context: Object.assign({}, base, { parentPreview: true }) }).reason, 'parent_preview_denied');
  assert.equal(evaluateLearningExperimentEligibility({ definition: activeDefinition, context: Object.assign({}, base, { institutionPolicy: { disabledFeatures: ['experiments'] } }) }).reason, 'institution_policy_denied');
});

test('eligibility allows assigned teacher authority without exposing learner identity', () => {
  const result = evaluateLearningExperimentEligibility({
    definition: Object.assign({}, activeDefinition, {
      eligibilityRules: Object.assign({}, activeDefinition.eligibilityRules, {
        requireAssignmentAuthority: true
      })
    }),
    context: Object.assign({}, eligibleContext(), {
      actor: { role: 'teacher', assignedLearnerIds: ['learner-unsafe'], assignedClassIds: ['class-a'] },
      learnerId: 'learner-unsafe',
      classId: 'class-a'
    })
  });

  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'eligible');
  assert.equal(JSON.stringify(result).includes('learner-unsafe'), false);
});

test('assignment is deterministic and privacy-safe with holdout support', () => {
  const first = normalizeExperimentAssignment({
    definition: activeDefinition,
    learnerScopeRef: 'learner:b'
  });
  const second = normalizeExperimentAssignment({
    definition: activeDefinition,
    learnerScopeRef: 'learner:b'
  });
  const outsideTraffic = normalizeExperimentAssignment({
    definition: Object.assign({}, activeDefinition, {
      assignmentPolicy: Object.assign({}, activeDefinition.assignmentPolicy, { trafficPercent: 0 })
    }),
    learnerScopeRef: 'learner:b'
  });

  assert.deepEqual(first, second);
  assert.match(first.assignmentRef, /^experiment-assignment:/);
  assert.ok(['holdout', 'adaptive_plan'].includes(first.variantId));
  assert.equal(typeof first.holdout, 'boolean');
  assert.equal(JSON.stringify(first).includes('learner:b'), false);
  assert.equal(outsideTraffic.assigned, false);
  assert.equal(outsideTraffic.reason, 'outside_traffic_allocation');
});

test('audit records and outcome metrics stay aggregate-only', () => {
  const assignment = normalizeExperimentAssignment({ definition: activeDefinition, learnerScopeRef: 'learner:b' });
  const audit = buildExperimentAuditRecord({
    definition: activeDefinition,
    eligibility: { allowed: true, reason: 'eligible' },
    assignment,
    actor: { role: 'student', learnerId: 'learner:unsafe-123' },
    metadata: { prompt: 'raw prompt', providerPayload: { token: 'secret' } },
    now: '2030-05-04T12:00:00.000Z'
  });

  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.experimentId, activeDefinition.id);
  assert.equal(audit.eligibilityReason, 'eligible');
  assert.equal(audit.variantId, assignment.variantId);
  assert.equal(JSON.stringify(audit).includes('unsafe-123'), false);
  assert.equal(JSON.stringify(audit).includes('raw prompt'), false);
  assert.equal(JSON.stringify(audit).includes('providerPayload'), false);

  assert.deepEqual(validateOutcomeMetric({ id: 'verified_mastery_delta', source: 'verified_learning_projection', aggregationLevel: 'cohort', minCohortSize: 10 }).errors, []);
  assert.ok(validateOutcomeMetric({ id: 'student_answer_prompt', source: 'raw', aggregationLevel: 'learner', minCohortSize: 1 }).errors.includes('unsafe_metric_field'));
});

test('learning experiment docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'learning-experiment-framework.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'ExperimentDefinition',
    'AssignmentPolicy',
    'EligibilityRule',
    'HoldoutGroup',
    'OutcomeMetric',
    'ExperimentAuditRecord',
    'dynamicQuizAssemblyPilot'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));
  assert.match(pkg.scripts['test:unit'], /tests\/learning-experiment-policy\.test\.js/);
});

function eligibleContext() {
  return {
    now: '2030-05-04T12:00:00.000Z',
    featureFlags: {
      dynamicQuizAssemblyPilot: true,
      experiments: true,
      optionalPersonalization: true
    },
    privacyPreferences: {
      telemetryEnabled: true,
      experimentParticipationEnabled: true,
      optionalPersonalizationEnabled: true
    },
    guardianConsent: {
      telemetry: true,
      experiments: true,
      optionalPersonalization: true
    },
    institutionPolicy: {
      experiments: true,
      optionalPersonalization: true
    },
    actor: { role: 'student', learnerId: 'learner-unsafe' },
    learnerId: 'learner-unsafe'
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
