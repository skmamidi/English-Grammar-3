const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildQuestionMediaPrefetchPlan,
  normalizeQuestionMediaRef,
  validateQuestionMediaPrefetchPlan
} = require('../assets/question-media-preload-policy');

test('media prefetch plan includes current question plus next two only', () => {
  const plan = buildQuestionMediaPrefetchPlan({
    currentIndex: 1,
    questions: [
      question('q0', ['/assets/audio/spelling/previous.wav']),
      question('q1', ['/assets/audio/spelling/current.wav']),
      question('q2', ['/assets/images/questions/next.webp']),
      question('q3', ['/assets/audio/spelling/after-next.wav']),
      question('q4', ['/assets/audio/spelling/too-far.wav'])
    ],
    maxAhead: 2,
    maxBytes: 20 * 1024
  });

  assert.deepEqual(plan.mediaRefs.map(ref => ref.questionId), ['q1', 'q2', 'q3']);
  assert.equal(plan.mediaRefs.some(ref => ref.url.includes('too-far')), false);
  assert.equal(plan.window.currentIndex, 1);
  assert.equal(plan.window.endIndex, 3);
  assert.deepEqual(validateQuestionMediaPrefetchPlan(plan).errors, []);
});

test('media prefetch respects save-data slow networks and byte budgets', () => {
  const plan = buildQuestionMediaPrefetchPlan({
    currentIndex: 0,
    questions: [
      question('q1', ['/assets/audio/spelling/current.wav'], { required: true, bytes: 8192 }),
      question('q2', ['/assets/audio/spelling/next.wav'], { bytes: 8192 }),
      question('q3', ['/assets/images/questions/after-next.webp'], { bytes: 8192 })
    ],
    networkInfo: { saveData: true, effectiveType: '2g' },
    maxBytes: 10 * 1024
  });

  assert.deepEqual(plan.mediaRefs.map(ref => ref.questionId), ['q1']);
  assert.equal(plan.policy.saveDataRestricted, true);
  assert.ok(plan.totalBytes <= 10 * 1024);
});

test('media refs normalize to immutable cacheable assets without learner or answer data', () => {
  const ref = normalizeQuestionMediaRef({
    questionId: 'q1',
    type: 'audio',
    url: '/assets/audio/spelling/current.wav',
    bytes: 2048,
    contentHash: 'sha256:abcdef123456',
    learnerId: 'learner-unsafe',
    answerKey: 'choice-a'
  });

  assert.deepEqual(ref, {
    questionId: 'q1',
    type: 'audio',
    url: '/assets/audio/spelling/current.wav',
    bytes: 2048,
    contentHash: 'sha256:abcdef123456',
    required: false,
    cacheTarget: 'cacheAPI'
  });
});

function question(questionId, urls, options = {}) {
  return {
    questionId,
    mediaRefs: urls.map(url => ({
      questionId,
      type: url.includes('/images/') ? 'image' : 'audio',
      url,
      bytes: options.bytes || 4096,
      contentHash: 'sha256:abcdef123456',
      required: options.required === true
    }))
  };
}
