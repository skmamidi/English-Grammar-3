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
