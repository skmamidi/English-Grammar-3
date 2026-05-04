const assert = require('node:assert/strict');
const test = require('node:test');

const api = require('../assets/parent-review-question-api');

test('parent review question API requires immutable question identity for rendering', () => {
  const request = api.buildQuestionRenderRequest({
    questionId: 'grammar-sentence-types-q0002',
    sourceSet: 'grammar-sentence-types',
    questionVersion: 3,
    questionHash: 'sha256:abc',
    sequence: 2
  });

  assert.equal(request.renderMode, 'student_practice');
  assert.equal(request.includeScene, true);
  assert.equal(request.includeCharacters, true);
  assert.deepEqual(request.questionRef, {
    id: 'grammar-sentence-types-q0002',
    sourceSet: 'grammar-sentence-types',
    version: 3,
    contentHash: 'sha256:abc',
    sequence: 2
  });
});

test('parent review question API rejects mutable or incomplete question lookups', () => {
  assert.throws(
    () => api.buildQuestionRenderRequest({ questionId: 'grammar-sentence-types-q0002' }),
    error => {
      assert.equal(error.code, 'parent_review_question_request_invalid');
      assert.deepEqual(error.errors, ['source_set_required', 'question_version_required', 'content_hash_required']);
      return true;
    }
  );
});

test('parent review model uses canonical hydrated question and preserves generated scenes', () => {
  const model = api.buildParentQuestionReviewModel({
    id: 'grammar-sentence-types-q0002',
    version: 3,
    contentHash: 'sha256:abc',
    question: 'Which sentence asks something?',
    choices: ['Are you ready?', 'Close the door.'],
    correct: 0,
    generatedVisualScene: {
      type: 'dialogue-scene',
      title: 'Question Scene',
      dialogue: [{ characterId: 'piper-prism', text: 'Are you ready?' }]
    },
    metadata: {
      sourceSet: 'grammar-sentence-types',
      sequence: 2,
      skillIds: ['grammar.sentence-analysis']
    }
  }, {
    questionId: 'grammar-sentence-types-q0002',
    sourceSet: 'grammar-sentence-types',
    questionVersion: 3,
    questionHash: 'sha256:abc',
    sequence: 2,
    learnerId: 'learner-1',
    sessionId: 'session-1',
    selectedChoice: 'Close the door.',
    firstAttemptCorrect: false
  });

  assert.equal(model.questionRef.id, 'grammar-sentence-types-q0002');
  assert.equal(model.studentView.renderMode, 'student_practice');
  assert.equal(model.studentView.visualScene.type, 'dialogue-scene');
  assert.equal(model.studentView.visualScene.dialogue[0].characterId, 'piper-prism');
  assert.equal(model.parentEvidence.selectedIndex, 1);
  assert.equal(model.parentEvidence.selectedChoice, 'Close the door.');
  assert.equal(model.parentEvidence.correctChoice, 'Are you ready?');
});

test('parent review model refuses stale hydrated question content', () => {
  assert.throws(
    () => api.buildParentQuestionReviewModel({
      id: 'grammar-sentence-types-q0002',
      version: 4,
      contentHash: 'sha256:new',
      choices: ['A'],
      metadata: { sourceSet: 'grammar-sentence-types', sequence: 2 }
    }, {
      questionId: 'grammar-sentence-types-q0002',
      sourceSet: 'grammar-sentence-types',
      questionVersion: 3,
      questionHash: 'sha256:abc',
      sequence: 2
    }),
    error => {
      assert.equal(error.code, 'parent_review_question_mismatch');
      assert.ok(error.errors.includes('question_version_mismatch'));
      assert.ok(error.errors.includes('question_hash_mismatch'));
      return true;
    }
  );
});

test('parent review evidence request separates answer metadata from question rendering', () => {
  const request = api.buildReviewEvidenceRequest({
    reportId: 'question-report-dashboard',
    learnerId: 'learner-1',
    questionId: 'grammar-sentence-types-q0002',
    sourceSet: 'grammar-sentence-types',
    questionVersion: 3,
    questionHash: 'sha256:abc',
    selectedChoice: 'Are you ready?'
  });

  assert.equal(request.reportId, 'question-report-dashboard');
  assert.equal(request.learnerId, 'learner-1');
  assert.equal(request.questionRef.id, 'grammar-sentence-types-q0002');
  assert.equal(Object.prototype.hasOwnProperty.call(request, 'selectedChoice'), false);
});
