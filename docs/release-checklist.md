# Release Checklist

Use this checklist before tagging or promoting a release branch. The goal is to prove the generated question artifacts, learner flows, browser states, and operational guardrails are current.

## Artifact Freshness

- Edit canonical question content only in `assets/question-bank-source/*.json`.
- Run `npm run questions:normalize` after source edits to refresh stable ids, source metadata, and content hashes.
- Run `npm run questions:write` so generated manifests and chunks match canonical JSON.
- Review the generated artifact diff for intentional question, manifest, chunk, and provenance changes.

## Local Gates

- Run `npm run qa:content` for content quality, duplicate prompt, payload size, and explanation diagnostics.
- Run `npm run test:fast` for question artifact QA and unit/domain contracts.
- Run `npm run test:browser` for the normal learner, parent-preview, reports, and responsive smoke path.
- Run `npm run test:full` before release branch promotion or when the scheduled full regression is stale.

## Scheduled Full Regression

- Confirm the latest scheduled full regression completed successfully on the target branch.
- If it failed, review uploaded artifacts before retrying: `playwright-report/`, `test-results/`, visual baselines, and debug logs.
- Re-run the full regression with `workflow_dispatch` after fixes land on `main` or `release/**`.

## Release Review

- Confirm accessibility, visual regression, offline/cache, and all-subtopic browser gates passed in the full run.
- Review rollout telemetry and fallback rates for deployed selection pilots before widening exposure.
- Confirm telemetry remains privacy-safe: no prompts, choices, explanations, learner answers, student names, or auth identifiers.
- Confirm operational or role changes are documented in `docs/security/` before release.
