# QA Suite

This repository now has a lightweight automated regression suite for the static quiz app.

## Fast Local Gate

Use Node 24 for local verification so the same runtime is exercised as CI. Install dependencies and the Playwright browser once:

```bash
npm ci
npm run install:browsers
```

Run the full default gate:

```bash
npm test
```

That command runs:

- `npm run qa:questions` for JSON schema validation, canonical JSON source validation, generated manifest drift, generated question-chunk validation, and chunk size budget checks.
- `npm run qa:content` for question-bank loading, content contracts, duplicate derived keys, coverage checks, and size snapshots.
- `npm run test:unit` for quiz selection and progress/report contracts using Node's built-in test runner.
- `npm run test:ui` for core Playwright smoke tests against a local static server.

For a faster local confidence loop, run:

```bash
npm run test:fast
```

That command runs generated question artifact QA and the Node domain/unit contracts. Use `npm run test:browser` for the normal browser smoke pass, and `npm run test:full` for the release-grade gate that also includes all-subtopic, accessibility, visual, and offline coverage.

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
npm run test:ui:teardown
npm run test:fast
npm run test:browser
npm run test:browser:all
npm run test:a11y
npm run test:visual
npm run test:offline
npm run test:full
```

Run the slower all-subtopic browser smoke pass:

```bash
npm run test:ui:all
```

The all-subtopic mode visits every `topics/*/subtopics/*.html` page and checks that `#quiz-root` renders either a start screen or a coming-soon state without console/page errors.

Use the focused teardown command when reproducing browser shutdown failures:

```bash
npm run test:ui:teardown
QUESTION_SELECTION_API=1 npm run test:ui:teardown
```

That mode keeps the regular UI smoke assertions intact and prints the browser teardown method when cleanup succeeds.

## Notes

- Canonical question content lives in `assets/question-bank-source/*.json`. Edit those JSON files for content changes.
- Contributor workflow details live in `docs/question-authoring.md`, including examples of strong explanations and how to interpret content QA diagnostics.
- Add new questions with stable ids that match `metadata.sequence` (for example `grammar-sentence-types-q0042`), keep `metadata.sourceSet` equal to the containing set id, and use unique sequence numbers within each set.
- Increment `version` when changing learner-facing meaning, and regenerate `contentHash` whenever prompt, choices, answer, explanation, study aid, or authored visual scene content changes.
- Run `npm run qa:schema` before generating artifacts when editing question source.
- Skill and standards tagging is validated against `assets/question-skill-taxonomy.json`; explicit unknown `metadata.skillIds` or `metadata.standardIds` fail schema and content QA, while known legacy `metadata.skills` labels are mapped deterministically into generated runtime artifacts.
- Use `npm run questions:normalize` after editing source questions to fill missing ids, normalize source metadata, and refresh content hashes in canonical JSON.
- Authoring tools operate on `assets/question-bank-source/*.json` by default. Legacy JS bank coverage is fixture-only under `tests/fixtures/legacy-bank-conversion`.
- Runtime question artifacts are generated from JSON in this order: `assets/question-bank-source/*.json` -> `assets/question-manifest.json` -> `assets/question-manifest.js` -> `assets/question-chunks/**/*.js`.
- Do not manually edit generated manifest or chunk files. Run `npm run questions:write` after changing JSON source.
- Generated question artifacts include deterministic provenance: generator version, artifact schema version, source type, source files, and SHA-256 source hashes. If QA reports stale provenance, rerun `npm run questions:write`; increment `QUESTION_GENERATOR_VERSION` in `scripts/question-artifact-provenance.js` only when generated artifact semantics intentionally change.
- Committed generated artifacts intentionally omit wall-clock timestamps, so unchanged source produces stable diffs.
- Live `assets/question-banks/*.js` files have been retired from runtime assets. Quiz startup must use generated chunks instead of full bank files.
- The root `sw.js` version-scopes runtime caches by `assets/question-manifest.json` source hash, precaches app shell assets without retired full-bank files, and caches generated question chunks on first use. `assets/service-worker-registration.js` can be disabled with `GRAMMAR_QUEST_CONFIG.disableServiceWorker = true` for tests and local debugging.
- Runtime learner progress flows through `GrammarQuestProgress`, which delegates persistence to `GrammarQuestLearnerStateRepository` when the repository boundary is loaded. Production pages must load `assets/learner-state-repository.js` before `assets/progress-store.js`.
- Assignments and practice plans are ref-only learner-state records. Use `assets/assignment-domain.js` and `assets/assignment-quiz-adapter.js` for assignment creation/launch paths; never store copied question prompts, choices, explanations, snapshots, or full question objects in assignment records. Browser smoke covers seeded assignment launch and completion from `assignments.html`.
- Adaptive review queues are also ref-only. `assets/adaptive-review-domain.js` derives review items from missed refs and weak skills, the home page can start a review quiz, and quiz completion updates queue item status without storing question text or answer choices.
- Spaced repetition schedules are ref-only learner-state records in `reviewSchedules`. `assets/spaced-repetition-domain.js` applies deterministic interval rules from quiz outcomes, `assets/review-schedule-projection.js` projects due refs/skills, and browser smoke covers the home-page due review action plus schedule writeback.
- `npm run json:write` remains a migration helper for refreshing JSON from old legacy banks; normal content work should edit JSON directly.
- Legacy conversion coverage is fixture-based, so live JSON edits are not expected to match retired JS banks.
- `npm run qa:questions` verifies JSON sources, generated runtime artifacts, and generated chunk size budgets are current.
- Server-side question selection is an opt-in pilot behind `GrammarQuestQuestionLoader.loadSelectedQuiz`. Normal static runs keep chunk loading as the default; use `QUESTION_SELECTION_API=1 npm run test:ui` to exercise API and fallback paths across grammar, capitalization, punctuation, reading-comprehension, reference-skills, and vocabulary mixed quizzes.
- Mixed-quiz server selection domains are listed in `assets/question-selection-rollout.js`. Enable domains with `GRAMMAR_QUEST_CONFIG.serverQuestionSelectionPilotDomains`; remove a domain from that list to roll it back to generated chunk loading without changing the page.
- Mixed-quiz API requests preserve existing count semantics: `setIds.length * questionsPerSubtopic`, capped by `GRAMMAR_QUEST_CONFIG.maxServerSelectionQuestions` or the default `60`; `max` mode requests the cap and marks `countMode: "max"`.
- Vocabulary mixed quiz rollout is covered as a large-domain case: API success and API failure both must render `#start-btn`, record the `/api/question-selection` status, avoid retired full-bank assets, and hydrate no more chunk files than the configured vocabulary subtopics.
- Selection API refs must match the canonical manifest identity for `id`, `sourceSet`, `version`, `contentHash`, and `sequence`. The browser uses the compact index manifest for default page loads and fetches the full identity manifest only when server selection is enabled.
- Server-provided snapshots are ignored by default. Set `GRAMMAR_QUEST_CONFIG.allowServerSelectionSnapshots = true` only for a controlled fallback path, and only snapshots that exactly match their paired ref can hydrate a quiz.
- Server-selection pilot responses include `requestHash`, `responseDigest`, `signature: null`, and `signatureVersion: "none"`. The digest is a public corruption/staleness check, not authentication; production mode must set `GRAMMAR_QUEST_CONFIG.selectionIntegrity.requireSignature = true` and configure public verification keys only.
- Signed selection responses use `signatureVersion: "selection-signature-v1"` and bind the request hash, response digest, selection id, selection policy version, question refs, manifest source hash, key id, and expiry into the canonical signature payload. Missing signatures, unknown keys, unsupported signature versions, expired responses, digest mismatches, or signature failures must fall back to chunk loading and emit selection fallback telemetry.
- Selection signing key rotation: add the new public key to `selectionIntegrity.publicKeys`, deploy clients that trust both old and new key ids, rotate the server signer to the new `kid`, wait beyond the configured response TTL plus rollout/cache propagation, then remove the old public key. Never place private signing material in browser assets or page config.
- Production selection runtime is documented in `server/question-selection-runtime.md` and implemented as an injectable contract in `server/question-selection-runtime.js`. Required production settings are `SELECTION_RUNTIME_MODE`, `SELECTION_POLICY_VERSION`, `SELECTION_SIGNING_KEY_ID`, `SELECTION_PRIVATE_KEY_REF`, `SELECTION_RESPONSE_TTL_SECONDS`, `SELECTION_ALLOWED_DOMAINS`, and `SELECTION_MAX_QUESTIONS`; `SELECTION_RESPONSE_TTL_SECONDS` defaults to `300` and must be a positive integer; `SELECTION_PRIVATE_KEY_REF` is a secret reference, never key material.
- Operational key rotation and system-admin scope are documented in `docs/security/selection-api-key-rotation.md` and `docs/security/system-admin-role.md`. System admin controls are distinct from parent/guardian access and cover rollout flags, health/audit visibility, artifact operations, and signing key metadata only.
- Role and permission checks are centralized in `assets/access-control.js` and documented in `docs/security/roles-and-permissions.md`. Access is capability-based, relationship-scoped, and deny by default; parent/guardian and teacher roles are not system admins.
- Parent preview remains local, unauthenticated, and read-only. Authenticated guardian access must use active guardian-to-learner links and can view only linked learner progress/reports.
- System admin actions use centralized operational capabilities and audit events from `assets/audit-log-domain.js`. Audit metadata must redact secrets, private keys, tokens, learner answers, and full question content; support impersonation is denied by default until a separate audited policy exists.
- Selection loading emits local browser events: `grammarquest:question-selection-started`, `grammarquest:question-selection-api-used`, `grammarquest:question-selection-fallback`, and `grammarquest:question-selection-completed`. Event details include source, domain, set count, requested/selected counts, request and response byte estimates, selection and hydration timings, fallback reason, and policy version. Do not include prompts, choices, explanations, student names, or auth identifiers in these events; they can later be bridged to analytics.
- `assets/question-selection-telemetry.js` can collect those events when `GRAMMAR_QUEST_CONFIG.selectionTelemetry.enabled = true`; it is disabled by default. The normalized schema is documented in `docs/telemetry-contract.md` and includes event name/version, domain/mode, source, counts, byte sizes, hydrate latency, fallback category, policy version, and source hash.
- Selection telemetry excludes question prompts, choices, explanations, snapshots, learner answers, student names, and notes. Raw fallback messages stay in `console.warn`; telemetry only sends categories: `api_unavailable`, `integrity_failed`, `invalid_response`, `hydrate_failed`, `manifest_mismatch`, or `unknown`. API UI smoke covers both mixed topic selection and the direct subtopic server-selection pilot path.
- Local telemetry testing uses an injected transport in `tests/question-selection-telemetry.test.js` and `QUESTION_SELECTION_API=1 npm run test:ui`; rollout dashboards should monitor API/fallback/chunk source rates by domain, categorized fallback rates, latency, and request/response byte sizes. Use `node scripts/telemetry/summarize-selection-events.js <events.ndjson>` to review local rollout health exports.
- Direct selection API budgets live in `tests/question-selection-api-budget.test.js`. Current guardrails: grammar mixed selection returns at most 60 refs, stays under 25 KB, and keeps local p95 service latency under 100 ms; capitalization returns at most 20 refs, stays under 10 KB, and keeps local p95 under 50 ms; vocabulary returns at most 60 refs, stays under 25 KB, and keeps local p95 under 120 ms. Responses must remain ref-only and must not include prompts, choices, explanations, or snapshots by default.
- The first student-facing server-selection route is `topics/capitalization/subtopics/proper-names-titles.html`, guarded by `GRAMMAR_QUEST_CONFIG.serverQuestionSelectionPilotSubtopics = ["capitalization-proper-names-titles"]`. It uses `mode: "subtopic"`, requests 10 refs by default, hydrates from chunks, falls back invisibly to chunk loading, and must not write progress in parent preview.
- Learner state now has a repository boundary in `assets/learner-state-repository.js`, with localStorage as the default adapter. Runtime progress helpers expose repository-style methods for progress, active quiz refs/snapshots, saved sessions, and question reports; quiz completion and active quiz writes should use that boundary so reports are preserved and future storage adapters can be added without changing quiz selection logic.
- `createIndexedDbLearnerStateAdapter()` is available as an async, opt-in storage adapter. The strategy is documented in `docs/learner-state-storage.md`; migration copies normalized localStorage state into IndexedDB, verifies the round trip, marks completion only after success, and never deletes the localStorage source during this rollout.
- Session lifecycle rules live in `assets/session-domain.js` and are documented in `docs/security/session-lifecycle.md`. Sign-out and expired sessions clear authenticated identity, role/capability state, cloud sync, and active managed-student selection while preserving local learner progress under its existing storage key.
- Question chunk preloading is documented in `docs/performance/question-chunk-preloading.md` and is disabled unless `enableQuestionChunkPreload` is true. Preloading is capped by chunk count and bytes, disabled for save-data or slow connections, emits preload events, and is measured separately from required question payload bytes. Use `npm run qa:chunk-size` to review chunks that are too large for safe preloading.
- Content QA reports file, set, and question locations for invalid correct indexes, malformed explanation arrays, missing metadata, duplicate stable derived keys, empty choices, placeholder text, duplicate prompts, weak explanations, overlong choices, unsupported visual metadata fields, and repeated choice text.
- Content QA warnings are cleanup backlog unless explicitly promoted to errors. Known live warnings currently include missing exact `hard` difficulty coverage in a few sets, repeated choice text in legacy-imported questions, and terse explanations that need answer-specific rationale.
- The default UI smoke enforces request and byte budgets for manifest-backed topic indexes and representative chunked pages. Content QA still prints total question-bank payload, per-topic payload, and largest single bank as a broader size snapshot.
- The UI smoke runner starts a small local static server itself. It stubs Firebase/auth in the browser so the tests validate static rendering, quiz flow, reports, and parent-preview behavior without external network state.
- Browser teardown is explicit: tracked pages and contexts close first, `browser.close()` is attempted normally, and process-level termination is used only as a bounded fallback after tracked browser resources have drained.
- UI smoke includes desktop, tablet, and mobile viewport coverage for representative learner, topic, reports, character library, and parent-preview flows. The accessibility smoke checks keyboard focus visibility, accessible names for interactive controls, and keyboard-operable answer buttons.
- Visual regression coverage lives in `tests/visual-regression.spec.js` with reviewed JSON baselines under `tests/visual-baselines/`. Semantic layout fields are the hard gate; screenshot hash and byte-size drift writes `test-results/visual/*.screenshot-drift.json` for diagnostics when the semantic summary still matches. Update baselines only with `UPDATE_VISUAL_BASELINES=1 npm run test:visual` after reviewing intentional visual changes, using Playwright-managed Chromium for reviewed updates. Shared token roles live in `assets/design-tokens.css`.
- Offline smoke verifies that a warmed quiz reloads from cached shell assets and chunks, and that an uncached question chunk shows an explicit offline fallback. Run it with `npm run test:offline`.
- Offline smoke tracks structured request/response failures and reports exact URL/status pairs. App-owned assets such as `/assets/`, `/topics/`, `index.html`, `reports.html`, and `character-library.html` remain fatal when missing; explicitly scoped browser-default noise such as `/favicon.ico` is ignored.
- CI runs on Node 24 with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`, uses Node 24-compatible first-party actions, runs `npm ci`, installs Playwright-managed Chromium with `npx playwright install --with-deps chromium`, and then runs `npm test`. If GitHub reports action-runtime warnings, check `.github/workflows/*.yml` for stale `actions/checkout@v4`, `actions/setup-node@v4`, `node-version: 20`, or insecure `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION` entries. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only when debugging locally with a specific browser binary.
- Scheduled full regression lives in `.github/workflows/full-regression.yml` and runs `npm run test:full` nightly, on manual dispatch, and on `main` or `release/**` pushes. Failure uploads include Playwright output, test results, visual artifacts, visual baselines, and debug logs.
- Release gates are documented in `docs/release-checklist.md`; releases should confirm generated artifacts are fresh, fast/browser/full gates pass, and selection telemetry/fallback rates look healthy before widening rollout.
