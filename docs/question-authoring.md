# Question Authoring Guide

Canonical question content lives in `assets/question-bank-source/*.json`. Generated files such as `assets/question-manifest.json`, `assets/question-manifest.js`, and `assets/question-chunks/**/*.js` are runtime artifacts and should not be edited by hand.

## Safe Edit Workflow

1. Edit the appropriate JSON source file under `assets/question-bank-source/`.
2. Keep each question inside the correct set id. `metadata.sourceSet` must match the containing set.
3. Run `npm run questions:normalize` after editing questions. This fills missing stable ids, aligns `metadata.sequence`, and refreshes each `contentHash`.
4. Run `npm run questions:write` to regenerate the manifest and browser chunk artifacts.
5. Run `npm run qa:content` and `npm run qa:questions` before shipping content changes.
6. Run `npm run test:unit` when changing authoring tools, QA rules, selection logic, or generated artifact contracts.

## Stable IDs And Hashes

Question ids are stable learner-facing identities. They use the containing set id plus a four-digit sequence, for example `grammar-sentence-types-q0042`.

Use a new id for a new question. Keep the same id when fixing typos or improving wording for the same underlying question. Increment `version` when a change affects learner-facing meaning, answer choice semantics, explanation meaning, study aid text, or authored visual content.

`contentHash` is calculated from learner-facing question content. Run `npm run questions:normalize` instead of editing hashes manually.

## Explanations

Good explanations name the rule and connect it to the answer:

- Strong: `A command tells someone what to do, and "Close the door." gives a direct instruction.`
- Weak: `Correct.`

Incorrect-choice explanations should explain why that choice does not fit, not just restate that it is wrong.

## Content QA

`npm run qa:content` reads canonical JSON and reports actionable diagnostics with source file, set id, and question id. Hard errors block learner-breaking issues such as invalid correct indexes, malformed explanations, missing metadata, stale hashes, duplicate stable ids, and empty choice text.

Richer quality rules start as warnings unless the team promotes them to errors. Current warnings include duplicate prompts, repeated choice text, duplicate prompt-plus-choice combinations across a domain, placeholder text such as `TODO` or `TBD`, excessive whitespace, weak explanation rationale, overlong choice text, unsupported media fields, and missing difficulty coverage. Promote a warning by passing a rule severity override in the QA/test harness once the existing content has been cleaned up and the rule should block release.

Known live warnings are intentional cleanup backlog:

- Several sets do not yet have exact `hard` difficulty coverage and use selection fallback questions.
- Some legacy-imported questions have repeated choice text; these are warning-only until the content is reviewed.
- Some explanations are terse and are warning-only until they can be improved with answer-specific rationale.

## Visual Scenes

Authored `visualScene` content is part of the learner-facing question and participates in `contentHash`. Runtime-only `generatedVisualScene` is excluded from the hash and may be regenerated.

Use `visualScene` only when the scene is intentionally authored content. Unsupported fields such as `visual`, `visualMetadata`, or `media` should not be added to questions; content QA reports them so the visual contract stays predictable.

## Generated Chunks

Every runtime quiz loads generated chunks from `assets/question-chunks/**/*.js`. Topic indexes use manifest metadata only, and subtopic pages load their selected set through `assets/question-loader.js`.

After JSON edits, `npm run questions:write` regenerates chunk files and provenance headers. If QA reports stale chunk or manifest provenance, rerun `npm run questions:write` and review the resulting generated diff.
