# PR 02: Separate Question Report Identity From Stable Question Identity

## Summary

Fix legacy question-report normalization so a report record ID is not treated as a question ID. This keeps two domain concepts separate: report identity (`question-report-*`) and question identity (`<setId>-q0001`).

## Domain Context

Question reports have their own lifecycle:

- `id`: report record identity, used for status updates and review workflows.
- `questionId`: stable instructional content identity.
- `questionVersion` and `questionHash`: content version evidence.

For legacy records, `report.id` may look like `question-report-...`. That is not a question ID and should not become one during normalization.

## Failing Test First

Add a test to `tests/progress-contracts.test.js`:

```js
test('legacy question report id is not normalized as questionId', () => {
  const report = normalizeQuestionReportForTest({
    id: 'question-report-123',
    sourceSet: 'grammar-sentence-types',
    sequence: 4
  });

  assert.equal(report.id, 'question-report-123');
  assert.equal(report.questionId, 'grammar-sentence-types-q0004');
});
```

Also cover the case where no source set or sequence is available:

```js
assert.equal(normalized.questionId, '');
```

This behavior should avoid inventing false identity.

## Implementation

Update `normalizeQuestionReport(report)` in `assets/progress-store.js`:

```js
function normalizeQuestionReport(report) {
  if (!report || typeof report !== "object") return report;
  return Object.assign({}, report, {
    questionId: getReportQuestionId(report),
    questionVersion: Number(report.questionVersion) || 0,
    questionHash: report.questionHash || report.contentHash || ""
  });
}

function getReportQuestionId(report) {
  if (!report) return "";
  if (report.questionId) return String(report.questionId);
  if (looksLikeStableQuestionId(report.id)) return String(report.id);
  if (report.sourceSet && report.sequence) {
    return `${report.sourceSet}-q${String(report.sequence).padStart(4, "0")}`;
  }
  if (report.setId && report.sequence) {
    return `${report.setId}-q${String(report.sequence).padStart(4, "0")}`;
  }
  return "";
}
```

Add a small `looksLikeStableQuestionId()` helper that accepts the app’s stable question ID pattern and rejects `question-report-*`.

## Regression Suite Updates

- Add normalization tests for modern reports, legacy reports with `sourceSet + sequence`, and legacy reports with only report ID.
- Add a reports-dashboard test fixture that includes both `id` and `questionId` and verifies status updates still use report `id`.
- Add content QA warning if a question report fixture uses `question-report-*` as `questionId`.

## Acceptance Criteria

- Report status updates still find reports by report `id`.
- Report inspector/full-question detail uses stable `questionId` when available.
- Legacy reports do not falsely group under `question-report-*` as a question.
- No existing student progress becomes unreadable.

## Rollout Risk

Low to medium. The risk is breaking legacy report rendering, so preserve the report `id` exactly and only change how `questionId` is filled.

