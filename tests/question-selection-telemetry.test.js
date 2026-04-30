const assert = require('node:assert/strict');
const test = require('node:test');

const telemetry = require('../assets/question-selection-telemetry');

test('selection telemetry normalizes API-used details to a privacy-safe schema', () => {
  const normalized = telemetry.normalizeSelectionTelemetry('grammarquest:question-selection-api-used', {
    domain: 'grammar',
    mode: 'mixed',
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
  }, {
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.deepEqual(normalized, {
    event: 'selection.api_used',
    eventName: 'selection.api_used',
    eventVersion: 1,
    occurredAt: '2030-04-29T12:00:00.000Z',
    domain: 'grammar',
    mode: 'mixed',
    source: 'api',
    selectionSource: 'api',
    setCount: 2,
    requestedQuestionCount: 60,
    requestedCount: 60,
    selectedQuestionCount: 60,
    selectedCount: 60,
    requestBytes: 1200,
    responseBytes: 7000,
    selectionMs: 31,
    hydrateMs: 44,
    hydrateLatencyMs: 44,
    fallbackReason: '',
    routeType: '',
    selectionPolicyVersion: 1,
    policyVersion: 1,
    sourceHash: ''
  });
  assert.equal(JSON.stringify(normalized).includes('Prompt text'), false);
  assert.equal(JSON.stringify(normalized).includes('Maya'), false);
});

test('weak skill recommendation telemetry exposes only safe recommendation fields', () => {
  const generated = telemetry.normalizeSelectionTelemetry('grammarquest:weak-skill-recommendations-generated', {
    recommendationCount: 2,
    reasonCode: 'low_recent_accuracy',
    skillId: 'grammar.subject-verb',
    targetType: 'subtopic',
    learnerName: 'Maya',
    question: 'Raw prompt',
    explanation: 'Raw explanation'
  }, {
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.deepEqual(generated, {
    event: 'recommendation.generated',
    eventName: 'recommendation.generated',
    eventVersion: 1,
    occurredAt: '2030-04-29T12:00:00.000Z',
    recommendationCount: 2,
    reasonCode: 'low_recent_accuracy',
    skillId: 'grammar.subject-verb',
    targetType: 'subtopic'
  });
  assert.equal(JSON.stringify(generated).includes('Maya'), false);
  assert.equal(JSON.stringify(generated).includes('Raw prompt'), false);
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

test('selection telemetry sink respects privacy preferences and parent preview', () => {
  const disabledTarget = createEventTarget();
  const disabledRecords = [];
  telemetry.installSelectionTelemetrySink({
    target: disabledTarget,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: false
    },
    transport: event => disabledRecords.push(event)
  });
  disabledTarget.dispatch('grammarquest:question-selection-completed', {
    domain: 'grammar',
    source: 'api'
  });
  assert.deepEqual(disabledRecords, []);

  const previewTarget = createEventTarget();
  const previewRecords = [];
  telemetry.installSelectionTelemetrySink({
    target: previewTarget,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: true
    },
    parentPreview: true,
    transport: event => previewRecords.push(event)
  });
  previewTarget.dispatch('grammarquest:question-selection-completed', {
    domain: 'grammar',
    source: 'api'
  });
  assert.deepEqual(previewRecords, []);
});

test('selection telemetry sink transports normalized events and never throws on transport failure', () => {
  const target = createEventTarget();
  const records = [];
  telemetry.installSelectionTelemetrySink({
    target,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: true },
    sampleRate: 1,
    now: () => new Date('2030-04-29T12:00:00.000Z'),
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
    eventName: 'selection.completed',
    eventVersion: 1,
    occurredAt: '2030-04-29T12:00:00.000Z',
    domain: 'grammar',
    mode: '',
    source: 'api',
    selectionSource: 'api',
    setCount: 0,
    requestedQuestionCount: 4,
    requestedCount: 4,
    selectedQuestionCount: 4,
    selectedCount: 4,
    requestBytes: 0,
    responseBytes: 4096,
    selectionMs: 0,
    hydrateMs: 12,
    hydrateLatencyMs: 12,
    fallbackReason: '',
    routeType: '',
    selectionPolicyVersion: 0,
    policyVersion: 0,
    sourceHash: ''
  });
});

test('selection telemetry endpoint transport prefers beacon and falls back to keepalive fetch', () => {
  const beaconCalls = [];
  const fetchCalls = [];
  const previousNavigator = globalThis.navigator;
  const previousFetch = global.fetch;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
    sendBeacon(endpoint, body) {
      beaconCalls.push({ endpoint, body });
      return true;
    }
    }
  });
  global.fetch = (endpoint, options) => {
    fetchCalls.push({ endpoint, options });
    return Promise.resolve({ ok: true });
  };

  const target = createEventTarget();
  telemetry.installSelectionTelemetrySink({
    target,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: true },
    endpoint: '/api/selection-telemetry',
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });
  target.dispatch('grammarquest:question-selection-api-used', {
    domain: 'grammar',
    source: 'api'
  });

  assert.equal(beaconCalls.length, 1);
  assert.equal(beaconCalls[0].endpoint, '/api/selection-telemetry');
  assert.equal(JSON.parse(beaconCalls[0].body).eventName, 'selection.api_used');
  assert.equal(fetchCalls.length, 0);

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {}
  });
  const fetchTarget = createEventTarget();
  telemetry.installSelectionTelemetrySink({
    target: fetchTarget,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: true },
    endpoint: '/api/selection-telemetry',
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });
  fetchTarget.dispatch('grammarquest:question-selection-api-used', {
    domain: 'grammar',
    source: 'api'
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].endpoint, '/api/selection-telemetry');
  assert.equal(fetchCalls[0].options.keepalive, true);

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: previousNavigator
  });
  global.fetch = previousFetch;
});

test('selection telemetry sink can deterministically sample out events', () => {
  const target = createEventTarget();
  const records = [];
  telemetry.installSelectionTelemetrySink({
    target,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: true },
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

test('adaptive review telemetry normalizes privacy-safe queue events', () => {
  const normalized = telemetry.normalizeSelectionTelemetry('grammarquest:review-queue-generated', {
    queueId: 'adaptive-review-2030-04-29',
    itemCount: 4,
    staleRefCount: 1,
    source: 'review',
    question: 'Do not leak prompt text',
    choices: ['A'],
    studentName: 'Maya'
  }, {
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.deepEqual(normalized, {
    event: 'review.queue_generated',
    eventName: 'review.queue_generated',
    eventVersion: 1,
    occurredAt: '2030-04-29T12:00:00.000Z',
    domain: '',
    mode: '',
    source: 'review',
    selectionSource: 'review',
    setCount: 0,
    requestedQuestionCount: 0,
    requestedCount: 0,
    selectedQuestionCount: 0,
    selectedCount: 0,
    requestBytes: 0,
    responseBytes: 0,
    selectionMs: 0,
    hydrateMs: 0,
    hydrateLatencyMs: 0,
    fallbackReason: '',
    routeType: '',
    selectionPolicyVersion: 0,
    policyVersion: 0,
    sourceHash: '',
    queueId: 'adaptive-review-2030-04-29',
    itemCount: 4,
    staleRefCount: 1
  });
  assert.equal(JSON.stringify(normalized).includes('Maya'), false);
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
