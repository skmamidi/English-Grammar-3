# PR 19: Add Strong JSON Schema Validation for Question Authoring

## Summary

Add strict schema validation for canonical JSON question-bank sources. The validator should catch authoring mistakes before manifest generation, chunk generation, UI smoke, or runtime behavior can drift.

This PR builds on PR 17 and PR 18. Once JSON is the source of truth and generated artifacts come from JSON, schema validation becomes the first line of defense for content quality.

## Motivation

As the question bank grows, content authoring errors become more likely and more expensive to find manually. Stable question ids and version metadata protect identity, but we also need authoring-level validation for structure, metadata, choices, answers, difficulty coverage, and rendering-sensitive fields.

Schema validation should make invalid content fail fast in CI with clear, domain-oriented errors.

## Domain Model

Validate at three levels:

1. Domain file.
2. Question set.
3. Individual question.

The validator should understand domain rules, not just generic JSON syntax.

Examples:

- Domain file id must match filename.
- Set id must match `metadata.sourceSet` on each question.
- Question sequence must be unique within a set.
- Question id must be stable and match the expected domain/set prefix convention.
- `contentHash` must match the hash contract.
- `version` must be a positive integer.
- Choices must be non-empty when the question type requires choices.
- Correct answer must map to a valid choice when applicable.
- Grade and difficulty metadata must be valid.

## Implementation Plan

### 1. Add Schema Files

Create:

```text
schemas/question-bank.schema.json
schemas/question-set.schema.json
schemas/question.schema.json
```

Start with a pragmatic schema that captures the stable contract without overfitting every optional field.

Required domain file fields:

- `schemaVersion`
- `domain`
- `sets`

Required set fields:

- `title`
- `topic`
- `questions`

Required question fields:

- `id`
- `version`
- `contentHash`
- `question`
- `metadata`

Required question metadata fields:

- `sourceSet`
- `sequence`
- `gradeLevels`
- `difficultyByGrade`
- `skills`

### 2. Add a Domain-Aware Validator

Create:

```text
scripts/qa/question-source-schema-qa.js
```

Responsibilities:

- Load every JSON source file.
- Validate JSON syntax.
- Validate schema shape.
- Validate domain-specific invariants.
- Recompute and verify `contentHash`.
- Verify question ids are unique globally.
- Verify question ids are unique within each set.
- Verify `metadata.sequence` is unique within each set.
- Verify `metadata.sourceSet` equals the containing set id.
- Verify versions are positive integers.
- Verify each set has at least one question.
- Emit clear errors with file, set id, question id, and sequence.

Add package script:

```json
{
  "qa:schema": "node scripts/qa/question-source-schema-qa.js"
}
```

Add it to:

```json
{
  "qa:questions": "npm run qa:schema && npm run qa:json-source && npm run qa:manifest && npm run qa:chunks",
  "test": "npm run qa:content && npm run qa:questions && npm run test:unit && npm run test:ui"
}
```

### 3. Choose Validation Implementation

Prefer a dependency-light validator unless a schema library is already present.

Option A: hand-written validator.

- Best if avoiding new dependencies.
- Easier to produce domain-specific messages.
- Good fit because the app already has custom QA scripts.

Option B: JSON Schema library such as Ajv.

- Best if strict JSON Schema compatibility matters.
- Requires adding and locking a dev dependency.
- Still needs custom domain-invariant checks after schema validation.

Recommended first implementation: hand-written domain validator plus JSON schema files as documentation and future compatibility targets.

### 4. Add Negative Fixture Tests

Create fixture files under:

```text
tests/fixtures/question-source-invalid/
```

Add tests:

```text
tests/question-source-schema.test.js
```

Cover failures for:

- Missing `id`.
- Duplicate question id.
- Duplicate sequence.
- Invalid version.
- Wrong `metadata.sourceSet`.
- Missing `contentHash`.
- Stale `contentHash`.
- Empty choices for multiple choice question.
- Correct answer not present in choices.
- Invalid difficulty value.
- Invalid grade level.
- Domain mismatch between filename and JSON `domain`.

Also add a positive test against real source files.

### 5. Integrate with Existing Content QA

Keep `content-qa.js` focused on pedagogical and content coverage checks.

Let `question-source-schema-qa.js` own structural source validity.

The two suites should complement each other:

- Schema QA: source is valid and internally consistent.
- Content QA: content coverage and app-specific quality rules are acceptable.

### 6. Add Authoring Guidance

Update docs with authoring rules:

- Add a new question with a stable id.
- Use the next sequence number in the set.
- Increment `version` when changing content meaning.
- Regenerate `contentHash` when content changes.
- Run schema QA before generating artifacts.
- Run full question QA before opening a PR.

If no helper exists for hash updates, add or extend a script:

```bash
node scripts/assign-question-ids.js --update-hashes
```

or create:

```bash
node scripts/update-question-hashes.js --write
```

## Test-Driven Workflow

1. Add invalid fixtures and failing tests.
2. Implement schema validator.
3. Add real-source positive validation.
4. Integrate validator into package scripts.
5. Update docs.
6. Run full question and UI QA.

## Acceptance Criteria

- All canonical JSON source files pass schema validation.
- Invalid fixture tests fail with clear messages.
- Duplicate ids fail validation.
- Duplicate sequences fail validation.
- Stale content hashes fail validation.
- Invalid `sourceSet` values fail validation.
- Invalid answer/choice combinations fail validation.
- `qa:schema` runs before manifest and chunk validation in the question QA flow.
- CI fails before artifact generation if JSON source is structurally invalid.

## Verification

Run:

```bash
npm run qa:schema
npm run qa:questions
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
npm test
```

## Risk Notes

- Avoid over-tightening the schema around fields that legitimately vary by question type.
- Use custom domain checks for identity, sequence, and hash rules.
- Keep error messages author-friendly; a schema failure should point to the exact file, set, and question.
- Introduce stricter optional-field rules gradually if existing content has valid variation.
