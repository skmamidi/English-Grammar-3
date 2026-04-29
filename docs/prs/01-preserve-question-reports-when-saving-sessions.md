# PR 01: Preserve Question Reports When Saving Quiz Sessions

## Summary

Fix the report persistence regression where completing a quiz can drop existing `reports.questionReports`. This PR keeps parent/teacher question reports intact when session reports are updated, and adds regression coverage that proves open reports survive quiz completion.

## Domain Context

The app has two related but separate reporting concepts:

- Practice sessions: completed quiz attempts, scores, mastery evidence, and question history.
- Question reports: student-submitted issues for grown-up review, with `status`, `reason`, notes, and question identity metadata.

Saving a new session should append/update session evidence only. It must not delete open question reports.

## Failing Test First

Add a unit or browser-backed regression test that fails on the current implementation:

```js
test('saving a completed quiz preserves existing question reports', () => {
  const existingReports = {
    sessions: [],
    questionReports: [{
      id: 'question-report-existing',
      status: 'open',
      questionId: 'grammar-sentence-types-q0001',
      questionVersion: 1,
      questionHash: 'sha256:abc',
      reason: 'answer_or_explanation',
      createdAt: '2026-04-29T12:00:00.000Z',
      updatedAt: '2026-04-29T12:00:00.000Z'
    }]
  };

  const updated = updateReports(existingReports, [answeredAttempt], summary);

  assert.equal(updated.questionReports.length, 1);
  assert.equal(updated.questionReports[0].id, 'question-report-existing');
  assert.equal(updated.sessions.length, 1);
});
```

If `updateReports()` remains private inside `quiz-engine.js`, prefer one of these testable routes:

- Extract report update behavior into `assets/report-domain.js`.
- Add a browser smoke test that seeds `grammarQuestProgress.reports.questionReports`, completes a representative quiz, and inspects localStorage.

## Implementation

Update `updateReports(existingReports, attempts, summary)` in `assets/quiz-engine.js` so it carries forward normalized question reports:

```js
return enrichReports({
  sessions: [session].concat(reports.sessions || []).slice(0, 250),
  questionReports: Array.isArray(reports.questionReports) ? reports.questionReports : []
});
```

Then update `enrichReports(reports)` to preserve unknown/report-specific collections:

```js
return Object.assign({}, reports, {
  sessions,
  daily: ...,
  topics: ...,
  questions: ...
});
```

Avoid rebuilding `reports` from only derived fields.

## Regression Suite Updates

Strengthen the suite in three places:

- `tests/progress-contracts.test.js`: add a pure contract test for preserving `questionReports`.
- `tests/ui-smoke.spec.js`: seed an open question report before quiz completion and assert it remains after results save.
- `scripts/qa/quiz-contracts.js` or new shared report-domain helper: validate report objects keep `id`, `status`, `questionId`, `questionVersion`, and `questionHash`.

## Acceptance Criteria

- Completing a quiz appends a session without deleting existing `questionReports`.
- Open/resolved report status survives session saves.
- New reports still appear in the reports dashboard.
- Legacy progress objects without `questionReports` still normalize safely.
- Regression tests fail before the implementation and pass after it.

## Rollout Risk

Low. This is a preservation fix. The main risk is accidentally changing derived report summaries, so tests should assert sessions, daily rows, topics, and question risk summaries still populate.

