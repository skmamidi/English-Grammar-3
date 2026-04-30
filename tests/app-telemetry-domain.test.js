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
