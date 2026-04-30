(function (root, factory) {
  'use strict';

  const deps = {
    featureFlags: root.GrammarQuestFeatureFlagDomain || (typeof require === 'function' ? require('./feature-flag-domain') : null),
    audit: root.GrammarQuestAuditLogDomain || (typeof require === 'function' ? require('./audit-log-domain') : null)
  };
  const api = factory(deps);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAdminOperationsDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (deps) {
  'use strict';

  const featureFlags = deps.featureFlags;
  const SAFE_RELEASE_FIELDS = [
    'releaseId',
    'appVersion',
    'generatedAt',
    'questionManifestSourceHash',
    'serviceWorkerCacheVersion',
    'featureFlagConfigHash'
  ];
  const SAFE_ARTIFACT_FIELDS = [
    'questionManifestSourceHash',
    'sourceHash',
    'sourceSetCount',
    'chunkCount',
    'totalQuestions',
    'serviceWorkerCacheVersion'
  ];
  const HIGH_RISK_ACTIONS = new Set([
    'manageFeatureFlags',
    'feature-flag:update',
    'manageSelectionRollout',
    'managePublicSigningKeys',
    'manageContentArtifacts',
    'supportImpersonation',
    'audit-summary:view'
  ]);
  const unsafeKeyPattern = /(learner|student|question|choice|answer|explanation|snapshot|private|secret|token|password|credential|email|name)/i;

  function buildAdminOperationsProjection(input = {}) {
    const release = pickSafe(input.release, SAFE_RELEASE_FIELDS);
    const artifacts = normalizeArtifacts(input.artifacts, release);
    const flags = normalizeFeatureFlagSummary(input.featureFlags);
    const selectionHealth = normalizeSelectionHealth(input.selectionHealth);
    const cacheHealth = normalizeCacheHealth(input.cacheHealth || {
      expectedVersion: release.serviceWorkerCacheVersion,
      activeVersion: input.activeCacheVersion
    });
    const auditSummary = normalizeAuditSummary(input.auditEvents);
    const aggregateAnalytics = normalizeAggregateAnalytics(input.aggregateAnalytics);
    const experiments = normalizeExperiments(input.experiments);
    const warnings = normalizeStringList(input.warnings);
    collectHealthWarnings(selectionHealth, cacheHealth).forEach(warning => warnings.push(warning));
    return {
      release,
      artifacts,
      featureFlags: flags,
      selectionHealth,
      cacheHealth,
      auditSummary,
      aggregateAnalytics,
      experiments,
      warnings: Array.from(new Set(warnings))
    };
  }

  function normalizeArtifacts(input = {}, release = {}) {
    const safe = pickSafe(input, SAFE_ARTIFACT_FIELDS);
    if (!safe.questionManifestSourceHash && release.questionManifestSourceHash) {
      safe.questionManifestSourceHash = release.questionManifestSourceHash;
    }
    if (!safe.serviceWorkerCacheVersion && release.serviceWorkerCacheVersion) {
      safe.serviceWorkerCacheVersion = release.serviceWorkerCacheVersion;
    }
    return safe;
  }

  function normalizeFeatureFlagSummary(input = {}) {
    const normalized = featureFlags && typeof featureFlags.normalizeFeatureFlags === 'function'
      ? featureFlags.normalizeFeatureFlags(input)
      : Object.assign({}, input);
    return Object.keys(normalized).sort().reduce((summary, key) => {
      if (unsafeKeyPattern.test(key)) return summary;
      const value = normalized[key];
      summary[key] = typeof value === 'boolean'
        ? { enabled: value }
        : { value: cloneSafe(value) };
      return summary;
    }, {});
  }

  function normalizeSelectionHealth(input = {}) {
    const groups = input && input.groups && typeof input.groups === 'object'
      ? Object.values(input.groups)
      : [];
    return {
      totalEvents: Number.isFinite(Number(input.totalEvents)) ? Number(input.totalEvents) : 0,
      groups: groups.map(group => ({
        domain: safeString(group.domain),
        mode: safeString(group.mode),
        eventCount: safeNumber(group.eventCount),
        apiSuccessRate: safeNumber(group.apiSuccessRate),
        fallbackRate: safeNumber(group.fallbackRate),
        fallbackReasons: cloneSafe(group.fallbackReasons || {}),
        hydrateLatencyMs: cloneSafe(group.hydrateLatencyMs || { p50: 0, p95: 0 }),
        responseBytes: cloneSafe(group.responseBytes || { p50: 0, p95: 0 })
      })).sort((left, right) => `${left.domain}|${left.mode}`.localeCompare(`${right.domain}|${right.mode}`))
    };
  }

  function normalizeCacheHealth(input = {}) {
    const expectedVersion = safeString(input.expectedVersion);
    const activeVersion = safeString(input.activeVersion);
    const staleCaches = normalizeStringList(input.staleCaches);
    let status = 'unknown';
    if (expectedVersion && activeVersion) status = expectedVersion === activeVersion ? 'healthy' : 'error';
    if (status === 'healthy' && staleCaches.length) status = 'warning';
    return {
      expectedVersion,
      activeVersion,
      controlled: input.controlled === true,
      staleCaches,
      status
    };
  }

  function normalizeAuditSummary(events = [], options = {}) {
    const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 8;
    const safeEvents = (Array.isArray(events) ? events : [])
      .filter(event => event && HIGH_RISK_ACTIONS.has(String(event.action || '')))
      .map(event => ({
        id: safeString(event.id),
        actorId: safeString(event.actorId),
        actorRole: safeString(event.actorRole),
        action: safeString(event.action),
        resourceType: safeString(event.resourceType),
        resourceId: safeString(event.resourceId),
        createdAt: safeString(event.createdAt),
        metadata: sanitizeMetadata(event.metadata || {})
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const counts = safeEvents.reduce((result, event) => {
      result[event.action] = (result[event.action] || 0) + 1;
      return result;
    }, {});
    return {
      totalEvents: safeEvents.length,
      highRiskActionCounts: counts,
      recentEvents: safeEvents.slice(0, limit)
    };
  }

  function normalizeAggregateAnalytics(input = {}) {
    const reports = Array.isArray(input.reports) ? input.reports : [];
    return {
      status: safeString(input.status || 'unknown'),
      suppressedCohortCount: safeNumber(input.suppressedCohortCount),
      reports: reports.map(report => ({
        cohortSizeBucket: safeString(report.cohortSizeBucket),
        assignment: cloneSafe(report.assignment || {}),
        featureFlagHealth: cloneSafe(report.featureFlagHealth || {})
      }))
    };
  }

  function normalizeExperiments(input = []) {
    return (Array.isArray(input) ? input : []).map(experiment => ({
      id: safeString(experiment.id),
      status: safeString(experiment.status),
      guardrailHealth: safeString(experiment.guardrailHealth || 'unknown')
    })).sort((left, right) => left.id.localeCompare(right.id));
  }

  function collectHealthWarnings(selectionHealth, cacheHealth) {
    const warnings = [];
    if (selectionHealth.groups.some(group => group.fallbackRate >= 0.25)) warnings.push('selection fallback rate elevated');
    if (cacheHealth.status === 'warning') warnings.push('stale service worker caches present');
    if (cacheHealth.status === 'error') warnings.push('service worker cache version mismatch');
    return warnings;
  }

  function pickSafe(input = {}, fields) {
    const source = input && typeof input === 'object' ? input : {};
    return fields.reduce((result, key) => {
      const value = source[key];
      if (value !== undefined && !unsafeKeyPattern.test(key)) result[key] = cloneSafe(value);
      return result;
    }, {});
  }

  function sanitizeMetadata(value) {
    if (Array.isArray(value)) return value.map(sanitizeMetadata);
    if (!value || typeof value !== 'object') return cloneSafe(value);
    return Object.keys(value).reduce((result, key) => {
      if (unsafeKeyPattern.test(key)) return result;
      result[key] = sanitizeMetadata(value[key]);
      return result;
    }, {});
  }

  function cloneSafe(value) {
    if (Array.isArray(value)) return value.map(cloneSafe);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (unsafeKeyPattern.test(key)) return result;
      result[key] = cloneSafe(value[key]);
      return result;
    }, {});
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeStringList(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
      .map(safeString)
      .filter(Boolean))).sort();
  }

  return {
    buildAdminOperationsProjection,
    normalizeAuditSummary,
    normalizeCacheHealth,
    normalizeFeatureFlagSummary,
    normalizeSelectionHealth
  };
});
