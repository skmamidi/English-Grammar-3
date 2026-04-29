# PR 04: Define Visual Scene Versioning And Content Hash Contract

## Summary

Clarify whether visual scenes are learner-facing versioned content or generated rendering-layer enhancements. Update hashing, docs, and tests so the contract is unambiguous.

## Domain Context

Question versioning exists to answer: “Did the learner-facing question content change?” Visual scenes can be either:

- Versioned content: authored scene data is part of the question and should affect `contentHash`.
- Rendering content: generated at runtime from question metadata and app code, so it should not affect question content identity.

Currently `contentHash` includes `visualScene`, but `visual-question-scenes.js` mutates questions after bank load. That creates ambiguity.

## Recommended Decision

Use a two-part contract:

- Authored `visualScene` stored in the question bank is learner-facing and included in `contentHash`.
- Generated/adaptive visual scenes are rendering-layer output and excluded from question content identity.

This preserves editorial accountability for hand-authored scenes while avoiding hash drift from renderer changes.

## Failing Test First

Add tests to `tests/content.test.js`:

```js
test('authored visualScene participates in contentHash', () => {
  const before = computeContentHash(questionWithAuthoredScene);
  questionWithAuthoredScene.visualScene.dialogue[0].text = 'Changed';
  assert.notEqual(computeContentHash(questionWithAuthoredScene), before);
});

test('generated visual scene is not required for contentHash validation', () => {
  const bankQuestion = loadQuestionWithoutRuntimeScene();
  assert.equal(bankQuestion.contentHash, computeContentHash(bankQuestion));
});
```

Add a UI smoke assertion that adaptive scene rendering still appears after quiz start, but does not imply hash mutation.

## Implementation

Update `scripts/qa/question-metadata.js` to distinguish authored and generated scene fields.

Preferred shape:

```js
const HASH_FIELDS = [
  'question',
  'choices',
  'correct',
  'explanation',
  'studyAid',
  'visualScene'
];
```

Keep this only if `visualScene` means authored bank content.

Then update `assets/visual-question-scenes.js` so generated scenes do not overwrite the versioned field:

```js
if (!question.visualScene) {
  question.generatedVisualScene = buildAdaptiveScene(setId, set, question, index);
}
```

Update `quiz-engine.js` rendering to use:

```js
const scene = question.visualScene || question.generatedVisualScene;
```

Alternative if you do not want authored scenes versioned: remove `visualScene` from `HASH_FIELDS` and update `QUESTION_BANK_MAINTENANCE.md`.

## Regression Suite Updates

- Content QA validates `contentHash` from bank-authored fields only.
- UI smoke verifies representative visual quiz still renders a scene.
- Add a test ensuring `assign-question-ids.js` does not change hashes merely because generated scenes exist at runtime.
- Update `QUESTION_BANK_MAINTENANCE.md` with explicit rules.

## Acceptance Criteria

- The hash contract is documented and test-covered.
- Runtime scene generation does not make stored hashes stale.
- Authored scene edits either intentionally change hashes or are explicitly excluded.
- Visual quiz rendering remains unchanged for learners.

## Rollout Risk

Medium. This touches visual rendering paths. Keep field migration small and support both `visualScene` and `generatedVisualScene` during transition.

