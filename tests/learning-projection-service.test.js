const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildLearningProjection,
  buildParentTeacherInstitutionalReports
} = require('../server/learning-projection-service');

const verifiedEvents = [{
  eventId: 'evt-1',
  learnerId: 'learner-a',
  classId: 'class-a',
  assignmentId: 'assignment-1',
  status: 'verified',
  submittedAt: '2030-05-04T12:00:20.000Z',
  score: { correctCount: 1, totalQuestions: 2, accuracy: 0.5 },
  questionResults: [{
    questionId: 'q1',
    correct: true,
    skillIds: ['grammar.usage'],
    standardIds: ['L.3-6.1'],
    gradeLevel: 4,
    difficulty: 'easy'
  }, {
    questionId: 'q2',
    correct: false,
    skillIds: ['grammar.usage'],
    standardIds: ['L.3-6.1'],
    gradeLevel: 4,
    difficulty: 'easy'
  }]
}, {
  eventId: 'evt-2',
  learnerId: 'learner-b',
  classId: 'class-a',
  assignmentId: 'assignment-1',
  status: 'verified',
  submittedAt: '2030-05-04T12:03:20.000Z',
  score: { correctCount: 2, totalQuestions: 2, accuracy: 1 },
  questionResults: [{
    questionId: 'q3',
    correct: true,
    skillIds: ['grammar.usage'],
    standardIds: ['L.3-6.1'],
    gradeLevel: 4,
    difficulty: 'medium'
  }, {
    questionId: 'q4',
    correct: true,
    skillIds: ['grammar.sentence-analysis'],
    standardIds: ['L.3-6.1'],
    gradeLevel: 4,
    difficulty: 'medium'
  }]
}];

test('learning projections derive mastery reports and assignment completion from verified events only', () => {
  const projection = buildLearningProjection({
    learnerId: 'learner-a',
    events: verifiedEvents.concat({ learnerId: 'learner-a', status: 'provisional_local', score: { correctCount: 999, totalQuestions: 999 } })
  });

  assert.equal(projection.source, 'verified_attempt_ledger');
  assert.equal(projection.summary.totalAttempts, 1);
  assert.equal(projection.summary.totalQuestions, 2);
  assert.equal(projection.summary.accuracy, 0.5);
  assert.deepEqual(projection.assignments, [{
    assignmentId: 'assignment-1',
    classId: 'class-a',
    verifiedAttempts: 1,
    totalQuestions: 2,
    accuracy: 0.5,
    status: 'verified_complete'
  }]);
  assert.equal(projection.mastery.find(item => item.skillId === 'grammar.usage').masteryBand, 'developing');
  assertNoUnsafePayload(projection);
});

test('parent teacher and institutional reports are aggregate-safe verified summaries', () => {
  const reports = buildParentTeacherInstitutionalReports({
    events: verifiedEvents,
    linkedLearnerIds: ['learner-a'],
    classIds: ['class-a']
  });

  assert.deepEqual(reports.parent.learners.map(item => item.learnerId), ['learner-a']);
  assert.equal(reports.parent.learners[0].accuracy, 0.5);
  assert.equal(reports.teacher.classes[0].classId, 'class-a');
  assert.equal(reports.teacher.classes[0].learnerCount, 2);
  assert.equal(reports.institution.totalVerifiedAttempts, 2);
  assert.equal(reports.institution.averageAccuracy, 0.75);
  assertNoUnsafePayload(reports);
});

function assertNoUnsafePayload(payload) {
  const text = JSON.stringify(payload);
  ['question"', 'choices', 'answerKey', 'correctAnswer', 'studentName', 'email', 'providerPayload'].forEach(token => {
    assert.equal(text.includes(token), false, `projection should not include ${token}`);
  });
}
