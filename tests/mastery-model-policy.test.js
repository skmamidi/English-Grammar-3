const assert = require('node:assert/strict');
const test = require('node:test');

const policy = require('../assets/mastery-model-policy');

test('mastery model policy exposes explicit cautious thresholds and reason labels', () => {
  const model = policy.normalizeMasteryModelPolicy();

  assert.equal(model.minimumAttempts, 3);
  assert.equal(model.lowAccuracyThreshold, 0.7);
  assert.equal(model.recoveryAccuracyThreshold, 0.8);
  assert.equal(model.recencyWindowDays, 14);
  assert.equal(model.maxRecommendations, 3);
  assert.deepEqual(model.masteryBands.map(band => band.code), [
    'insufficient_evidence',
    'needs_practice',
    'developing',
    'secure'
  ]);
  assert.deepEqual(Object.keys(model.reasonLabels).sort(), [
    'assignment_struggle',
    'low_attempt_count',
    'low_recent_accuracy',
    'missed_recently',
    'overdue_review'
  ]);
});

test('mastery model policy classifies sparse and recovered histories without diagnostic claims', () => {
  const model = policy.normalizeMasteryModelPolicy();

  assert.equal(policy.classifyMasteryBand({ attempts: 1, weightedAccuracy: 0 }, model), 'insufficient_evidence');
  assert.equal(policy.classifyMasteryBand({ attempts: 4, weightedAccuracy: 0.49 }, model), 'needs_practice');
  assert.equal(policy.classifyMasteryBand({ attempts: 4, weightedAccuracy: 0.75 }, model), 'developing');
  assert.equal(policy.classifyMasteryBand({ attempts: 4, weightedAccuracy: 0.84 }, model), 'secure');
  assert.equal(JSON.stringify(model).includes('diagnosis'), false);
});

test('mastery model policy weights difficulty without over-penalizing hard misses', () => {
  const model = policy.normalizeMasteryModelPolicy();
  const easyMiss = policy.scoreAttempt({ correct: false, difficulty: 'easy' }, model);
  const hardMiss = policy.scoreAttempt({ correct: false, difficulty: 'hard' }, model);
  const hardCorrect = policy.scoreAttempt({ correct: true, difficulty: 'hard' }, model);

  assert.equal(easyMiss.weight, 1);
  assert.equal(hardMiss.weight, 0.75);
  assert.equal(hardCorrect.weight, 1.15);
  assert.equal(hardMiss.earned, 0);
  assert.equal(hardCorrect.earned, 1.15);
});
