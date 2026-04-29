# PR 16: Migrate All Question Domains to Generated Chunks

## Summary

Migrate every question domain to generated chunk files so runtime quiz pages and mixed quizzes load only the question sets they need. Keep source question banks as the canonical authoring inputs, generate chunk artifacts from those banks, and stop the migration immediately if any domain-specific gate fails.

This PR should proceed iteratively by domain:

1. `punctuation`
2. `vocabulary`
3. `reading-comprehension`
4. `grammar`

`capitalization` and `reference-skills` are already chunk-backed and should remain covered by the same checks.

## Motivation

The app is preparing for significant question-bank growth. Full topic-bank loading will become increasingly expensive for subtopic pages, mixed quizzes, active quiz resume, and parent/teacher review workflows. The current chunk-generation system gives us the right foundation, but only two domains use it today.

Moving all domains to generated chunks gives us:

- Smaller page payloads.
- Faster quiz startup.
- A consistent loader contract for subtopics and mixed quizzes.
- Stronger generated-artifact validation.
- Lower-risk future content growth.
- A cleaner boundary between authoring data and runtime delivery.

## Current Domain Status

```text
capitalization         5 sets   207 questions   already chunked
reference-skills       8 sets   808 questions   already chunked
punctuation           13 sets   915 questions   migrate next
vocabulary            16 sets  1805 questions   migrate third
reading-comprehension 19 sets  2816 questions   migrate fourth
grammar               34 sets  3689 questions   migrate last
```

## Design Principles

- Source banks remain the domain source of truth.
- Chunks are generated artifacts and must not be hand-authored.
- Manifest metadata is the routing contract.
- Runtime code should ask for question sets by identity, not by full topic bank.
- Active quiz persistence should continue to resolve by `questionRefs`, with snapshot fallback for stale or missing content.
- Each domain migration must prove correctness and payload reduction before the next domain is migrated.

## Implementation Plan

### 1. Add a Domain Migration Gate

Create `scripts/qa/chunk-migration-gates.js`.

The script should accept:

```bash
node scripts/qa/chunk-migration-gates.js --domain punctuation
node scripts/qa/chunk-migration-gates.js --all
```

Responsibilities:

- Run manifest generation in memory.
- Assert all sets in the target domain have `chunkFile`.
- Assert each generated chunk matches the source bank by:
  - set id
  - title
  - topic
  - question count
  - question ids
  - versions
  - content hashes
  - full serialized set equality
- Assert no stale chunk files exist in the target domain directory.
- Return nonzero on any failure.

Add package scripts:

```json
{
  "qa:chunk-domain": "node scripts/qa/chunk-migration-gates.js",
  "qa:chunks:all": "node scripts/qa/chunk-migration-gates.js --all"
}
```

### 2. Centralize Chunk Domain Configuration

Move chunk-domain configuration out of `scripts/generate-question-chunks.js` into a small shared module:

```text
scripts/question-chunk-config.js
```

Suggested exports:

```js
const CHUNK_MIGRATION_ORDER = [
  'capitalization',
  'reference-skills',
  'punctuation',
  'vocabulary',
  'reading-comprehension',
  'grammar'
];

const CHUNKED_DOMAINS = new Set(CHUNK_MIGRATION_ORDER);

module.exports = {
  CHUNKED_DOMAINS,
  CHUNK_MIGRATION_ORDER
};
```

Update these files to import the shared config:

- `scripts/generate-question-chunks.js`
- `scripts/generate-question-manifest.js`
- `scripts/qa/chunk-qa.js`, if needed
- related tests

### 3. Migrate `punctuation`

Add `punctuation` to the chunked-domain set.

Run:

```bash
npm run manifest:write
npm run qa:chunks
npm run qa:chunk-domain -- --domain punctuation
npm run test:unit
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome npm run test:ui
```

Expected updates:

- Generated files under `assets/question-chunks/punctuation/`.
- `assets/question-manifest.json` includes `chunkFile` for punctuation sets.
- `assets/question-manifest.js` includes chunk metadata for punctuation sets.
- UI smoke has a punctuation representative page budget.
- Mixed quiz smoke asserts `topics/punctuation/index.html` loads punctuation chunks and does not request `assets/question-banks/punctuation.js`.

Suggested representative page:

```text
topics/punctuation/subtopics/commas-series.html
```

Stop the PR if any punctuation gate fails.

### 4. Migrate `vocabulary`

Repeat the same process for `vocabulary`.

Expected updates:

- Generated files under `assets/question-chunks/vocabulary/`.
- Manifest chunk metadata for every vocabulary set.
- A vocabulary representative page budget.
- Mixed quiz smoke asserts `topics/vocabulary/index.html` loads vocabulary chunks and does not request `assets/question-banks/vocabulary.js`.

Suggested representative page:

```text
topics/vocabulary/subtopics/homophones.html
```

Stop the PR if any vocabulary gate fails.

### 5. Migrate `reading-comprehension`

Repeat the same process for `reading-comprehension`.

Expected updates:

