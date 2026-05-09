const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_PERSONALIZATION_EVALUATION_POLICY,
  evaluatePersonalizationEvaluationGate,
  evaluatePersonalizationRun,
  validateEvaluationReportPrivacy
} = require('../assets/personalization-evaluation-policy');

const repoRoot = path.resolve(__dirname, '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'personalization-evaluation', 'synthetic-runs.json'), 'utf8'));

test('personalization evaluation builds aggregate privacy-safe fairness slices', () => {
  const report = evaluatePersonalizationRun(fixtures.passingRun);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.policyVersion, 'personalization-evaluation/v1');
  assert.equal(report.runRef, 'personalization-eval:passing');
  assert.equal(report.aggregateOnly, true);
  assert.equal(report.summary.totalPlans, 4);
  assert.equal(report.summary.totalSelections, 8);
  assert.equal(report.gate.status, 'passed');
  assert.deepEqual(report.gate.blockers, []);
  assert.ok(report.slices.grade.some(slice => slice.key === '3' && slice.planCount === 2));
  assert.ok(report.slices.domain.some(slice => slice.key === 'grammar' && slice.selectionCount === 4));
  assert.ok(report.coverage.skills.covered.includes('grammar.fragments'));
  assert.deepEqual(validateEvaluationReportPrivacy(report).errors, []);
  assertNoUnsafeDiagnostics(report);
});

test('fairness gates block grade skew repeated drilling starvation and unsupported stretch', () => {
  const unsafeRun = Object.assign({}, fixtures.passingRun, {
    runId: 'personalization-eval:unsafe',
    outcomes: [{
      planRef: 'assembly:unsafe',
      grade: '3',
      difficulty: 'medium',
      domain: 'grammar',
      assignmentStatus: 'assigned',
      reviewUrgency: 'overdue',
      selectedRefs: [
        { id: 'repeat-1', sourceSet: 'grammar-fragments', gradeLevel: 6, difficultyBand: 'hard', skillIds: ['grammar.fragments'], standardIds: ['L.6.1'], reasonCodes: ['weak_skill_review_due'] },
        { id: 'repeat-1', sourceSet: 'grammar-fragments', gradeLevel: 6, difficultyBand: 'hard', skillIds: ['grammar.fragments'], standardIds: ['L.6.1'], reasonCodes: ['weak_skill_review_due'] },
        { id: 'repeat-1', sourceSet: 'grammar-fragments', gradeLevel: 6, difficultyBand: 'hard', skillIds: ['grammar.fragments'], standardIds: ['L.6.1'], reasonCodes: ['weak_skill_review_due'] },
        { id: 'repeat-2', sourceSet: 'grammar-fragments', gradeLevel: 6, difficultyBand: 'hard', skillIds: ['grammar.fragments'], standardIds: ['L.6.1'], reasonCodes: ['weak_skill_review_due'] }
      ]
    }]
  });

  const report = evaluatePersonalizationRun(unsafeRun);

  assert.equal(report.gate.status, 'blocked');
  [
    'grade_skew',
    'repeated_item_pressure',
    'skill_starvation',
    'domain_starvation',
    'coverage_drift',
    'unsupported_stretch',
    'over_remediation'
  ].forEach(blocker => assert.ok(report.gate.blockers.includes(blocker), blocker));
  assertNoUnsafeDiagnostics(report);
});

test('evaluation gate requires owner review date rollback criteria and passing report', () => {
  const ready = evaluatePersonalizationEvaluationGate({
    evaluationRun: fixtures.passingRun
  });
  const missingEvidence = evaluatePersonalizationEvaluationGate({
    evaluationRun: Object.assign({}, fixtures.passingRun, {
      owner: '',
      reviewedAt: '',
      rollbackCriteria: []
    })
  });

  assert.equal(ready.launchAllowed, true);
  assert.deepEqual(ready.blockers, []);
  assert.equal(ready.owner, 'learning-platform');
  assert.equal(ready.rollbackFeatureFlag, 'dynamicQuizAssemblyPilot');
  assert.equal(missingEvidence.launchAllowed, false);
  assert.ok(missingEvidence.blockers.includes('owner_required'));
  assert.ok(missingEvidence.blockers.includes('review_date_required'));
  assert.ok(missingEvidence.blockers.includes('rollback_criteria_required'));
});

test('diagnostic redaction rejects raw learner prompt answer and provider payloads', () => {
  const report = evaluatePersonalizationRun(Object.assign({}, fixtures.passingRun, {
    learnerId: 'learner-unsafe',
    outcomes: fixtures.passingRun.outcomes.concat({
      planRef: 'assembly:raw',
      grade: '4',
      domain: 'grammar',
      learnerId: 'learner-unsafe',
      prompt: 'raw prompt',
      answerKey: 'A',
      providerPayload: { vector: [1, 2, 3] },
      selectedRefs: [
        { id: 'safe-ref', sourceSet: 'grammar-usage', gradeLevel: 4, skillIds: ['grammar.usage'], standardIds: ['L.4.1'] }
      ]
    })
  }));

  assert.equal(JSON.stringify(report).includes('learner-unsafe'), false);
  assert.equal(JSON.stringify(report).includes('raw prompt'), false);
  assert.equal(JSON.stringify(report).includes('answerKey'), false);
  assert.equal(JSON.stringify(report).includes('providerPayload'), false);
  assert.deepEqual(validateEvaluationReportPrivacy(report).errors, []);
});

test('personalization evaluation docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'personalization-evaluation-and-fairness.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'PersonalizationEvaluationRun',
    'FairnessSlice',
    'CoverageDrift',
    'RecommendationOutcome',
    'EvaluationGate',
    'aggregate-only',
    'dynamicQuizAssemblyPilot'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));
  assert.match(pkg.scripts['test:unit'], /tests\/personalization-evaluation-policy\.test\.js/);
});

test('default evaluation thresholds are conservative launch blockers', () => {
  assert.equal(DEFAULT_PERSONALIZATION_EVALUATION_POLICY.maxUnsupportedStretchShare, 0);
  assert.ok(DEFAULT_PERSONALIZATION_EVALUATION_POLICY.maxRepeatedItemShare <= 0.25);
  assert.ok(DEFAULT_PERSONALIZATION_EVALUATION_POLICY.maxWeakSkillShare <= 0.6);
  assert.equal(DEFAULT_PERSONALIZATION_EVALUATION_POLICY.minCoverageShare, 1);
});

function assertNoUnsafeDiagnostics(value) {
  const text = JSON.stringify(value);
  ['learnerId', 'studentId', 'email', 'raw prompt', 'answerKey', 'choices', 'providerPayload', 'vector'].forEach(token => {
    assert.equal(text.includes(token), false, `${token} should not appear in aggregate report`);
  });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
