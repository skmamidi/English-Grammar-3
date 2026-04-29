const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  loadSelectionTelemetryEvents,
  summarizeSelectionTelemetry
} = require('../scripts/telemetry/summarize-selection-events');

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