- Generated files under `assets/question-chunks/reading-comprehension/`.
- Manifest chunk metadata for every reading-comprehension set.
- A reading-comprehension representative page budget.
- Mixed quiz smoke asserts `topics/reading-comprehension/index.html` loads reading-comprehension chunks and does not request `assets/question-banks/reading-comprehension.js`.

Suggested representative page:

```text
topics/reading-comprehension/subtopics/main-idea-supporting-details.html
```

Stop the PR if any reading-comprehension gate fails.

### 6. Migrate `grammar`

Migrate `grammar` last because it has the most sets and questions.

Expected updates:

- Generated files under `assets/question-chunks/grammar/`.
- Manifest chunk metadata for every grammar set.
- A grammar representative page budget.
- Mixed quiz smoke asserts `topics/grammar/index.html` loads grammar chunks and does not request `assets/question-banks/grammar.js`.
- Remove or update the existing UI smoke expectation that grammar mixed quiz still loads the legacy full bank.

Suggested representative page:

```text
topics/grammar/subtopics/sentence-types.html
```

Stop the PR if any grammar gate fails.

### 7. Strengthen Global Invariants

After all domains are chunk-backed, add or update tests so the suite enforces:

- Every manifest set has a `chunkFile`.
- No runtime smoke path requests `assets/question-banks/*.js` for quiz startup.
- Mixed quiz launches request `assets/question-loader.js`.
- Mixed quiz launches request one or more files under `assets/question-chunks/{domain}/`.
- All generated chunks pass source-bank equality checks.
- `scripts/generate-question-chunks.js --dry-run` fails when generated chunks are stale.
- `npm run manifest:write` refreshes manifest files and chunks together.

### 8. Expand UI Payload Budgets

Add request and byte budgets for one representative subtopic per domain:

```js
const PAGE_BUDGETS = {
  'topics/capitalization/subtopics/proper-names-titles.html': { ... },
  'topics/reference-skills/subtopics/alphabetical-order.html': { ... },
  'topics/punctuation/subtopics/commas-series.html': { ... },
  'topics/vocabulary/subtopics/homophones.html': { ... },
  'topics/reading-comprehension/subtopics/main-idea-supporting-details.html': { ... },
  'topics/grammar/subtopics/sentence-types.html': { ... }
};
```

Budgets should assert:

- The page does not request its full topic bank.
- Question payload bytes stay below a domain-appropriate threshold.
- The expected chunk path is requested.
- The quiz can start, answer, and advance.

### 9. Update Documentation

Update `QA.md` with the all-domain chunk workflow:

```bash
npm run manifest:write
npm run qa:chunks
npm run qa:chunks:all
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
```

Document that:

- `assets/question-banks/*.js` are canonical source files.
- `assets/question-chunks/**/*.js` are generated artifacts.
- Manifest and chunk files should be regenerated together.
- Contributors should not manually edit chunk files.

## Test-Driven Workflow

For each domain, follow this sequence:

1. Add or update the domain-specific tests that should fail while the domain still loads the full bank.
2. Add the domain to `CHUNKED_DOMAINS`.
3. Run `npm run manifest:write`.
4. Run the domain chunk gate.
5. Update UI smoke expectations and payload budgets.
6. Run unit tests.
7. Run default UI smoke.
8. Run all-subtopic UI smoke before moving to the next domain.

Do not migrate the next domain until the current domain passes its full gate.

## Domain Gates

### Punctuation Gate

```bash
npm run manifest:write
npm run qa:chunks
npm run qa:chunk-domain -- --domain punctuation
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
```

### Vocabulary Gate

```bash
npm run manifest:write
npm run qa:chunks
npm run qa:chunk-domain -- --domain vocabulary
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
```

### Reading-Comprehension Gate

```bash
npm run manifest:write
npm run qa:chunks
npm run qa:chunk-domain -- --domain reading-comprehension
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
```

### Grammar Gate

```bash
npm run manifest:write
npm run qa:chunks
npm run qa:chunk-domain -- --domain grammar
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
```

## Acceptance Criteria

- All 95 question sets have `chunkFile` entries in the manifest.
- All 10,240 questions are available through generated chunks.
- No migrated topic or mixed quiz path loads a full `assets/question-banks/*.js` file.
- Active quiz resume still works from `questionRefs`.
- Snapshot fallback still works for missing refs and hash mismatches.
- Chunk QA compares every generated chunk against the source bank.
- UI smoke includes payload budgets for all domains.
- Full all-subtopic smoke passes.
- CI runs the reproducible install and test flow.

## Final Verification

Run:

```bash
npm run manifest:write
npm run qa:chunks
npm run qa:chunks:all
npm run test:unit
npm run test:ui
QA_ALL_SUBTOPICS=1 npm run test:ui
npm test
```

If local Playwright-managed Chromium is not installed, run:

```bash
npm run install:browsers
```

or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a known local browser while debugging.

## Risk Notes

- `grammar` is the largest domain and should be migrated last.
- Mixed quiz behavior is the highest-risk runtime path because it selects across many sets.
- Active quiz resume should continue to prefer live questions from refs and use snapshots only as fallback.
- Generated chunk drift must remain a hard failure in QA.
- Payload budgets should be tightened after observing stable post-migration request sizes.
