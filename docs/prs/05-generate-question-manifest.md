# PR 05: Generate A Question Manifest From Stable IDs And Metadata

## Summary

Add a generated manifest that summarizes question-bank structure without loading every full question. This creates the first architecture layer needed for later subtopic chunking and lighter topic pages.

## Domain Context

The app currently uses full question banks for two different jobs:

- Metadata discovery: set titles, counts, grades, difficulties, question IDs, versions, hashes.
- Quiz execution: prompts, choices, explanations, study aids, scenes.

Those should be separate. A manifest gives the app a small authoritative index while keeping current bank loading intact.

## Failing Test First

Add a manifest test:

```js
test('generated manifest matches loaded question banks', () => {
  const banks = validateContent();
  const manifest = generateManifest(banks.bankLoad);

  assert.equal(manifest.totalQuestions, banks.questions.length);
  assert.equal(manifest.sets.length, banks.sets.length);
  assert.ok(manifest.sets.every(set => set.id && set.questionCount > 0));
});
```

Add a stale-manifest test:

```js
test('manifest check fails when bank counts drift', () => {
  const manifest = loadManifest();
  manifest.totalQuestions += 1;
  assert.throws(() => validateManifest(manifest, loadQuestionBanks()));
});
```

## Implementation

Create `scripts/generate-question-manifest.js`.

Output: `assets/question-manifest.js` or `assets/question-manifest.json`.

Recommended manifest shape:

```json
{
  "generatedAt": "2026-04-29T00:00:00.000Z",
  "schemaVersion": 1,
  "totalQuestions": 10240,
  "sets": [{
    "id": "grammar-sentence-types",
    "title": "Sentence Types",
    "topic": "Grammar & Usage",
    "domain": "grammar",
    "bankFile": "assets/question-banks/grammar.js",
    "questionCount": 120,
    "gradesSupported": [3, 4, 5, 6],
    "difficultiesSupported": ["easy", "medium", "hard"],
    "questions": [{
      "id": "grammar-sentence-types-q0001",
      "version": 1,
      "contentHash": "sha256:...",
      "sequence": 1,
      "gradeLevels": [3, 4, 5, 6],
      "difficultyByGrade": { "4": "medium" },
      "skills": ["sentence types"]
    }]
  }]
}
```

Keep the manifest generated from existing banks. Do not hand-edit it.

## Regression Suite Updates

- Add `npm run qa:manifest`.
- Add `tests/manifest.test.js`.
- Update `npm test` to run manifest validation.
- Add QA output showing manifest size and total question count.
- Add a stale manifest check that fails if generated manifest is out of sync.

## Acceptance Criteria

- Manifest is generated from current banks.
- Manifest validation passes in the default test gate.
- Manifest contains enough data for topic index labels and future chunk lookup.
- No runtime behavior changes yet.
- Generated file is deterministic except for optional `generatedAt`; prefer omitting `generatedAt` or using a stable build timestamp in tests.

## Rollout Risk

Low. This PR adds a read-only generated artifact and validation. Avoid changing app runtime until the next PR.

