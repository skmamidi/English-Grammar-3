# PR 18: Generate Manifest and Browser Chunks from JSON Source

## Summary

Update manifest and browser chunk generation so all runtime artifacts are generated from canonical JSON question-bank sources. The browser should continue loading static JavaScript artifacts, but those artifacts should now be fully generated from JSON.

This PR builds on PR 17. JSON becomes the source of truth; manifest and chunk JavaScript become derived build artifacts.

## Motivation

After canonical content moves to JSON, generation tools must stop depending on legacy executable bank files. The runtime can remain static and browser-friendly, but the build path should be data-driven:

```text
JSON source -> manifest JSON -> manifest JS -> question chunks JS
```

That gives us a clean boundary for later work:

- Server-side question selection can consume JSON directly.
- Static browser delivery can consume generated chunks.
- CI can verify generated artifacts are current.
- Content authors do not need to understand runtime wrapper files.

## Domain Model

The generation pipeline should treat these as separate concepts:

- Source bank: canonical JSON content.
- Manifest: generated routing and identity metadata.
- Chunk: generated browser-loadable set payload.
- Legacy bank JS: deprecated runtime artifact, removable after all pages use chunks.

Generation must preserve the public question identity contract:

- `question.id`
- `question.version`
- `question.contentHash`
- `question.metadata.sourceSet`
- `question.metadata.sequence`

## Implementation Plan

### 1. Make JSON Loader the Default Generation Source

Update generation scripts to use the JSON-aware loader from PR 17:

- `scripts/generate-question-manifest.js`
- `scripts/generate-question-chunks.js`
- `scripts/qa/chunk-qa.js`
- `scripts/qa/content-qa.js`, if needed
- tests that directly call `loadQuestionBanks()`

The scripts should not directly execute `assets/question-banks/*.js` when JSON sources are available.

### 2. Preserve Runtime Chunk Format

Keep generated chunk files browser-compatible:

```js
(function () {
  'use strict';
  window.QUESTION_BANK = Object.assign(window.QUESTION_BANK || {}, {
    "set-id": { ... }
  });
})();
```

This avoids changing `GrammarQuestQuestionLoader` and keeps static hosting behavior intact.

### 3. Generate or Retire Legacy Full Bank JS

Choose one explicit path:

Preferred path:

- Stop treating `assets/question-banks/*.js` as runtime dependencies.
- Keep them only temporarily if any page still references them.
- Add QA that fails if runtime smoke requests full bank files.

Alternative transition path:

- Generate `assets/question-banks/*.js` from JSON as compatibility artifacts.
- Mark them as generated.
- Add a test proving generated full bank JS matches JSON source.

If PR 16 has fully migrated all domains to chunks, prefer retiring the legacy full bank path instead of generating it.

### 4. Add Generation Drift Tests

Add or update tests:

```text
tests/json-generation-pipeline.test.js
```

Coverage:

- Manifest generated from JSON matches `assets/question-manifest.json`.
- Manifest JS generated from JSON matches `assets/question-manifest.js`.
- Every chunk generated from JSON matches the committed chunk file.
- Dry-run chunk generation fails when a committed chunk is stale.
- Dry-run manifest generation fails when committed manifest files are stale.
- No generated chunk depends on legacy `.js` source-bank loading.

### 5. Update Package Scripts

Add a single source-to-runtime generation command:

```json
{
  "questions:write": "npm run json:write && npm run manifest:write",
  "qa:questions": "npm run qa:json-source && npm run qa:manifest && npm run qa:chunks"
}
```

If `json:write` remains a one-time migration command after PR 17, use:

```json
{
  "questions:write": "npm run manifest:write",
  "qa:questions": "npm run qa:json-source && npm run qa:manifest && npm run qa:chunks"
}
```

The important part is that contributors have one command to regenerate runtime question artifacts from source.

### 6. Update Docs

Document the build pipeline:

```text
assets/question-bank-source/*.json
  -> assets/question-manifest.json
  -> assets/question-manifest.js
  -> assets/question-chunks/**/*.js
```

Clarify:

- Edit JSON source files.
- Regenerate artifacts after editing source.
- Do not manually edit manifest or chunk files.
- CI verifies generated artifacts are current.

## Test-Driven Workflow

1. Add failing tests that assert generation uses JSON source.
2. Update `bank-loader` and generation scripts to consume JSON.
3. Run generation.
4. Verify manifest and chunks are stable.
5. Add UI smoke assertions that no runtime path requests full source banks.
6. Run all tests.

## Acceptance Criteria

- Manifest generation reads JSON source.
- Chunk generation reads JSON source.
- Content QA reads JSON source.
- Generated chunks are byte-for-byte stable.
- Generated manifest files are byte-for-byte stable.
- Browser runtime still loads generated chunk JavaScript.
- No quiz startup path needs canonical JSON over HTTP.
- No quiz startup path needs legacy full bank JavaScript.
- CI fails if generated artifacts are stale.

## Verification

Run:

```bash
npm run questions:write
npm run qa:questions
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
npm test
```

## Risk Notes

- Keep runtime behavior stable; this PR is about the build pipeline.
- Avoid making the browser fetch JSON source files directly.
- Do not remove legacy bank JS until smoke tests prove no runtime path requests it.
- Keep generated artifact diffs deterministic.
