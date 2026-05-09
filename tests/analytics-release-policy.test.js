const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_ANALYTICS_RELEASE_POLICY,
  evaluateAnalyticsReleaseReadiness,
  validateAnalyticsMetricDefinition
} = require('../assets/analytics-release-policy');

const repoRoot = path.resolve(__dirname, '..');

test('analytics release policy defines privacy-safe metric requirements', () => {
  assert.equal(DEFAULT_ANALYTICS_RELEASE_POLICY.minCohortSize, 5);
  assert.deepEqual(DEFAULT_ANALYTICS_RELEASE_POLICY.allowedAggregationLevels, ['aggregate', 'cohort']);
  assert.ok(DEFAULT_ANALYTICS_RELEASE_POLICY.forbiddenFieldPattern.test('learnerId'));
  assert.ok(DEFAULT_ANALYTICS_RELEASE_POLICY.forbiddenFieldPattern.test('questionText'));
  assert.ok(DEFAULT_ANALYTICS_RELEASE_POLICY.forbiddenFieldPattern.test('customer_id'));
});

test('metric definitions require cohort suppression buckets retention and classification source', () => {
  const result = validateAnalyticsMetricDefinition({
    id: 'assignment_completion_rate',
    sourceCategory: 'telemetry_event',
    aggregationLevel: 'cohort',
    minCohortSize: 5,
    countBucketSize: 5,
    suppression: 'suppress_small_cohorts',
    retentionClass: 'aggregate_90_days',
    releaseEligible: true
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.metric.id, 'assignment_completion_rate');
});

test('metric definitions reject raw learner question URL stack and billing fields', () => {
  const result = validateAnalyticsMetricDefinition({
    id: 'learner_question_url_stack_customer_id',
    sourceCategory: 'learner_progress',
    aggregationLevel: 'learner',
    minCohortSize: 2,
    countBucketSize: 0,
    suppression: 'none',
    retentionClass: '',
    releaseEligible: true,
    fields: ['learnerId', 'questionText', 'answer', 'url', 'stack', 'customer_id']
  });

  assert.deepEqual(result.errors, [
    'id contains unsafe analytics field',
    'aggregationLevel must be aggregate or cohort',
    'minCohortSize must be at least 5',
    'countBucketSize must be at least 5',
    'suppression must suppress small cohorts',
    'retentionClass is required',
    'fields contains unsafe analytics field'
  ]);
});

test('release readiness blocks unsafe metrics experiments and institutional policy conflicts', () => {
  const result = evaluateAnalyticsReleaseReadiness({
    metrics: [
      {
        id: 'assignment_completion_rate',
        sourceCategory: 'telemetry_event',
        aggregationLevel: 'cohort',
        minCohortSize: 5,
        countBucketSize: 5,
        suppression: 'suppress_small_cohorts',
        retentionClass: 'aggregate_90_days',
        releaseEligible: true
      },
      {
        id: 'student_answer_payload',
        sourceCategory: 'learner_answer_attempt',
        aggregationLevel: 'learner',
        minCohortSize: 1,
        countBucketSize: 1,
        suppression: 'none',
        retentionClass: '',
        releaseEligible: true,
        fields: ['answer']
      }
    ],
    experiments: [
      {
        id: 'adaptive-review-copy',
        status: 'active',
        successMetrics: ['assignment_completion_rate'],
        guardrailMetrics: ['fallback_rate'],
        rollbackCriteria: [{ metric: 'fallback_rate', operator: '>=', threshold: 0.25 }],
        startsAt: '2030-04-01T00:00:00.000Z',
        endsAt: '2030-05-01T00:00:00.000Z'
      },
      {
        id: 'unsafe-experiment',
        status: 'active',
        successMetrics: ['learnerId'],
        guardrailMetrics: [],
        rollbackCriteria: [],
        startsAt: '2030-04-01T00:00:00.000Z'
      }
    ],
    personalizationEvaluation: {
      gate: {
        status: 'blocked',
        blockers: ['grade_skew']
      }
    },
    institutionPolicy: { disabledFeatures: ['telemetry'] }
  });

  assert.equal(result.ready, false);
  assert.ok(result.errors.includes('metric student_answer_payload: id contains unsafe analytics field'));
  assert.ok(result.errors.includes('experiment unsafe-experiment: unsafe_metric_field'));
  assert.ok(result.errors.includes('personalization evaluation gate blocked: grade_skew'));
  assert.ok(result.errors.includes('institution policy disables telemetry'));
});

test('safe analytics release definitions pass vendor-neutral readiness', () => {
  const result = evaluateAnalyticsReleaseReadiness({
    metrics: [
      {
        id: 'assignment_completion_rate',
        sourceCategory: 'telemetry_event',
        aggregationLevel: 'cohort',
        minCohortSize: 10,
        countBucketSize: 5,
        suppression: 'suppress_small_cohorts',
        retentionClass: 'aggregate_90_days',
        releaseEligible: true,
        fields: ['cohortSizeBucket', 'completionRate']
      }
    ],
    experiments: [
      {
        id: 'adaptive-review-copy',
        status: 'active',
        eligibleRoles: ['student'],
        requiredConsent: ['telemetry', 'experiment'],
        successMetrics: ['assignment_completion_rate'],
        guardrailMetrics: ['fallback_rate'],
        rollbackCriteria: [{ metric: 'fallback_rate', operator: '>=', threshold: 0.25 }],
        startsAt: '2030-04-01T00:00:00.000Z',
        endsAt: '2030-05-01T00:00:00.000Z'
      }
    ],
    personalizationEvaluation: {
      gate: {
        status: 'passed',
        blockers: []
      }
    },
    institutionPolicy: { disabledFeatures: [] }
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.ready, true);
});

test('analytics release docs and unit gate are wired', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'analytics-release-policy.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /cohort suppression/i);
  assert.match(docs, /raw learner/i);
  assert.match(docs, /institutional policy/i);
  assert.match(checklist, /analytics release policy/i);
  assert.match(pkg.scripts['test:unit'], /tests\/analytics-release-policy\.test\.js/);
});
