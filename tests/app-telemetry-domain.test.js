const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeAppTelemetryEvent
} = require('../assets/app-telemetry-domain');

test('app telemetry domain normalizes error and performance events to bounded fields', () => {
  const event = normalizeAppTelemetryEvent({
    type: 'app_error',
    appVersion: '1.2.3',
    route: '/topics/grammar/index.html?student=secret',
    category: 'TypeError: failed',
    severity: 'critical',
    featureFlags: { telemetryEnabled: true, syncEnabled: false, token: 'secret' },
    timing: { loadMs: 123.7, longTaskMs: 80.2 },
    occurredAt: '2030-04-29T12:00:00.000Z',
    stack: 'do not keep'
  });

  assert.equal(event.type, 'app_error');
  assert.equal(event.route, '/topics/grammar/index.html');
  assert.equal(event.category, 'type_error');
  assert.equal(event.severity, 'error');
  assert.deepEqual(event.featureFlags, { syncEnabled: false, telemetryEnabled: true });
  assert.deepEqual(event.timing, { loadMs: 124, longTaskMs: 80 });
  assert.equal(JSON.stringify(event).includes('secret'), false);
  assert.equal(JSON.stringify(event).includes('stack'), false);
});

test('app telemetry domain fails closed on unknown event types', () => {
  assert.throws(() => normalizeAppTelemetryEvent({ type: 'raw_analytics_dump' }), /app_telemetry_unknown_type/);
});

test('app telemetry domain accepts runtime performance smoke metrics as privacy-safe timing', () => {
  const event = normalizeAppTelemetryEvent({
    type: 'page_performance_summary',
    route: '/topics/grammar/index.html?learnerId=hidden',
    category: 'runtime performance budget',
    severity: 'info',
    timing: {
      hydrationMs: 1200,
      longTaskCount: 1,
      longestTaskMs: 80,
      totalLongTaskMs: 80,
      domNodeCount: 900,
      requiredChunkBytes: 64000,
      heapUsedBytes: 1234567
    },
    learnerName: 'Hidden Name',
    question: 'Raw prompt'
  }, {
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });

  assert.equal(event.type, 'page_performance_summary');
  assert.equal(event.route, '/topics/grammar/index.html');
  assert.equal(event.category, 'runtime_performance_budget');
  assert.equal(event.severity, 'info');
  assert.deepEqual(event.timing, {
    domNodeCount: 900,
    heapUsedBytes: 1234567,
    hydrationMs: 1200,
    longTaskCount: 1,
    longestTaskMs: 80,
    requiredChunkBytes: 64000,
    totalLongTaskMs: 80
  });
  assert.equal(JSON.stringify(event).includes('Hidden Name'), false);
  assert.equal(JSON.stringify(event).includes('Raw prompt'), false);
});
