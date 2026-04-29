# QA Suite

This repository now has a lightweight automated regression suite for the static quiz app.

## Fast Local Gate

Install dependencies and the Playwright browser once:

```bash
npm ci
npm run install:browsers
```

Run the full default gate:

```bash
npm test
```

That command runs:

- `npm run qa:questions` for JSON schema validation, canonical JSON source validation, generated manifest drift, and generated question-chunk validation.
- `npm run qa:content` for question-bank loading, content contracts, duplicate derived keys, coverage checks, and size snapshots.
- `npm run test:unit` for quiz selection and progress/report contracts using Node's built-in test runner.
- `npm run test:ui` for core Playwright smoke tests against a local static server.

## Focused Commands

```bash
npm run qa:content
npm run qa:schema
npm run qa:json-source
npm run qa:question-consistency
npm run qa:questions
npm run qa:manifest
npm run qa:chunks
npm run json:write
npm run questions:normalize
npm run questions:write
npm run test:unit
npm run test:ui
```

Run the slower all-subtopic browser smoke pass:

```bash
npm run test:ui:all
```

The all-subtopic mode visits every `topics/*/subtopics/*.html` page and checks that `#quiz-root` renders either a start screen or a coming-soon state without console/page errors.

## Notes

- Canonical question content lives in `assets/question-bank-source/*.json`. Edit those JSON files for content changes.
- Add new questions with stable ids that match `metadata.sequence` (for example `grammar-sentence-types-q0042`), keep `metadata.sourceSet` equal to the containing set id, and use unique sequence numbers within each set.
- Increment `version` when changing learner-facing meaning, and regenerate `contentHash` whenever prompt, choices, answer, explanation, study aid, or authored visual scene content changes.
- Run `npm run qa:schema` before generating artifacts when editing question source.
- Use `npm run questions:normalize` after editing source questions to fill missing ids, normalize source metadata, and refresh content hashes in canonical JSON.
- Authoring tools operate on `assets/question-bank-source/*.json` by default. Do not run maintenance tools against `assets/question-banks/*.js`; legacy JS banks are migration-only compatibility artifacts.
- Runtime question artifacts are generated from JSON in this order: `assets/question-bank-source/*.json` -> `assets/question-manifest.json` -> `assets/question-manifest.js` -> `assets/question-chunks/**/*.js`.
- Do not manually edit generated manifest or chunk files. Run `npm run questions:write` after changing JSON source.
- Generated question artifacts include deterministic provenance: generator version, artifact schema version, source type, source files, and SHA-256 source hashes. If QA reports stale provenance, rerun `npm run questions:write`; increment `QUESTION_GENERATOR_VERSION` in `scripts/question-artifact-provenance.js` only when generated artifact semantics intentionally change.
- Committed generated artifacts intentionally omit wall-clock timestamps, so unchanged source produces stable diffs.
- `assets/question-banks/*.js` are deprecated legacy runtime artifacts. Quiz startup should use generated chunks instead of full bank files.
- `npm run json:write` remains a migration helper for refreshing JSON from old legacy banks; normal content work should edit JSON directly.
- Legacy conversion coverage is fixture-based, so live JSON edits are not expected to match `assets/question-banks/*.js`.
- `npm run qa:questions` verifies JSON sources and generated runtime artifacts are current.
- Server-side question selection is an opt-in pilot behind `GrammarQuestQuestionLoader.loadSelectedQuiz`. Normal static runs keep chunk loading as the default; use `QUESTION_SELECTION_API=1 npm run test:ui` to exercise the grammar mixed-quiz API harness and fallback path.
- Mixed-quiz API requests preserve existing count semantics: `setIds.length * questionsPerSubtopic`, capped by `GRAMMAR_QUEST_CONFIG.maxServerSelectionQuestions` or the default `60`; `max` mode requests the cap and marks `countMode: "max"`.
- Selection API refs must match the canonical manifest identity for `id`, `sourceSet`, `version`, `contentHash`, and `sequence`. The browser uses the compact index manifest for default page loads and fetches the full identity manifest only when server selection is enabled.
- Server-provided snapshots are ignored by default. Set `GRAMMAR_QUEST_CONFIG.allowServerSelectionSnapshots = true` only for a controlled fallback path, and only snapshots that exactly match their paired ref can hydrate a quiz.
- Server-selection pilot responses include `requestHash`, `responseDigest`, `signature: null`, and `signatureVersion: "none"`. The digest is a public corruption/staleness check, not authentication; a production API must use asymmetric signing and the browser must never contain a private signing secret.
- Future signed selection responses should cover the request hash, response digest, selection policy version, manifest source hash, and any expiry. Until a verifier is configured, non-`none` signatures intentionally fail closed to chunk fallback.
- Selection loading emits local browser events: `grammarquest:question-selection-started`, `grammarquest:question-selection-api-used`, `grammarquest:question-selection-fallback`, and `grammarquest:question-selection-completed`. Event details include source, domain, set count, requested/selected counts, request and response byte estimates, selection and hydration timings, fallback reason, and policy version. Do not include prompts, choices, explanations, student names, or auth identifiers in these events; they can later be bridged to analytics.
- Content QA reports file, set, and question locations for invalid correct indexes, malformed explanation arrays, missing metadata, and duplicate stable derived keys.
- The default UI smoke enforces request and byte budgets for manifest-backed topic indexes and representative chunked pages. Content QA still prints total question-bank payload, per-topic payload, and largest single bank as a broader size snapshot.
- The UI smoke runner starts a small local static server itself. It stubs Firebase/auth in the browser so the tests validate static rendering, quiz flow, reports, and parent-preview behavior without external network state.
- CI runs `npm ci`, installs Playwright-managed Chromium with `npx playwright install --with-deps chromium`, and then runs `npm test`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only when debugging locally with a specific browser binary.
