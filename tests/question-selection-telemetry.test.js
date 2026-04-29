const assert = require('node:assert/strict');
const test = require('node:test');

const telemetry = require('../assets/question-selection-telemetry');

test('selection telemetry normalizes API-used details to a privacy-safe schema', () => {
  const normalized = telemetry.normalizeSelectionTelemetry('grammarquest:question-selection-api-used', {
    domain: 'grammar',
    source: 'api',
    setCount: 2,
    requestedQuestionCount: 60,
    selectedQuestionCount: 60,
    requestBytes: 1200,
    responseBytes: 7000,
    selectionMs: 31,
    hydrateMs: 44,
    selectionPolicyVersion: 1,
    question: 'Prompt text must not leak',
    choices: ['A', 'B'],
    explanations: ['Nope'],
    questionSnapshots: [{ question: 'Snapshot prompt' }],
    learnerAnswer: 'A',
    studentName: 'Maya'
  });

  assert.deepEqual(normalized, {
    event: 'selection.api_used',
    domain: 'grammar',
    source: 'api',
    setCount: 2,
    requestedQuestionCount: 60,
    selectedQuestionCount: 60,
    requestBytes: 1200,
    responseBytes: 7000,
    selectionMs: 31,
    hydrateMs: 44,
    fallbackReason: '',
    selectionPolicyVersion: 1
  });
  assert.equal(JSON.stringify(normalized).includes('Prompt text'), false);
  assert.equal(JSON.stringify(normalized).includes('Maya'), false);
});

test('selection telemetry categorizes fallback reasons without raw error text', () => {
  const cases = [
    ['selection API returned 503', 'api_unavailable'],
    ['integrity_failed: response digest mismatch', 'integrity_failed'],
    ['selection API returned invalid contentHash for "q1"', 'manifest_mismatch'],
    ['selection API response must be an object', 'invalid_response'],
    ['selection API refs could not be hydrated', 'hydrate_failed'],
    ['totally unexpected details with a student name', 'unknown']
  ];

  cases.forEach(([reason, category]) => {
    const normalized = telemetry.normalizeSelectionTelemetry('grammarquest:question-selection-fallback', {
      domain: 'grammar',
      source: 'fallback',
      reason,
      fallbackReason: reason
    });
    assert.equal(normalized.event, 'selection.fallback');
    assert.equal(normalized.fallbackReason, category);
    assert.equal(JSON.stringify(normalized).includes(reason), false);
  });
});

test('selection telemetry sink is disabled by default', () => {
  const target = createEventTarget();
  const records = [];
  telemetry.installSelectionTelemetrySink({
    target,
    transport: event => records.push(event)
  });

  target.dispatch('grammarquest:question-selection-completed', {
    domain: 'grammar',
    source: 'chunks',
    selectedQuestionCount: 4
  });

  assert.deepEqual(records, []);
});

test('selection telemetry sink transports normalized events and never throws on transport failure', () => {
  const target = createEventTarget();
  const records = [];
  telemetry.installSelectionTelemetrySink({
    target,
    enabled: true,
    sampleRate: 1,
    transport(event) {
      records.push(event);
      throw new Error('telemetry endpoint is down');
    }
  });

  assert.doesNotThrow(() => target.dispatch('grammarquest:question-selection-completed', {
    domain: 'grammar',
    source: 'api',
    requestedQuestionCount: 4,
    selectedQuestionCount: 4,
    responseBytes: 4096,
    hydrateMs: 12,
    question: 'Do not send me'
  }));
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    event: 'selection.completed',
    domain: 'grammar',
    source: 'api',
    setCount: 0,
    requestedQuestionCount: 4,
    selectedQuestionCount: 4,
    requestBytes: 0,
    responseBytes: 4096,
    selectionMs: 0,
    hydrateMs: 12,
    fallbackReason: '',
    selectionPolicyVersion: 0
  });
});

test('selection telemetry sink can deterministically sample out events', () => {
  const target = createEventTarget();
  const records = [];
  telemetry.installSelectionTelemetrySink({
    target,
    enabled: true,
    sampleRate: 0.25,
    random: () => 0.75,
    transport: event => records.push(event)
  });

  target.dispatch('grammarquest:question-selection-started', {
    domain: 'grammar',
    source: 'api'
  });

  assert.deepEqual(records, []);
});

function createEventTarget() {
  const listeners = {};
  return {
    addEventListener(name, handler) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(handler);
    },
    removeEventListener(name, handler) {
      listeners[name] = (listeners[name] || []).filter(item => item !== handler);
    },
    dispatch(name, detail) {
      (listeners[name] || []).forEach(handler => handler({ type: name, detail }));
    }
  };
}
