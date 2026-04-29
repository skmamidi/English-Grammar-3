# PR 03: Extract Shared Quiz Domain Kernel For Selection And Identity

## Summary

Replace duplicated test-only quiz logic with a shared domain module used by both the browser app and Node tests. This makes quiz selection, identity, and serialization tests exercise the same logic production uses.

## Domain Context

Quiz selection is core domain behavior:

- Grade and difficulty filtering.
- Exact-match priority.
- Adjacent/fallback selection.
- Mixed quiz balancing by subtopic.
- Parent preview including the full pool.

Right now, `scripts/qa/quiz-contracts.js` mirrors production logic. That lowers confidence because tests can pass while `assets/quiz-engine.js` drifts.

## Failing Test First

Add a drift-detection test before refactoring:

```js
test('QA selector and browser selector agree on representative bank fixtures', async () => {
  const fixture = loadQuestionSet('grammar-sentence-types');
  const qaSelected = selectQuestionsForLevel(fixture.questions, '4', 'medium', deterministicOptions);
  const browserSelected = await evaluateRealQuizSelector(fixture.questions, '4', 'medium');

  assert.deepEqual(
    browserSelected.map(q => q.id),
    qaSelected.map(q => q.id)
  );
});
```

This test is expected to be awkward before extraction. Its purpose is to prove why the shared module is needed.

## Implementation

Create `assets/quiz-domain.js` as a browser/Node compatible module:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestQuizDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  return {
    selectQuestionsForLevel,
    selectCurrentQuestions,
    selectMixedQuestions,
    fillQuestionGroup,
    questionSupportsGrade,
    getDifficultyDistance,
    getQuestionId,
    getQuestionRef,
    getAttemptQuestionId
  };
});
```

Move pure functions out of `assets/quiz-engine.js`:

- `selectQuestionsForLevel`
- `selectCurrentQuestions`, if it can be made state-explicit
- `selectMixedQuestions`
- `fillQuestionGroup`
- `questionSupportsGrade`
- `getDifficultyDistance`
- `difficultyRank`
- `getQuestionId`
- `getQuestionRef`
- `getAttemptQuestionId`

Keep DOM/stateful orchestration in `quiz-engine.js`.

Update HTML pages to load `quiz-domain.js` before `quiz-engine.js`, or have `quiz-engine.js` define a fallback error if missing.

## Regression Suite Updates

- Replace imports from `scripts/qa/quiz-contracts.js` with imports from `assets/quiz-domain.js`.
- Reduce `scripts/qa/quiz-contracts.js` to contract validators only, or delete it if obsolete.
- Add tests that compare deterministic selection IDs for representative real sets.
- Add a browser smoke assertion that `window.GrammarQuestQuizDomain` exists before quiz start.

## Acceptance Criteria

- Production and tests use the same selection/identity code.
- Existing quiz flows behave the same.
- Unit tests cover pure domain logic without browser setup.
- UI smoke still passes.
- `scripts/qa/quiz-contracts.js` no longer duplicates production selection behavior.

## Rollout Risk

Medium. This touches quiz startup and selection. Keep the PR narrow: extract without changing algorithms. Use deterministic shuffle injection in tests to avoid random failures.

