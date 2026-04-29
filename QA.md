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

- `npm run qa:content` for question-bank loading, content contracts, duplicate derived keys, coverage checks, and size snapshots.
- `npm run qa:manifest` for generated manifest drift and generated question-chunk validation.
- `npm run test:unit` for quiz selection and progress/report contracts using Node's built-in test runner.
- `npm run test:ui` for core Playwright smoke tests against a local static server.

## Focused Commands

```bash
npm run qa:content
npm run qa:manifest
npm run qa:chunks
npm run test:unit
npm run test:ui
```

Run the slower all-subtopic browser smoke pass:

```bash
npm run test:ui:all
```

The all-subtopic mode visits every `topics/*/subtopics/*.html` page and checks that `#quiz-root` renders either a start screen or a coming-soon state without console/page errors.

## Notes

- Content QA reports file, set, and question locations for invalid correct indexes, malformed explanation arrays, missing metadata, and duplicate stable derived keys.
- `npm run manifest:write` regenerates `assets/question-manifest.json`, `assets/question-manifest.js`, and every checked-in file under `assets/question-chunks/<chunked-domain>/` from `assets/question-banks/*.js`.
- The default UI smoke enforces request and byte budgets for manifest-backed topic indexes and representative chunked pages. Content QA still prints total question-bank payload, per-topic payload, and largest single bank as a broader size snapshot.
- The UI smoke runner starts a small local static server itself. It stubs Firebase/auth in the browser so the tests validate static rendering, quiz flow, reports, and parent-preview behavior without external network state.
- CI runs `npm ci`, installs Playwright-managed Chromium with `npx playwright install --with-deps chromium`, and then runs `npm test`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only when debugging locally with a specific browser binary.
