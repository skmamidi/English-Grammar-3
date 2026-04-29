# PR 07: Add Question Loader Abstraction And Pilot One Chunked Domain

## Summary

Introduce a question loading abstraction, then pilot subtopic-level chunking on one small domain. This is the first runtime architecture change toward lighter quiz pages, but it is limited to one domain to keep rollback simple.

## Domain Context

The app should eventually support:

- Loading one subtopic for a subtopic quiz.
- Loading selected subtopics for mixed quizzes.
- Resolving active quiz `questionRefs`.
- Keeping reports readable from saved snapshots.

A loader abstraction lets the app support current global banks and future chunks behind one domain API.

## Failing Test First

Add loader contract tests:

```js
test('loader resolves a set by id from existing global banks', async () => {
  const set = await loader.loadSet('grammar-sentence-types');
  assert.equal(set.id, 'grammar-sentence-types');
  assert.ok(set.questions.length > 0);
});

test('loader resolves a set by id from chunk manifest', async () => {
  const set = await loader.loadSet('capitalization-proper-names-titles');
  assert.ok(set.questions.every(q => q.id.startsWith('capitalization-proper-names-titles-q')));
});
```

Add browser tests:

- Subtopic page requests only its chunk for the pilot domain.
- Non-pilot domains still load through existing bank scripts.
- Quiz flow works in both modes.

## Implementation

Create `assets/question-loader.js`:

```js
window.GrammarQuestQuestionLoader = {
  loadSet,
  loadSets,
  getManifestEntry,
  hydrateQuestionRefs
};
```

Initial behavior:

- If `window.QUESTION_BANK[setId]` exists, return it.
- Else consult `window.QUESTION_MANIFEST`.
- Fetch/load the chunk path from the manifest.
- Cache loaded sets in memory.

Pilot chunking:

- Choose `capitalization` because it is small and lower risk.
- Generate `assets/question-chunks/capitalization/<setId>.js` or `.json`.
- Keep original `assets/question-banks/capitalization.js` during the transition.
- Update capitalization subtopic pages to load manifest + loader instead of full bank.

Update `quiz-engine.js` startup:

```js
async function initQuiz(setId) {
  const set = await loadQuestionSet(setId);
  ...
}
```

Keep current synchronous path as fallback until all pages migrate.

## Regression Suite Updates

- Add `tests/question-loader.test.js`.
- Add UI smoke request assertions for pilot capitalization subtopic pages.
- Add all-subtopic smoke to cover both legacy and loader-backed pages.
- Add manifest validation that each chunk path exists.
- Add active quiz resume test for a loader-backed page.

## Acceptance Criteria

- Pilot domain subtopic pages load only the needed set chunk.
- Existing non-pilot domains continue working.
- Parent preview still does not mutate progress.
- Active quiz save/resume still works with `questionRefs`.
- Reports still store full snapshots plus stable identity.
- Fallback to global banks remains available.

## Rollout Risk

Medium to high. This is the first runtime loading change. Limit the pilot to one domain, keep old bank files, and use request-level UI smoke tests to prove payload reduction.

