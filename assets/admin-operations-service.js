(function (root, factory) {
  'use strict';

  const deps = {
    access: root.GrammarQuestAccessControl || (typeof require === 'function' ? require('./access-control') : null),
    audit: root.GrammarQuestAuditLogDomain || (typeof require === 'function' ? require('./audit-log-domain') : null),
    domain: root.GrammarQuestAdminOperationsDomain || (typeof require === 'function' ? require('./admin-operations-domain') : null),
    featureFlags: root.GrammarQuestFeatureFlagDomain || (typeof require === 'function' ? require('./feature-flag-domain') : null)
  };
  const api = factory(deps);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAdminOperationsService = api;
})(typeof window !== 'undefined' ? window : globalThis, function (deps) {
  'use strict';

  const access = deps.access;
  const audit = deps.audit;
  const domain = deps.domain;
  const featureFlags = deps.featureFlags;

  function createAdminOperationsService(adapters = {}) {
    return {
      getConsoleProjection,
      previewFeatureFlagUpdate,
      updateFeatureFlags
    };

    async function getConsoleProjection(options = {}) {
      requireAdmin(options.actor, access.Capabilities.viewAdminConsole, access.ResourceTypes.ADMIN_CONSOLE);
      const warnings = [];
      const release = await readSource('release', adapters.releaseManifest, {}, warnings);
      const flags = await readSource('feature flags', adapters.featureFlags, {}, warnings);
      const selectionHealth = await readSource('selection health', adapters.selectionTelemetrySummary, {}, warnings);
      const cacheHealth = await readSource('cache health', adapters.cacheMetadata, {}, warnings);
      const artifacts = await readSource('artifacts', adapters.artifactMetadata, {}, warnings);
      const auditEvents = await readSource('audit', adapters.auditEvents, [], warnings);
      return domain.buildAdminOperationsProjection({
        release,
        featureFlags: flags,
        selectionHealth,
        cacheHealth,
        artifacts,
        auditEvents,
        warnings
      });
    }

    async function previewFeatureFlagUpdate(options = {}) {
      requireAdmin(options.actor, access.Capabilities.updateFeatureFlags, access.ResourceTypes.FEATURE_FLAG);
      const current = featureFlags.normalizeFeatureFlags(await readSource('feature flags', adapters.featureFlags, {}, []));
      const next = featureFlags.normalizeFeatureFlags(Object.assign({}, current, options.patch || {}));
      return {
        current,
        next,
        writable: typeof adapters.writeFeatureFlags === 'function',
        auditRequired: true,
        validationErrors: featureFlags.validateFeatureFlags(next)
      };
    }

    async function updateFeatureFlags(options = {}) {
      if (typeof adapters.writeFeatureFlags !== 'function') throw new Error('feature_flags_read_only');
      const preview = await previewFeatureFlagUpdate(options);
      if (preview.validationErrors.length) throw new Error(`invalid_feature_flags:${preview.validationErrors.join(',')}`);
      if (!String(options.reason || '').trim()) throw new Error('audit_reason_required');
      const written = await adapters.writeFeatureFlags(preview.next);
      if (typeof adapters.appendAuditEvent === 'function') {
        const event = audit.buildFeatureFlagUpdateAuditEvent(
          options.actor,
          { id: 'feature-flags' },
          {
            reason: options.reason,
            previous: preview.current,
            next: preview.next
          },
          { now: options.now, id: options.id }
        );
        await adapters.appendAuditEvent(event);
      }
      return {
        featureFlags: written || preview.next,
        auditEmitted: typeof adapters.appendAuditEvent === 'function'
      };
    }
  }

  function requireAdmin(actor, capability, resourceType) {
    access.requireCapability(actor, capability, { type: resourceType, id: 'operations' });
  }

  async function readSource(label, source, fallback, warnings) {
    if (typeof source !== 'function') return fallback;
    try {
      const value = await source();
      return value == null ? fallback : value;
    } catch (error) {
      warnings.push(`${label} unavailable`);
      return fallback;
    }
  }

  return {
    createAdminOperationsService
  };
});
