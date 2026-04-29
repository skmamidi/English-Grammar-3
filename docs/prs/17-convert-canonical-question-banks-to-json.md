# PR 17: Convert Canonical Question Banks from JavaScript to JSON

## Summary

Convert canonical question-bank authoring files from executable JavaScript to data-only JSON while keeping the existing runtime generated artifacts intact. This PR should make JSON the source of truth for question content, but should not yet require browser pages to load JSON directly.

The browser can continue consuming generated manifest and chunk JavaScript files. This keeps the runtime delivery model stable while improving the authoring and validation boundary.

## Motivation

The question bank is growing and will soon be much larger. Keeping canonical content in `.js` files makes authoring validation harder because data loading requires executing code in a VM-like environment. JSON gives us a safer and clearer content contract:

- Question banks become pure data.
- Content diffs are easier to review.
- Schema validation can run without evaluating executable files.
- Generation tools can consume the same source format in Node and CI.
- Future server-side selection can reuse the same canonical data files.

## Domain Model

Introduce a canonical content shape:

```json
{
  "schemaVersion": 1,
  "domain": "punctuation",
  "sets": {
    "punctuation-commas-series": {
      "title": "Commas in a Series",
      "topic": "punctuation",
      "metadata": {},
      "questions": []
    }
  }
}
```

The domain file represents one bounded content domain:

- `capitalization`
- `grammar`
- `punctuation`
- `reading-comprehension`
- `reference-skills`
- `vocabulary`

The set id remains the aggregate identity for a question set. Individual question `id`, `version`, `contentHash`, and `metadata.sourceSet` remain unchanged.

## Implementation Plan

### 1. Add JSON Bank Directory

Create:

```text
assets/question-bank-source/
```

Add one JSON file per domain:

```text
assets/question-bank-source/capitalization.json
assets/question-bank-source/grammar.json
assets/question-bank-source/punctuation.json
assets/question-bank-source/reading-comprehension.json
assets/question-bank-source/reference-skills.json
assets/question-bank-source/vocabulary.json
```

Do not remove `assets/question-banks/*.js` in this PR unless every consumer has moved away from those files. Treat the JavaScript banks as legacy runtime artifacts until PR 18 completes the generation path.

### 2. Add a Conversion Script

Create:

```text
scripts/convert-question-banks-to-json.js
```

Responsibilities:

- Load existing `assets/question-banks/*.js` with the current trusted loader.
- Convert each domain bank to the JSON source shape.
- Preserve exact set ids and question objects.
- Write deterministic JSON with stable key ordering.
- Support dry run by default.
- Support `--write`.
- Fail if the generated JSON would differ in dry-run mode.

Suggested CLI:

```bash
node scripts/convert-question-banks-to-json.js
node scripts/convert-question-banks-to-json.js --write
```

Add package script:

```json
{
  "json:write": "node scripts/convert-question-banks-to-json.js --write",
  "qa:json-source": "node scripts/convert-question-banks-to-json.js"
}
```

### 3. Teach QA Loader to Read JSON Sources

Update `scripts/qa/bank-loader.js` to support both source modes:

- Prefer JSON files in `assets/question-bank-source/` when present.
- Fall back to legacy `assets/question-banks/*.js` during the transition.
- Keep the returned shape compatible with existing callers:
  - `files`
  - `bank`
  - `relativeFile`
  - `bytes`

Add explicit source metadata:

```js
{
  sourceType: 'json',
  relativeFile: 'assets/question-bank-source/punctuation.json'
}
```

This keeps content QA, manifest generation, chunk generation, and tests insulated from the physical source format.

### 4. Add Tests First

Add tests before changing the loader behavior:

```text
tests/question-bank-json-source.test.js
```

Coverage:

- Conversion output preserves all domain ids.
- Conversion output preserves all set ids.
- Conversion output preserves total question count.
- Conversion output preserves question ids, versions, and content hashes.
- JSON loader returns the same flattened set list as the legacy JS loader.
- JSON loader returns the same flattened question list as the legacy JS loader.
- Dry-run conversion fails when JSON source is stale.

### 5. Generate JSON Sources

Run:

```bash
npm run json:write
```

Then verify:

```bash
npm run qa:json-source
npm run qa:content
npm run qa:manifest
npm run qa:chunks
npm run test:unit
```

Do not proceed if any existing content, manifest, chunk, or unit test changes unexpectedly.

### 6. Document Authorship Rules

Update `QA.md` or add a short docs section:

- Canonical question content now lives in `assets/question-bank-source/*.json`.
- `assets/question-banks/*.js` are legacy/generated runtime artifacts until fully removed.
- Contributors should edit JSON source files, not generated runtime files.
- After editing JSON, run the generation and QA commands.

## Test-Driven Workflow

1. Add tests proving JSON conversion preserves the legacy bank model.
2. Implement the conversion script.
3. Generate JSON sources.
4. Update the bank loader to prefer JSON.
5. Run all existing content/manifest/chunk/unit tests.
6. Commit only once JSON and JS-derived outputs are equivalent.

## Acceptance Criteria

- Every existing domain has a canonical JSON source file.
- JSON source preserves all current set ids.
- JSON source preserves all current question ids.
- JSON source preserves all current versions and content hashes.
- Content QA passes from JSON source.
- Manifest generation produces the same logical manifest from JSON source.
- Chunk generation produces the same chunk content from JSON source.
- Existing runtime pages continue to work.
- Documentation clearly states that JSON is canonical.

## Verification

Run:

```bash
npm run json:write
npm run qa:json-source
npm run qa:content
npm run qa:manifest
npm run qa:chunks
npm run test:unit
npm run test:ui
```

Before merging, also run:

```bash
QA_ALL_SUBTOPICS=1 npm run test:ui
```

## Risk Notes

- This PR changes the authoring source of truth but should not change runtime loading behavior.
- Keep the loader compatibility layer small and well-tested.
- Avoid deleting legacy JS banks until generated runtime artifacts are fully owned by PR 18.
- If conversion creates noisy diffs, sort object keys deterministically before writing.
