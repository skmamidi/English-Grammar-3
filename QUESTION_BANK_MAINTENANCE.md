# Question Bank Maintenance

## Stable Question Identity

Every question must include durable identity metadata:

```js
{
  id: "grammar-sentence-types-q0001",
  version: 1,
  contentHash: "sha256:...",
  metadata: {
    sourceSet: "grammar-sentence-types",
    sequence: 1
  }
}
```

- `id` is permanent. Do not change it when moving a question between files or chunks.
- `version` starts at `1` and increments when learner-facing content changes.
- `contentHash` is generated from learner-facing fields: `question`, `choices`, `correct`, `explanation`, `studyAid`, and `visualScene`.
- `visualScene` is reserved for authored, learner-facing scene content stored in the question bank. It participates in `contentHash`.
- `generatedVisualScene` is reserved for runtime/adaptive renderer output and saved quiz snapshots. It does not participate in `contentHash`.
- `metadata.sourceSet` must match the containing question set.
- `metadata.sequence` must be unique inside the set and align with the generated ID suffix.

## Versioning Rules

- Fixing a typo in a prompt, choice, explanation, study aid, or visual scene increments `version`.
- Editing runtime scene-generation code or generated/adaptive scene output does not increment question `version`.
- Changing `correct` increments `version`.
- Changing grade or difficulty metadata does not increment `version` unless it changes learner-facing selection expectations.
- Moving a question between files or future chunks keeps the same `id`.
- Moving a question to a different set usually gets a new `id`, unless reports should follow the exact same editorial question.
- Deleting a question does not make its `id` reusable.
- Replacing a question with materially different content gets a new `id`.

## Tools

Run this after adding questions or editing learner-facing question content:

```sh
node scripts/assign-question-ids.js
```

Run the content consistency check before committing:

```sh
node scripts/check-question-consistency.js
```
