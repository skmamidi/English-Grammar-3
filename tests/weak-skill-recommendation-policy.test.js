const assert = require('node:assert/strict');
const test = require('node:test');

const policy = require('../assets/weak-skill-recommendation-policy');

test('weak skill policy exposes deterministic conservative defaults', () => {
  assert.equal(policy.DEFAULT_WEAK_SKILL_POLICY.minimumAttempts, 3);
  assert.equal(policy.DEFAULT_WEAK_SKILL_POLICY.lowAccuracyThreshold, 0.7);
  assert.equal(policy.DEFAULT_WEAK_SKILL_POLICY.maxRecommendations, 3);
  assert.deepEqual(policy.DEFAULT_WEAK_SKILL_POLICY.reasonPriority, [
    'overdue_review',
    'assignment_struggle',
    'low_recent_accuracy',
    'missed_recently',
    'low_attempt_count'
  ]);
});

