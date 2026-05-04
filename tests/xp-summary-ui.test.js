const assert = require('node:assert/strict');
const test = require('node:test');

const { createComponentHarness } = require('./helpers/component-harness');
const xpSummaryUi = require('../assets/xp-summary-ui');

test('question XP preview is derived from the XP domain and stays provisional', () => {
  const preview = xpSummaryUi.buildQuestionXpPreview({
    question: {
      correct: true,
      difficulty: 'medium',
      questionId: 'grammar-q1',
      question: 'raw prompt should not leak',
      choices: ['hidden']
    },
    assignedGrade: 4,
    quizGrade: 5
  });

  assert.equal(preview.amount, 30);
  assert.equal(preview.state, 'preview');
  assert.match(preview.label, /\+30 XP preview/);
  assert.match(preview.copy, /server confirms/i);
  assert.equal(JSON.stringify(preview).includes('raw prompt'), false);
  assert.equal(JSON.stringify(preview).includes('hidden'), false);

  const harness = createComponentHarness();
  harness.render(xpSummaryUi.renderQuestionXpPreview(preview));
  assert.equal(harness.getByRole('status', { name: 'XP preview' }).attrs['aria-live'], 'polite');
  assert.equal(harness.queryByText('+30 XP preview').text.includes('server confirms'), true);
  harness.assertNoUnsafeCopy();
});

test('quiz XP completion summary separates base XP multiplier and reconciliation state', () => {
  const summary = xpSummaryUi.buildQuizXpCompletionSummary({
    questions: [
      { correct: true, difficulty: 'easy', questionId: 'q1' },
      { correct: true, difficulty: 'easy', questionId: 'q2' },
      { correct: true, difficulty: 'easy', questionId: 'q3' },
      { correct: false, difficulty: 'easy', questionId: 'q4' }
    ],
    assignedGrade: 4,
    quizGrade: 4,
    awardState: 'provisional',
    offline: true
  });

  assert.equal(summary.baseCorrectXp, 30);
  assert.equal(summary.completionMultiplierBps, 11000);
  assert.equal(summary.multiplierLabel, '1.1x accuracy boost');
  assert.equal(summary.provisionalXp, 33);
  assert.equal(summary.state, 'provisional');
  assert.match(summary.statusCopy, /saved on this device/i);
  assert.match(summary.retryCopy, /review missed items/i);

  const synced = xpSummaryUi.buildQuizXpCompletionSummary(Object.assign({}, summary.source, {
    awardState: 'synced',
    syncedXp: 33
  }));
  assert.equal(synced.state, 'synced');
  assert.equal(synced.finalXp, 33);
  assert.match(synced.statusCopy, /server confirmed/i);

  const duplicate = xpSummaryUi.buildQuizXpCompletionSummary(Object.assign({}, summary.source, {
    awardState: 'duplicate',
    syncedXp: 0
  }));
  assert.equal(duplicate.finalXp, 0);
  assert.match(duplicate.statusCopy, /already counted/i);
});

test('completion summary markup is accessible and avoids animation-dependent copy', () => {
  const summary = xpSummaryUi.buildQuizXpCompletionSummary({
    questions: [
      { correct: true, difficulty: 'hard' },
      { correct: true, difficulty: 'hard' }
    ],
    assignedGrade: 4,
    quizGrade: 6,
    awardState: 'syncing'
  });
  const harness = createComponentHarness();

  harness.render(xpSummaryUi.renderQuizXpCompletionSummary(summary));

  assert.equal(harness.getByRole('status', { name: 'XP award status' }).attrs['aria-live'], 'polite');
  assert.equal(harness.queryByText('Base XP').text.includes('120'), true);
  assert.equal(harness.queryByText('Completion boost').text.includes('3x'), true);
  assert.equal(harness.queryByText('Syncing XP').text.includes('final total'), true);
  harness.assertNoOverflowText({ maxWordLength: 28 });
  harness.assertNoUnsafeCopy();
});
