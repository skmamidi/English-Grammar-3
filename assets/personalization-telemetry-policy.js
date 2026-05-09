(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestPersonalizationTelemetryPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const TYPES = ['feature_store_read', 'assembly_completed', 'experiment_assigned', 'display_rendered', 'fallback_triggered'];
  const FAIRNESS_FLAGS = new Set(['grade_skew', 'skill_starvation', 'domain_starvation', 'coverage_drift', 'unsupported_stretch', 'over_remediation']);
  const UNSAFE = /learner|student|email|prompt|question|choice|answer|explanation|provider|vector|snapshot|token|secret|raw/i;

  function evaluatePersonalizationTelemetryPolicy(input = {}) {
    const flags = input.featureFlags || input.flags || {};
    const prefs = input.privacyPreferences || {};
    const consent = input.consent || {};
    if (input.parentPreview === true || input.parentMode === true) return { enabled: false, reason: 'parent_preview_denied' };
    if (flags.personalizationTelemetryEnabled !== true) return { enabled: false, reason: 'feature_flag_disabled' };
    if (prefs.telemetryEnabled !== true || consent.telemetry !== true) return { enabled: false, reason: 'telemetry_consent_required' };
    return { enabled: true, reason: 'enabled' };
  }

  function normalizePersonalizationRolloutEvent(input = {}) {
    const type = TYPES.includes(input.type) ? input.type : 'fallback_triggered';
    return removeEmpty({
      schemaVersion: 1,
      type,
      policyVersion: safeToken(input.policyVersion),
      fallbackReason: safeToken(input.fallbackReason),
      candidateCountBucket: bucketCount(input.candidateCount),
      selectedCountBucket: bucketCount(input.selectedCount),
      latencyBucket: input.latencyBucket || bucketLatency(input.latencyMs),
      payloadBucket: input.payloadBucket || bucketBytes(input.payloadBytes),
      fairnessFlags: normalizeFairnessFlags(input.fairnessFlags),
      featureFreshness: input.featureFreshness === 'stale' ? 'stale' : input.featureFreshness === 'missing' ? 'missing' : input.featureFreshness === 'fresh' ? 'fresh' : ''
    });
  }

  function summarizePersonalizationEvents(events = []) {
    const normalized = (Array.isArray(events) ? events : []).map(normalizePersonalizationRolloutEvent);
    return {
      schemaVersion: 1,
      aggregateOnly: true,
      totalEvents: normalized.length,
      byType: countBy(normalized.map(event => event.type)),
      fallbackReasons: countBy(normalized.map(event => event.fallbackReason).filter(Boolean)),
      fairnessFlags: countBy(normalized.flatMap(event => event.fairnessFlags || [])),
      latencyBuckets: countBy(normalized.map(event => event.latencyBucket).filter(Boolean)),
      payloadBuckets: countBy(normalized.map(event => event.payloadBucket).filter(Boolean))
    };
  }

  function assertPersonalizationTelemetryPrivacy(value) {
    scan(value, []);
    return true;
  }

  function scan(value, path) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(key => {
      if (path[0] !== 'fallbackReasons' && UNSAFE.test(key)) throw new Error(`unsafe_personalization_telemetry_field:${path.concat(key).join('.')}`);
      scan(value[key], path.concat(key));
    });
  }

  function normalizeFairnessFlags(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeToken).filter(value => FAIRNESS_FLAGS.has(value)))).sort();
  }

  function countBy(values) {
    return values.reduce((counts, value) => {
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
  }

  function bucketCount(value) {
    const n = Math.max(0, Number(value) || 0);
    if (n === 0) return '0';
    if (n < 10) return '1-9';
    if (n < 20) return '10-19';
    if (n < 25) return '20-24';
    if (n < 50) return '25-49';
    if (n < 100) return '50-99';
    return '100+';
  }

  function bucketLatency(value) {
    const n = Math.max(0, Number(value) || 0);
    if (n < 50) return '0-49ms';
    if (n < 100) return '50-99ms';
    if (n < 250) return '100-249ms';
    return '250ms+';
  }

  function bucketBytes(value) {
    const n = Math.max(0, Number(value) || 0);
    if (n < 1024) return '0-1kb';
    if (n < 4096) return '1-4kb';
    if (n < 8192) return '4-8kb';
    if (n < 16384) return '8-16kb';
    return '16kb+';
  }

  function removeEmpty(input) {
    return Object.keys(input).reduce((result, key) => {
      const value = input[key];
      if (Array.isArray(value)) result[key] = value;
      else if (value !== '') result[key] = value;
      return result;
    }, {});
  }

  function safeToken(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_:/.-]/g, '_').slice(0, 80);
  }

  return {
    assertPersonalizationTelemetryPrivacy,
    evaluatePersonalizationTelemetryPolicy,
    normalizePersonalizationRolloutEvent,
    summarizePersonalizationEvents
  };
});
