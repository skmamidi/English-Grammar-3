#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { assertSelectionTelemetryPrivacy } = require('../../assets/question-selection-telemetry');

function loadSelectionTelemetryEvents(filePath) {
  const source = fs.readFileSync(filePath, 'utf8').trim();
  if (!source) return [];
  if (source[0] === '[') return JSON.parse(source);
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function summarizeSelectionTelemetry(events) {
  const groups = {};
  (Array.isArray(events) ? events : []).forEach(event => {
    assertSelectionTelemetryPrivacy(event);
    const domain = safeKey(event.domain);
    const mode = safeKey(event.mode);
    const key = `${domain}|${mode}`;
    const group = groups[key] || createGroup(domain, mode);
    groups[key] = group;
    group.eventCount += 1;
    const source = event.selectionSource || event.source || '';
    if (source === 'api') group.apiSuccessCount += 1;
    if (source === 'fallback') {
      group.fallbackCount += 1;
      const reason = event.fallbackReason || 'unknown';
      group.fallbackReasons[reason] = (group.fallbackReasons[reason] || 0) + 1;
      if (reason === 'integrity_failed') group.integrityFailureCount += 1;
      if (/signature/.test(reason)) group.signatureFailureCount += 1;
    }
    collectNumber(group.hydrateLatencySamples, event.hydrateLatencyMs ?? event.hydrateMs);
    collectNumber(group.responseByteSamples, event.responseBytes);
  });

  Object.values(groups).forEach(finalizeGroup);
  return {
    totalEvents: Array.isArray(events) ? events.length : 0,
    groups
  };
}

function createGroup(domain, mode) {
  return {
    domain,
    mode,
    eventCount: 0,
    apiSuccessCount: 0,
    fallbackCount: 0,
    apiSuccessRate: 0,
    fallbackRate: 0,
    fallbackReasons: {},
    hydrateLatencySamples: [],
    responseByteSamples: [],
    hydrateLatencyMs: { p50: 0, p95: 0 },
    responseBytes: { p50: 0, p95: 0 },
    integrityFailureCount: 0,
    signatureFailureCount: 0
  };
}

function finalizeGroup(group) {
  group.apiSuccessRate = group.eventCount ? group.apiSuccessCount / group.eventCount : 0;
  group.fallbackRate = group.eventCount ? group.fallbackCount / group.eventCount : 0;
  group.hydrateLatencyMs = percentiles(group.hydrateLatencySamples);
  group.responseBytes = percentiles(group.responseByteSamples);
  delete group.hydrateLatencySamples;
  delete group.responseByteSamples;
}

function percentiles(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95)
  };
}

function percentile(sorted, rank) {
  if (!sorted.length) return 0;
  const index = Math.ceil(sorted.length * rank) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function collectNumber(target, value) {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) target.push(number);
}

function safeKey(value) {
  return String(value || 'unknown').slice(0, 80);
}

function printSummary(summary) {
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(`Usage: node ${path.relative(process.cwd(), __filename)} <events.ndjson|events.json>`);
    process.exitCode = 1;
  } else {
    printSummary(summarizeSelectionTelemetry(loadSelectionTelemetryEvents(filePath)));
  }
}

module.exports = {
  loadSelectionTelemetryEvents,
  summarizeSelectionTelemetry
};
