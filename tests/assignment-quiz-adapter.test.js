const assert = require('node:assert/strict');
const test = require('node:test');

const adapter = require('../assets/assignment-quiz-adapter');

const manifest = {
  sets: [{
    id: 'grammar-sentence-types',
    domain: 'grammar',
    skillCoverage: [{ skillId: 'grammar.sentence-analysis', questionCount: 10 }],
    standardCoverage: [{ standardId: 'L.3-6.1', questionCount: 10 }]
  }, {
    id: 'vocabulary-homophones',
    domain: 'vocabulary',
    skillCoverage: [{ skillId: 'vocabulary.word-study', questionCount: 8 }],
    standardCoverage: [{ standardId: 'L.4-6.4', questionCount: 8 }]
  }]
};

test('assignment quiz adapter converts assignment scope to loader request refs', () => {
  const request = adapter.assignmentToQuizRequest({
    id: 'assignment-1',
    scope: {
      setIds: ['grammar-sentence-types'],
      skillIds: ['grammar.sentence-analysis'],
      questionRefs: [{ id: 'grammar-sentence-types-q0001', sourceSet: 'grammar-sentence-types', contentHash: 'sha256:abc', question: 'drop me' }]
    },
    quizOptions: { count: 4, grade: '4', difficulty: 'medium', mode: 'assignment' }
  }, { manifest });

  assert.deepEqual(request.setIds, ['grammar-sentence-types']);
  assert.equal(request.count, 4);
  assert.equal(request.grade, '4');
  assert.equal(request.difficulty, 'medium');
  assert.equal(request.mode, 'assignment');
  assert.equal(JSON.stringify(request).includes('drop me'), false);
  assert.deepEqual(request.questionRefs, [{ id: 'grammar-sentence-types-q0001', sourceSet: 'grammar-sentence-types', version: 0, contentHash: 'sha256:abc', sequence: 0 }]);
});

test('assignment quiz adapter resolves set ids through skill and standards coverage', () => {
  assert.deepEqual(adapter.assignmentToQuizRequest({
    id: 'assignment-skills',
    scope: { skillIds: ['vocabulary.word-study'] },
    quizOptions: { count: 3 }
  }, { manifest }).setIds, ['vocabulary-homophones']);

  assert.deepEqual(adapter.assignmentToQuizRequest({
    id: 'assignment-standards',
    scope: { standardIds: ['L.3-6.1'] },
    quizOptions: { count: 3 }
  }, { manifest }).setIds, ['grammar-sentence-types']);
});

test('assignment quiz adapter rejects assignments that cannot resolve a set', () => {
  assert.throws(
    () => adapter.assignmentToQuizRequest({
      id: 'assignment-empty',
      scope: { skillIds: ['grammar.missing'] },
      quizOptions: { count: 3 }
    }, { manifest }),
    /assignment_scope_unresolvable/
  );
});
