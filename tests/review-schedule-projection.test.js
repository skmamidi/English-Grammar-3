const assert = require('node:assert/strict');
const test = require('node:test');

const { projectDueReview } = require('../assets/review-schedule-projection');

test('review schedule projection returns due refs, due skills, overdue count, and next due date', () => {
  const projection = projectDueReview({
    schedules: [{
      ref: { id: 'grammar-sentence-types-q0001', sourceSet: 'grammar-sentence-types' },
      skillIds: ['grammar.sentence-analysis'],
      dueAt: '2030-04-29T11:00:00.000Z',
      intervalDays: 2,
      ease: 2.4
    }, {
      ref: { id: 'grammar-sentence-types-q0002', sourceSet: 'grammar-sentence-types' },
      skillIds: ['grammar.sentence-analysis', 'grammar.fragments'],
      dueAt: '2030-04-30T12:00:00.000Z',
      intervalDays: 2,
      ease: 2.4
    }, {
      ref: { id: 'punctuation-commas-series-q0001', sourceSet: 'punctuation-commas-series' },
      skillIds: ['punctuation.commas'],
      dueAt: '2030-04-28T12:00:00.000Z',
      intervalDays: 1,
      ease: 2
    }],
    mastery: {
      skills: {
        'grammar.fragments': { correct: 1, total: 4 },
        'grammar.sentence-analysis': { correct: 5, total: 5 }
      }
    },
    now: '2030-04-29T12:00:00.000Z'
  });

  assert.deepEqual(projection.dueQuestionRefs.map(ref => ref.id), [
    'punctuation-commas-series-q0001',
    'grammar-sentence-types-q0001'
  ]);
  assert.deepEqual(projection.dueSkillIds, ['grammar.fragments']);
  assert.equal(projection.overdueCount, 2);
  assert.equal(projection.nextDueAt, '2030-04-30T12:00:00.000Z');
});

test('review schedule projection ignores invalid schedule entries', () => {
  const projection = projectDueReview({
    schedules: [{ ref: { id: '' }, dueAt: '2030-04-29T12:00:00.000Z' }],
    now: '2030-04-29T12:00:00.000Z'
  });

  assert.deepEqual(projection, {
    dueQuestionRefs: [],
    dueSkillIds: [],
    overdueCount: 0,
    nextDueAt: ''
  });
});
