# Adaptive Review

Adaptive review turns recent missed question refs and weak skill evidence into a small, explainable follow-up queue.

The queue is intentionally lightweight. It stores stable question refs, source set ids, skill ids, reasons, priority, due dates, and item status only. It must not store prompts, choices, explanations, learner answers, snapshots, or other copied question content.

## Runtime Flow

1. `assets/adaptive-review-domain.js` builds a queue from saved session attempts and mastery evidence.
2. `assets/adaptive-review-entry.js` shows the home-page review action when queued items exist.
3. The review request is stored in `grammarQuestActiveReviewRequest` as refs/status only.
4. `assets/quiz-engine.js` hydrates those refs through `GrammarQuestQuestionLoader.hydrateQuestionRefs()`.
5. Quiz completion updates each review item to `seen` or `mastered` and clears the active review request.

## QA Coverage

- `tests/adaptive-review-domain.test.js` covers missed-ref and weak-skill queue generation.
- `tests/adaptive-review-selection.test.js` covers stale refs and same-skill backfill selection.
- `tests/learner-state-repository.test.js` covers persisted review queue status transitions.
- `tests/question-selection-telemetry.test.js` covers privacy-safe review telemetry events.
- `tests/ui-smoke.spec.js` seeds a missed ref, starts review from the home page, completes the quiz, and verifies queue status without copied question text.
