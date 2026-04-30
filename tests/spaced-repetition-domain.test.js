const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyReviewOutcomes,
  normalizeScheduleEntry,
  normalizeSchedules
} = require('../assets/spaced-repetition-domain');

const NOW = '2030-04-29T12:00:00.000Z';

test('spaced repetition scheduler stores refs only and schedules first miss tomorrow', () => {
  const schedules = applyReviewOutcomes([], [{
    questionRef: {
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: 'sha256:abc',
      sequence: 1
    },
    skillIds: ['grammar.sentence-analysis'],
    correct: false,
    question: 'do not persist payload'
  }], { now: NOW });

  assert.equal(schedules.length, 1);
  assert.equal(schedules[0].ref.id, 'grammar-sentence-types-q0001');
  assert.deepEqual(schedules[0].skillIds, ['grammar.sentence-analysis']);
  assert.equal(schedules[0].intervalDays, 1);
  assert.equal(schedules[0].dueAt, '2030-04-30T12:00:00.000Z');
  assert.equal(schedules[0].lapses, 1);
  assert.equal(JSON.stringify(schedules).includes('do not persist payload'), false);
});

test('spaced repetition scheduler schedules first correct in two days', () => {
  const schedules = applyReviewOutcomes([], [{
    questionRef: {
      id: 'grammar-sentence-types-q0002',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: 'sha256:def',
      sequence: 2
    },
    skillIds: ['grammar.sentence-analysis'],
    correct: true
  }], { now: NOW });

  assert.equal(schedules[0].intervalDays, 2);
  assert.equal(schedules[0].ease, 2.4);
  assert.equal(schedules[0].streak, 1);
  assert.equal(schedules[0].lapses, 0);
  assert.equal(schedules[0].dueAt, '2030-05-01T12:00:00.000Z');
});

test('spaced repetition scheduler grows repeated correct intervals conservatively', () => {
  const first = applyReviewOutcomes([], [outcome('grammar-sentence-types-q0003', true)], { now: NOW });
  const second = applyReviewOutcomes(first, [outcome('grammar-sentence-types-q0003', true)], {
    now: '2030-05-01T12:00:00.000Z'
  });
  const third = applyReviewOutcomes(second, [outcome('grammar-sentence-types-q0003', true)], {
    now: '2030-05-06T12:00:00.000Z'
  });

  assert.equal(first[0].intervalDays, 2);
  assert.equal(second[0].intervalDays, 5);
  assert.equal(third[0].intervalDays, 12);
  assert.equal(third[0].streak, 3);
  assert.equal(third[0].dueAt, '2030-05-18T12:00:00.000Z');
});

test('spaced repetition scheduler resets interval and increments lapses after a miss', () => {
  const prior = applyReviewOutcomes([], [outcome('grammar-sentence-types-q0004', true)], { now: NOW });
  const missed = applyReviewOutcomes(prior, [outcome('grammar-sentence-types-q0004', false)], {
    now: '2030-05-01T12:00:00.000Z'
  });

  assert.equal(missed[0].intervalDays, 1);
  assert.equal(missed[0].streak, 0);
  assert.equal(missed[0].lapses, 1);
  assert.equal(missed[0].dueAt, '2030-05-02T12:00:00.000Z');
});

test('spaced repetition scheduler normalizes corrupt entries away', () => {
  assert.deepEqual(normalizeSchedules([
    null,
    { ref: { id: '' } },
    normalizeScheduleEntry({
      ref: { id: 'grammar-sentence-types-q0005', sourceSet: 'grammar-sentence-types' },
      skillIds: ['grammar.sentence-analysis', 'grammar.sentence-analysis'],
      intervalDays: -3,
      ease: 0,
      dueAt: 'not a date',
      lastReviewedAt: NOW,
      streak: -1,
      lapses: -1
    })
  ]), [{
    ref: {
      id: 'grammar-sentence-types-q0005',
      sourceSet: 'grammar-sentence-types',
      version: 0,
      contentHash: '',
      sequence: 0
    },
    skillIds: ['grammar.sentence-analysis'],
    intervalDays: 1,
    ease: 2,
    dueAt: '',
    lastReviewedAt: NOW,
    streak: 0,
    lapses: 0
  }]);
});

function outcome(id, correct) {
  return {
    questionRef: {
      id,
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: `sha256:${id}`,
      sequence: Number(id.slice(-4))
    },
    skillIds: ['grammar.sentence-analysis'],
    correct
  };
}
