const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertAppTelemetryPrivacy,
  sanitizeAppTelemetryPayload
} = require('../assets/app-telemetry-privacy');

test('app telemetry privacy guard rejects learner content, stacks, query strings, and secrets', () => {
  [
    { learnerId: 'learner-1' },
    { route: '/quiz.html?student=secret' },
    { stack: 'raw stack' },
    { question: 'raw prompt' },
    { choices: ['A', 'B'] },
    { answer: 'A' },
    { explanation: 'Because...' },
    { authToken: 'secret' }
  ].forEach(payload => assert.throws(() => assertAppTelemetryPrivacy(payload), /unsafe_app_telemetry/));
});

test('app telemetry privacy sanitizer keeps safe operational fields', () => {
  const payload = sanitizeAppTelemetryPayload({
    type: 'route_load_failed',
    route: '/reports.html?student=secret',
    category: 'missing_state',
    featureFlags: { telemetryEnabled: true, privateKeyRef: 'secret' }
  });

  assert.equal(payload.route, '/reports.html');
  assert.deepEqual(payload.featureFlags, { telemetryEnabled: true });
  assert.doesNotThrow(() => assertAppTelemetryPrivacy(payload));
});
