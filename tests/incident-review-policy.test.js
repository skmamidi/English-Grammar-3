const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_INCIDENT_REVIEW_POLICY,
  REQUIRED_INCIDENT_REVIEW_SECTIONS,
  buildIncidentReviewTemplate,
  sanitizeIncidentReviewRecord,
  validateIncidentReviewPolicy,
  validateRegressionCapture
} = require('../assets/incident-review-policy');
const {
  runIncidentReviewPolicyCheck
} = require('../scripts/qa/incident-review-policy');

test('incident review policy exposes required privacy-safe template sections', () => {
  const result = validateIncidentReviewPolicy(DEFAULT_INCIDENT_REVIEW_POLICY);
  const sectionIds = result.policy.template.sections.map(section => section.id);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(sectionIds, REQUIRED_INCIDENT_REVIEW_SECTIONS);
  result.policy.template.sections.forEach(section => {
    assert.ok(section.label, `${section.id} should have a label`);
    assert.ok(section.prompt, `${section.id} should have a prompt`);
    assert.equal(section.aggregateOnly, true, `${section.id} must be aggregate-only`);
  });
});

test('incident review template is actionable and excludes learner or question payloads', () => {
  const template = buildIncidentReviewTemplate(DEFAULT_INCIDENT_REVIEW_POLICY, {
    incidentId: 'INC-2026-05-03-cache',
    title: 'Offline cache recovery rehearsal missed stale shell asset'
  });

  assert.equal(template.incidentId, 'INC-2026-05-03-cache');
  assert.equal(template.title, 'Offline cache recovery rehearsal missed stale shell asset');
  assert.deepEqual(template.sections.map(section => section.id), REQUIRED_INCIDENT_REVIEW_SECTIONS);
  assert.match(template.nextStep, /Record aggregate impact/);
  assert.doesNotMatch(JSON.stringify(template), /learnerId|studentId|question text|answer choices|explanation|prompt text|token|raw stack/i);
});

test('regression capture requires test runbook roadmap evidence or documented non-testable reason', () => {
  assert.deepEqual(validateRegressionCapture({
    owner: 'platform',
    verificationCommand: 'node --test tests/offline-cache-policy.test.js',
    regressionTests: ['tests/offline-cache-policy.test.js'],
    runbookUpdates: [],
    roadmapItems: [],
    nonTestableReason: ''
  }).errors, []);

  assert.deepEqual(validateRegressionCapture({
    owner: '',
    verificationCommand: 'curl https://example.test?token=secret',
    regressionTests: [],
    runbookUpdates: [],
    roadmapItems: [],
    nonTestableReason: ''
  }).errors, [
    'owner is required',
    'verificationCommand must use an approved local command',
    'at least one regression test, runbook update, roadmap item, or non-testable reason is required'
  ]);
});

test('incident review validation rejects unsafe template and capture fields', () => {
  const result = validateIncidentReviewPolicy({
    template: {
      sections: [{
        id: 'summary',
        label: '',
        prompt: '',
        aggregateOnly: false,
        outputFields: ['learnerId', 'rawStackTrace']
      }]
    },
    capture: {
      owner: '',
      verificationCommand: 'node --test tests/incident-review-policy.test.js',
      regressionTests: [],
      runbookUpdates: [],
      roadmapItems: [],
      nonTestableReason: ''
    }
  });

  assert.deepEqual(result.errors, [
    'summary label is required',
    'summary prompt is required',
    'summary must be aggregate-only',
    'summary outputFields include unsafe field learnerId',
    'summary outputFields include unsafe field rawStackTrace',
    'missing required section impact',
    'missing required section detection',
    'missing required section mitigation',
    'missing required section rollback',
    'missing required section regression_test',
    'missing required section owner',
    'missing required section verification',
    'owner is required',
    'at least one regression test, runbook update, roadmap item, or non-testable reason is required'
  ]);
});

test('incident review sanitizer redacts payload-like diagnostics', () => {
  const sanitized = sanitizeIncidentReviewRecord({
    incidentId: 'INC-1',
    title: 'token=secret in report',
    summary: 'raw stack trace includes learnerId=abc and student@example.test',
    impact: '2 cohorts affected',
    detection: 'synthetic monitor failed',
    mitigation: 'disabled risky flag',
    rollback: 'used release manifest rollback',
    regressionTest: 'node --test tests/offline-cache-policy.test.js',
    owner: 'platform',
    verification: 'npm run qa:incident-review',
    payload: { learnerId: 'abc', question: 'Choose one', answer: 'A' }
  });

  assert.deepEqual(sanitized, {
    incidentId: 'INC-1',
    title: 'token=[redacted] in report',
    summary: 'stack trace includes learnerId=[redacted] and [redacted-email]',
    impact: '2 cohorts affected',
    detection: 'synthetic monitor failed',
    mitigation: 'disabled risky flag',
    rollback: 'used release manifest rollback',
    regressionTest: 'node --test tests/offline-cache-policy.test.js',
    owner: 'platform',
    verification: 'npm run qa:incident-review'
  });
});

test('incident review policy helper validates without live incident storage', () => {
  const result = runIncidentReviewPolicyCheck();

  assert.equal(result.ok, true);
  assert.equal(result.checkedLiveIncidentService, false);
  assert.deepEqual(result.sections, REQUIRED_INCIDENT_REVIEW_SECTIONS);
  assert.match(result.verificationCommand, /tests\/incident-review-policy\.test\.js/);
  assert.doesNotMatch(JSON.stringify(result), /learnerId|studentId|credentials|question text|answer choices|raw stack/i);
});
