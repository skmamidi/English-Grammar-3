const fs = require('node:fs');

function loadAppTelemetryEvents(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function summarizeAppTelemetryEvents(events) {
  const normalized = (Array.isArray(events) ? events : []);
  const loadMs = [];
  const summary = {
    totalEvents: normalized.length,
    errorsByRoute: {},
    serviceWorkerFailures: {},
    longTaskCount: 0,
    performance: {
      loadMs: { p50: 0, p95: 0 }
    }
  };
  normalized.forEach(event => {
    assertSafe(event);
    const route = String(event.route || '/');
    const category = String(event.category || 'unknown');
    if (event.type === 'app_error' || event.type === 'route_load_failed' || event.type === 'resource_load_failed') {
      summary.errorsByRoute[route] = summary.errorsByRoute[route] || {};
      summary.errorsByRoute[route][category] = (summary.errorsByRoute[route][category] || 0) + 1;
    }
    if (event.type === 'service_worker_failed') {
      summary.serviceWorkerFailures[category] = (summary.serviceWorkerFailures[category] || 0) + 1;
    }
    if (event.type === 'long_task_detected') summary.longTaskCount += 1;
    if (event.timing && Number.isFinite(Number(event.timing.loadMs))) loadMs.push(Number(event.timing.loadMs));
  });
  summary.performance.loadMs = percentileSummary(loadMs);
  return summary;
}

function percentileSummary(values) {
  if (!values.length) return { p50: 0, p95: 0 };
  const sorted = values.slice().sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 0.5, Math.floor),
    p95: percentile(sorted, 0.95, Math.ceil)
  };
}

function percentile(sorted, p, round) {
  const index = Math.min(sorted.length - 1, round((sorted.length - 1) * p));
  return sorted[index];
}

function assertSafe(event) {
  const serialized = JSON.stringify(event || {});
  if (/(learnerId|studentId|question|choices|answer|explanation|authToken|stack|token)/i.test(serialized)) {
    throw new Error('unsafe app telemetry event');
  }
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/telemetry/summarize-app-events.js <events.ndjson>');
    process.exit(1);
  }
  console.log(JSON.stringify(summarizeAppTelemetryEvents(loadAppTelemetryEvents(filePath)), null, 2));
}

module.exports = {
  loadAppTelemetryEvents,
  summarizeAppTelemetryEvents
};
