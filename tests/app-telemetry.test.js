const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createAppTelemetrySink,
  installAppTelemetryCapture
} = require('../assets/app-telemetry');

test('app telemetry sink is disabled by default and transport failure never throws', () => {
  const sent = [];
  const disabled = createAppTelemetrySink({ transport: event => sent.push(event) });
  disabled.capture({ type: 'app_error', route: '/index.html' });
  assert.equal(sent.length, 0);

  const enabled = createAppTelemetrySink({
    enabled: true,
    consent: { telemetry: true },
    transport() {
      throw new Error('network down');
    }
  });
  assert.doesNotThrow(() => enabled.capture({ type: 'app_error', route: '/index.html' }));
});

test('app telemetry capture normalizes browser failures without unsafe fields', () => {
  const target = createFakeTarget();
  const sent = [];
  const capture = installAppTelemetryCapture({
    target,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: true,
      errorTelemetryEnabled: true
    },
    route: '/quiz.html?student=secret',
    appVersion: '1.0.0',
    transport: event => sent.push(event),
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  target.dispatch('error', { message: 'TypeError: boom', filename: 'https://app.test/quiz.html?token=secret', error: { stack: 'raw stack' } });
  target.dispatch('unhandledrejection', { reason: new Error('failed promise') });
  target.dispatch('error', { target: { tagName: 'SCRIPT', src: 'https://cdn.test/missing.js?token=secret' } });
  capture.uninstall();

  assert.equal(sent.length, 3);
  assert.equal(sent[0].type, 'app_error');
  assert.equal(sent[1].type, 'app_error');
  assert.equal(sent[2].type, 'resource_load_failed');
  assert.ok(sent.every(event => event.route === '/quiz.html'));
  assert.equal(JSON.stringify(sent).includes('secret'), false);
  assert.equal(JSON.stringify(sent).includes('raw stack'), false);
});

test('app telemetry sink respects granular privacy preferences', () => {
  const errors = [];
  const sink = createAppTelemetrySink({
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: true,
      errorTelemetryEnabled: false,
      performanceTelemetryEnabled: true
    },
    transport: event => errors.push(event),
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.equal(sink.capture({ type: 'app_error', route: '/index.html' }).status, 'disabled');
  assert.equal(errors.length, 0);

  const performance = [];
  const perfSink = createAppTelemetrySink({
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: true,
      errorTelemetryEnabled: false,
      performanceTelemetryEnabled: true
    },
    transport: event => performance.push(event),
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.equal(perfSink.capture({ type: 'page_performance_summary', route: '/index.html', category: 'navigation' }).status, 'sent');
  assert.equal(performance.length, 1);
});

test('app telemetry capture never sends from parent preview context', () => {
  const target = createFakeTarget();
  const sent = [];
  installAppTelemetryCapture({
    target,
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: {
      telemetryEnabled: true,
      errorTelemetryEnabled: true
    },
    parentPreview: true,
    transport: event => sent.push(event)
  });

  target.dispatch('error', { message: 'TypeError: boom' });
  assert.deepEqual(sent, []);
});

test('app telemetry sink gates goal-card interaction telemetry by consent and preview mode', () => {
  const sent = [];
  const sink = createAppTelemetrySink({
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: true },
    route: '/guardian-dashboard.html?learnerId=secret',
    transport: event => sent.push(event),
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.equal(sink.capture({
    type: 'goal_card_interaction',
    category: 'goal card impression',
    interaction: {
      kind: 'impression',
      cardId: 'review_status',
      band: 'review_due',
      roleView: 'parent_guardian',
      learnerId: 'learner-1'
    }
  }).status, 'sent');
  assert.equal(sent.length, 1);
  assert.equal(JSON.stringify(sent).includes('learner-1'), false);

  const previewSent = [];
  const previewSink = createAppTelemetrySink({
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: true },
    parentPreview: true,
    transport: event => previewSent.push(event)
  });
  assert.equal(previewSink.capture({ type: 'goal_card_interaction', interaction: { kind: 'click' } }).status, 'disabled');
  assert.deepEqual(previewSent, []);
});

test('app telemetry sink gates lesson lifecycle telemetry by preferences and strips lesson content', () => {
  const sent = [];
  const sink = createAppTelemetrySink({
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: true },
    route: '/topics/vocabulary/subtopics/homophones.html?learnerId=secret',
    transport: event => sent.push(event),
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.equal(sink.capture({
    type: 'lesson_completed',
    lesson: {
      setId: 'vocabulary-homophones',
      grade: 4,
      status: 'completed',
      storyBeats: [{ narrative: 'Raw lesson body' }]
    }
  }).status, 'sent');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].route, '/topics/vocabulary/subtopics/homophones.html');
  assert.equal(JSON.stringify(sent[0]).includes('Raw lesson body'), false);

  const optedOut = [];
  const optOutSink = createAppTelemetrySink({
    enabled: true,
    consent: { telemetry: true },
    privacyPreferences: { telemetryEnabled: false },
    transport: event => optedOut.push(event)
  });
  assert.equal(optOutSink.capture({ type: 'lesson_started', lesson: { setId: 'grammar-sentence-types' } }).status, 'disabled');
  assert.deepEqual(optedOut, []);
});

function createFakeTarget() {
  const listeners = {};
  return {
    addEventListener(name, handler) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(handler);
    },
    removeEventListener(name, handler) {
      listeners[name] = (listeners[name] || []).filter(item => item !== handler);
    },
    dispatch(name, event) {
      (listeners[name] || []).forEach(handler => handler(event));
    }
  };
}
