const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  loadSelectionTelemetryEvents,
  summarizeSelectionTelemetry
} = require('../scripts/telemetry/summarize-selection-events');
const {
  summarizeAppTelemetryEvents
} = require('../scripts/telemetry/summarize-app-events');

const fixturePath = path.join(__dirname, 'fixtures', 'telemetry', 'selection-events.ndjson');

test('selection telemetry summary groups rollout health by domain and mode', () => {
  const events = loadSelectionTelemetryEvents(fixturePath);
  const summary = summarizeSelectionTelemetry(events);

  assert.equal(summary.totalEvents, 5);
  assert.equal(summary.groups['grammar|mixed'].eventCount, 3);
  assert.equal(summary.groups['grammar|mixed'].apiSuccessRate, 2 / 3);
  assert.equal(summary.groups['grammar|mixed'].fallbackRate, 1 / 3);
  assert.deepEqual(summary.groups['grammar|mixed'].fallbackReasons, {
    integrity_failed: 1
  });
  assert.equal(summary.groups['grammar|mixed'].hydrateLatencyMs.p50, 20);
  assert.equal(summary.groups['grammar|mixed'].hydrateLatencyMs.p95, 40);
  assert.equal(summary.groups['grammar|mixed'].responseBytes.p50, 2000);
  assert.equal(summary.groups['grammar|mixed'].responseBytes.p95, 4000);
  assert.equal(summary.groups['grammar|mixed'].integrityFailureCount, 1);

  assert.equal(summary.groups['vocabulary|mixed'].eventCount, 2);
  assert.equal(summary.groups['vocabulary|mixed'].fallbackReasons.api_unavailable, 1);
});

test('selection telemetry summary rejects unsafe exported fields', () => {
  assert.throws(
    () => summarizeSelectionTelemetry([{
      eventName: 'selection.api_used',
      domain: 'grammar',
      mode: 'mixed',
      selectionSource: 'api',
      question: 'Prompt text'
    }]),
    /unsafe telemetry field/
  );
});

test('app telemetry summary groups errors, service worker failures, and coarse performance', () => {
  const summary = summarizeAppTelemetryEvents([
    { type: 'app_error', route: '/index.html', category: 'type_error' },
    { type: 'service_worker_failed', route: '/index.html', category: 'registration_failed' },
    { type: 'long_task_detected', route: '/quiz.html', timing: { longTaskMs: 120 } },
    { type: 'page_performance_summary', route: '/quiz.html', timing: { loadMs: 100 } },
    { type: 'page_performance_summary', route: '/quiz.html', timing: { loadMs: 300 } }
  ]);

  assert.equal(summary.totalEvents, 5);
  assert.equal(summary.errorsByRoute['/index.html'].type_error, 1);
  assert.equal(summary.serviceWorkerFailures.registration_failed, 1);
  assert.equal(summary.longTaskCount, 1);
  assert.equal(summary.performance.loadMs.p50, 100);
  assert.equal(summary.performance.loadMs.p95, 300);
});
