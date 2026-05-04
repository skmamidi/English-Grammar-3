const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_AI_AUTHORING_PURPOSES,
  evaluateAuthoringGuardrails,
  normalizeAuthoringRecord,
  sanitizeAuthoringRecord
} = require('../assets/content-authoring-guardrails-domain');
const {
  getAuthoringFixture
} = require('../assets/authoring-fixture-library');

function validRecord(overrides = {}) {
  return {
    questionId: 'grammar-sentence-types-q0123',
    sourceSet: 'grammar-sentence-types',
    assistance: {
      used: true,
      purpose: 'draft',
      modelFamily: 'documented-model-family',
      promptRecordId: 'authoring-prompt-2030-04-29-a',
      humanReviewed: true,
      reviewerId: 'reviewer-1',
      reviewedAt: '2030-04-29T12:00:00.000Z'
    },
    sourceAttribution: {
      sourceFile: 'grammar-quest-authored',
      sourceCategory: 'authored',
      sourceQuestionNumber: 'original',
      licenseStatus: 'allowed'
    },
    guardrails: {
      sourceAttributionChecked: true,
      standardsClaimChecked: true,
      duplicateCheckPassed: true,
      biasSafetyChecked: true,
      explanationQualityChecked: true
    },
    ...overrides
  };
}

test('authoring guardrails normalize bounded AI assistance provenance', () => {
  const normalized = normalizeAuthoringRecord(validRecord({
    assistance: {
      used: true,
      purpose: ' rewrite ',
      modelFamily: ' gpt-family ',
      promptRecordId: ' prompt-1 ',
      humanReviewed: true,
      reviewerId: ' reviewer-1 ',
      reviewedAt: ' 2030-04-29T12:00:00.000Z '
    }
  }));

  assert.deepEqual(ALLOWED_AI_AUTHORING_PURPOSES, [
    'classification',
    'draft',
    'explanation',
    'metadata',
    'rewrite'
  ]);
  assert.equal(normalized.questionId, 'grammar-sentence-types-q0123');
  assert.equal(normalized.assistance.purpose, 'rewrite');
  assert.equal(normalized.assistance.reviewerId, 'reviewer-1');
  assert.equal(normalized.sourceAttribution.sourceFile, 'grammar-quest-authored');
  assert.deepEqual(evaluateAuthoringGuardrails(normalized).issues, []);
});

test('AI-assisted content requires human review source attribution and explicit guardrail checks', () => {
  const result = evaluateAuthoringGuardrails(validRecord({
    assistance: {
      used: true,
      purpose: 'draft',
      modelFamily: 'documented-model-family',
      promptRecordId: 'authoring-prompt-2030-04-29-a',
      humanReviewed: false,
      reviewerId: '',
      reviewedAt: ''
    },
    sourceAttribution: {},
    guardrails: {
      sourceAttributionChecked: false,
      standardsClaimChecked: false,
      duplicateCheckPassed: false,
      biasSafetyChecked: false,
      explanationQualityChecked: false
    }
  }));

  assert.equal(result.status, 'failed');
  assert.equal(result.blocking, true);
  assert.deepEqual(result.issues.map(issue => issue.code), [
    'ai_review_required',
    'ai_source_missing',
    'ai_guardrail_failed',
    'ai_guardrail_failed',
    'ai_guardrail_failed',
    'ai_guardrail_failed',
    'ai_guardrail_failed'
  ]);
});

test('unknown AI purposes and unsafe metadata are rejected before publication', () => {
  const result = evaluateAuthoringGuardrails(validRecord({
    assistance: {
      used: true,
      purpose: 'answer-generation',
      modelFamily: 'documented-model-family',
      promptRecordId: 'authoring-prompt-2030-04-29-a',
      humanReviewed: true,
      reviewerId: 'reviewer-1',
      reviewedAt: '2030-04-29T12:00:00.000Z'
    },
    promptText: 'Student maya@example.com answered B. Use sk-live-1234567890abcdefghijklmnop to fetch context.'
  }));

  assert.equal(result.status, 'failed');
  assert.ok(result.issues.some(issue => issue.code === 'ai_purpose_invalid'));
  assert.ok(result.issues.some(issue => issue.code === 'ai_metadata_unsafe'));
});

test('sanitized authoring records omit raw prompts notes and learner identifiers', () => {
  const sanitized = sanitizeAuthoringRecord(validRecord({
    promptText: 'Raw prompt must not ship.',
    reviewerNotes: 'Learner Jordan chose the correct answer.',
    learnerEmail: 'jordan@example.com'
  }));

  assert.equal(sanitized.promptText, undefined);
  assert.equal(sanitized.reviewerNotes, undefined);
  assert.equal(sanitized.learnerEmail, undefined);
  assert.equal(sanitized.assistance.promptRecordId, 'authoring-prompt-2030-04-29-a');
});

test('AI authoring guardrails consume invalid assistance fixture descriptors', () => {
  const fixture = getAuthoringFixture('invalid_ai_assistance_metadata');
  const result = evaluateAuthoringGuardrails(validRecord({
    assistance: Object.assign({}, validRecord().assistance, {
      purpose: fixture.metadata.assistancePurpose,
      humanReviewed: false,
      reviewerId: '',
      reviewedAt: ''
    })
  }));

  assert.ok(result.issues.some(issue => issue.code === 'ai_purpose_invalid'));
  assert.ok(result.issues.some(issue => issue.code === 'ai_review_required'));
});
