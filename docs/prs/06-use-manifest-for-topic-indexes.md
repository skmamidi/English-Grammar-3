# PR 06: Use Manifest Metadata For Topic Index Pages

## Summary

Move topic index pages from full-bank metadata discovery to manifest-backed discovery. This adds immediate payload value while preserving existing quiz-page behavior.

## Domain Context

Topic index pages need:

- Subtopic title and set ID matching.
- Question counts.
- Grade/difficulty labels.
- Mixed quiz launcher metadata.
- Parent browse summary counts.

They do not need full prompt/choice/explanation payloads until a quiz actually starts.

## Failing Test First

Add a UI/network smoke test:

```js
test('topic index renders labels without loading full topic bank', async () => {
  const requests = [];
  page.on('request', req => requests.push(req.url()));

  await page.goto('/topics/grammar/index.html');
  await expectText('.subtopic-list', /Adaptive practice/);

  assert.ok(requests.some(url => url.endsWith('/assets/question-manifest.js')));
  assert.ok(!requests.some(url => url.endsWith('/assets/question-banks/grammar.js')));
});
```

This test should fail before implementation because topic indexes currently load full topic banks.

## Implementation

Add `assets/question-manifest.js` as a global:

```js
window.QUESTION_MANIFEST = { ... };
```

Update `assets/topic-index.js` to prefer manifest data:

```js
const manifest = window.QUESTION_MANIFEST;
const bank = window.QUESTION_BANK || {};
const entry = findQuestionSetManifestEntry(manifest, href) || findQuestionSetEntry(bank, href);
```

For index pages:

- Replace `<script src="../../assets/question-banks/grammar.js"></script>` with `<script src="../../assets/question-manifest.js"></script>`.
- Keep `topic-index.js`.
- Do not load `quiz-engine.js` on topic indexes unless mixed quiz still needs it.

Important design decision:

- If mixed quiz requires full questions immediately, either keep full bank loading only when mixed quiz starts, or hide/defer mixed quiz until a loader is introduced.
- Prefer a deferred mixed quiz loader over keeping full bank on index pages.

## Regression Suite Updates

- Add request-level assertions to `tests/ui-smoke.spec.js` for topic index pages.
- Add a manifest-backed unit test for `findQuestionSetEntry` equivalent behavior.
- Add all topic indexes to UI smoke with `QUESTION_BANK` absent and assert labels still render.
- Add a payload snapshot comparing index page loaded JS bytes before/after, if practical.

## Acceptance Criteria

- Topic indexes render without full question-bank files.
- Subtopic labels/counts remain correct.
- Parent browse counts remain correct.
- Mixed quiz either still works through deferred loading or is safely loaded on demand.
- Subtopic quiz pages remain unchanged.

## Rollout Risk

Medium. Topic pages also create mixed quiz launchers. Keep the PR scoped to metadata rendering first, and defer mixed quiz execution through a clear loader handoff if needed.

