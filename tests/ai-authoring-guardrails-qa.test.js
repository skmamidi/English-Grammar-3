const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildAiAuthoringGuardrailsCheck,
  runAiAuthoringGuardrailsQa
} = require('../scripts/qa/ai-authoring-guardrails-qa');

function record(overrides = {}) {
  return {
    questionId: 'grammar-sentence-types-q0123',
    sourceSet: 'grammar-sentence-types',
    assistance: {
      used: true,
      purpose: 'explanation',
      modelFamily: 'documented-model-family',
      promptRecordId: 'authoring-prompt-2030-04-29-a',
      humanReviewed: true,
      reviewerId: 'reviewer-1',
      reviewedAt: '2030-04-29T12:00:00.000Z'
    },
    sourceAttribution: {
      sourceFile: 'allowed-source.pdf',
      sourceCategory: 'grammar',
      sourceQuestionNumber: '12',
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

test('AI authoring guardrails QA passes valid reviewed assistance records', () => {
  const result = runAiAuthoringGuardrailsQa({ records: [record()] });

  assert.equal(result.status, 'passed');
  assert.equal(result.errors.length, 0);
  assert.equal(result.summary.recordCount, 1);
  assert.equal(result.summary.aiAssistedCount, 1);
});

test('AI authoring guardrails QA fails missing reviewer unsafe prompt data and denied sources', () => {
  const result = runAiAuthoringGuardrailsQa({
    records: [
      record({
        questionId: 'q-missing-reviewer',
        assistance: {
          used: true,
          purpose: 'draft',
          modelFamily: 'documented-model-family',
          promptRecordId: 'prompt-1',
          humanReviewed: false,
          reviewerId: '',
          reviewedAt: ''
        }
      }),
      record({
        questionId: 'q-unsafe',
        promptText: 'Use learner Priya at priya@example.com.'
      }),
      record({
        questionId: 'q-license',
        sourceAttribution: {
          sourceFile: 'denied-source.pdf',
          sourceCategory: 'grammar',
          sourceQuestionNumber: '3',
          licenseStatus: 'denied'
        }
      })
    ]
  });

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.errors.map(error => error.code), [
    'ai_review_required',
    'ai_metadata_unsafe',
    'ai_source_license_blocked'
  ]);
});

test('AI authoring guardrails QA exposes a publication check with blocking errors', () => {
  const check = buildAiAuthoringGuardrailsCheck({
    records: [record({
      sourceAttribution: {},
      guardrails: {
        sourceAttributionChecked: false,
        standardsClaimChecked: true,
        duplicateCheckPassed: true,
        biasSafetyChecked: true,
        explanationQualityChecked: true
      }
    })]
  });

  assert.equal(check.id, 'ai-authoring-guardrails');
  assert.equal(check.errors.length, 2);
  assert.equal(check.blocking, true);
  assert.equal(check.report.summary.aiAssistedCount, 1);
});
