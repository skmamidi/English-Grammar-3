const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertSelectionTelemetryPrivacy,
  normalizeSelectionTelemetry
} = require('../assets/question-selection-telemetry');

test('selection telemetry privacy guard accepts normalized rollout fields', () => {
  const event = normalizeSelectionTelemetry('grammarquest:question-selection-api-used', {
    domain: 'grammar',
    mode: 'mixed',
    source: 'api',
    routeType: 'topic-index',
    requestedQuestionCount: 12,
    selectedQuestionCount: 12,
    requestBytes: 512,
    responseBytes: 4096,
    hydrateMs: 22,
    selectionPolicyVersion: 1,
    sourceHash: 'sha256:source'
  }, {
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.doesNotThrow(() => assertSelectionTelemetryPrivacy(event));
  assert.equal(event.eventName, 'selection.api_used');
  assert.equal(event.eventVersion, 1);
  assert.equal(event.occurredAt, '2030-04-29T12:00:00.000Z');
  assert.equal(event.selectionSource, 'api');
  assert.equal(event.requestedCount, 12);
  assert.equal(event.selectedCount, 12);
  assert.equal(event.hydrateLatencyMs, 22);
});

test('selection telemetry privacy guard rejects unsafe learner, question, and raw error fields', () => {
  [
    { question: 'What is the answer?' },
    { choices: ['A', 'B'] },
    { answer: 'A' },
    { explanation: 'Because' },
    { studentName: 'Maya' },
    { userId: 'guardian-1' },
    { uid: 'guardian-1' },
    { activeStudentId: 'student-1' },
    { role: 'guardian' },
    { capabilities: ['viewLinkedLearnerReports'] },
    { email: 'maya@example.test' },
    { error: 'raw error text' },
    { stack: 'stack trace' }
  ].forEach(payload => {
    assert.throws(
      () => assertSelectionTelemetryPrivacy(Object.assign({
        eventName: 'selection.api_used',
        eventVersion: 1
      }, payload)),
      /unsafe telemetry field/
    );
  });
});

test('telemetry contract documents bounded recommendation and aggregate analytics fields', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const docs = fs.readFileSync(path.join(__dirname, '..', 'docs', 'telemetry-contract.md'), 'utf8');

  assert.match(docs, /Weak-skill recommendation telemetry/);
  assert.match(docs, /recommendation count, reason code, skill ID, and target type/);
  assert.match(docs, /Aggregate learning analytics/);
  assert.match(docs, /must not include learner names, learner IDs, raw questions, answers, or explanations/);
});
