(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCrossPlatformReleasePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const PLATFORMS = ['web', 'iphone', 'ipados'];
  const EVENT_TYPES = ['app_error', 'route_load_failed', 'sync_failed', 'native_crash_summary', 'content_bundle_rejected'];

  function buildCrossPlatformReleaseFixtures() {
    const policy = {
      schemaVersion: 1,
      releaseId: 'release-2030-04-29',
      platforms: PLATFORMS.slice(),
      clientCompatibility: {
        web: { minimumVersion: '1.0.0', sunsetBefore: '' },
        iphone: { minimumVersion: '1.1.0', sunsetBefore: '1.0.0' },
        ipados: { minimumVersion: '1.1.0', sunsetBefore: '1.0.0' }
      },
      contentPackage: {
        minimumSupportedSchemaVersion: 1,
        maximumSupportedSchemaVersion: 1,
        minimumClientVersion: '1.0.0'
      },
      syncEnvelope: {
        minimumSupportedSchemaVersion: 1,
        maximumSupportedSchemaVersion: 1
      },
      telemetry: {
        schemaVersion: 1,
        allowedEventTypes: EVENT_TYPES.slice(),
        allowedPlatforms: PLATFORMS.slice()
      },
      featureFlags: {
        nativeContentBundle: {
          targetPlatforms: ['iphone', 'ipados'],
          minimumVersion: '1.1.0',
          domainRule: 'shared'
        },
        accountSync: {
          targetPlatforms: ['web', 'iphone', 'ipados'],
          minimumVersion: '1.0.0',
          domainRule: 'shared'
        }
      },
      forcedUpgradeCriteria: [
        'client_version_below_minimum',
        'unsupported_content_package_schema',
        'unsupported_sync_schema',
        'telemetry_schema_unsupported',
        'unsafe_client_sunset'
      ]
    };
    return {
      policy,
      clients: {
        currentWeb: client('web', '1.0.0', 1, 1, 1),
        futureIpad: client('ipados', '1.2.0', 1, 1, 1),
        staleNative: client('ipados', '0.9.0', 1, 1, 1),
        unsupportedSchema: client('iphone', '1.2.0', 1, 2, 1),
        unsafeOldClient: client('iphone', '0.8.0', 1, 1, 1)
      }
    };
  }

  function client(platform, version, contentPackageSchemaVersion, syncEnvelopeSchemaVersion, telemetrySchemaVersion) {
    return { platform, version, contentPackageSchemaVersion, syncEnvelopeSchemaVersion, telemetrySchemaVersion };
  }

  function validateCrossPlatformReleasePolicy(policy) {
    const errors = [];
    const input = policy && typeof policy === 'object' ? policy : {};
    if (input.schemaVersion !== 1) errors.push('release_policy_schema_version_required');
    PLATFORMS.forEach(platform => {
      if (!Array.isArray(input.platforms) || !input.platforms.includes(platform)) errors.push(`platform_missing:${platform}`);
      if (!input.clientCompatibility || !input.clientCompatibility[platform]) errors.push(`client_compatibility_missing:${platform}`);
    });
    if (!input.contentPackage || Number(input.contentPackage.minimumSupportedSchemaVersion) < 1) errors.push('content_package_min_schema_required');
    if (!input.syncEnvelope || Number(input.syncEnvelope.maximumSupportedSchemaVersion) < 1) errors.push('sync_envelope_max_schema_required');
    if (!input.telemetry || input.telemetry.schemaVersion !== 1) errors.push('telemetry_schema_version_required');
    EVENT_TYPES.forEach(type => {
      if (!input.telemetry || !Array.isArray(input.telemetry.allowedEventTypes) || !input.telemetry.allowedEventTypes.includes(type)) {
        errors.push(`telemetry_event_type_missing:${type}`);
      }
    });
    ['unsupported_sync_schema', 'unsafe_client_sunset'].forEach(criteria => {
      if (!Array.isArray(input.forcedUpgradeCriteria) || !input.forcedUpgradeCriteria.includes(criteria)) {
        errors.push(`forced_upgrade_criteria_missing:${criteria}`);
      }
    });
    if (findUnsafeKeys(input).length) errors.push('release_policy_must_not_include_unsafe_observability_fields');
    return errors;
  }

  function evaluateClientReleaseCompatibility(policy, client) {
    const input = client && typeof client === 'object' ? client : {};
    const platform = normalizePlatform(input.platform);
    const platformPolicy = policy.clientCompatibility && policy.clientCompatibility[platform] || {};
    const reasons = [];
    if (!PLATFORMS.includes(platform)) reasons.push('platform_not_supported');
    if (compareVersion(input.version, platformPolicy.minimumVersion) < 0) reasons.push('client_version_below_minimum');
    if (platformPolicy.sunsetBefore && compareVersion(input.version, platformPolicy.sunsetBefore) < 0) reasons.push('unsafe_client_sunset');
    if (!schemaInRange(input.contentPackageSchemaVersion, policy.contentPackage)) reasons.push('unsupported_content_package_schema');
    if (!schemaInRange(input.syncEnvelopeSchemaVersion, policy.syncEnvelope)) reasons.push('unsupported_sync_schema');
    if (Number(input.telemetrySchemaVersion) !== Number(policy.telemetry && policy.telemetry.schemaVersion)) reasons.push('telemetry_schema_unsupported');
    return {
      status: reasons.length ? 'force_upgrade' : 'compatible',
      platform,
      clientVersion: safeString(input.version),
      reasons
    };
  }

  function evaluatePlatformFeatureFlag(policy, flagName, client) {
    const platform = normalizePlatform(client && client.platform);
    const flag = policy.featureFlags && policy.featureFlags[flagName];
    if (!flag) return { enabled: false, reason: 'unknown_flag', platform, domainRule: 'shared' };
    if (!flag.targetPlatforms.includes(platform)) {
      return { enabled: false, reason: 'platform_not_targeted', platform, domainRule: flag.domainRule || 'shared' };
    }
    if (compareVersion(client && client.version, flag.minimumVersion) < 0) {
      return { enabled: false, reason: 'client_version_below_minimum', platform, domainRule: flag.domainRule || 'shared' };
    }
    return { enabled: true, reason: 'eligible', platform, domainRule: flag.domainRule || 'shared' };
  }

  function normalizeObservabilityEvent(policy, event) {
    const input = event && typeof event === 'object' ? event : {};
    if (Number(input.telemetrySchemaVersion) !== Number(policy.telemetry && policy.telemetry.schemaVersion)) {
      throw new Error('telemetry_schema_unsupported');
    }
    const type = EVENT_TYPES.includes(input.type) ? input.type : 'app_error';
    if (!policy.telemetry.allowedEventTypes.includes(type)) throw new Error('telemetry_event_type_unsupported');
    return {
      type,
      platform: normalizePlatform(input.platform),
      clientVersion: safeString(input.clientVersion),
      telemetrySchemaVersion: Number(input.telemetrySchemaVersion),
      category: normalizeCategory(input.category || type),
      severity: normalizeSeverity(input.severity),
      route: stripQuery(input.route || '/')
    };
  }

  function schemaInRange(version, policy) {
    const value = Number(version);
    return value >= Number(policy.minimumSupportedSchemaVersion) && value <= Number(policy.maximumSupportedSchemaVersion);
  }

  function compareVersion(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    for (let i = 0; i < 3; i += 1) {
      if (a[i] > b[i]) return 1;
      if (a[i] < b[i]) return -1;
    }
    return 0;
  }

  function parseVersion(value) {
    return String(value || '0.0.0').split('.').slice(0, 3).map(part => Math.max(0, Number(part) || 0));
  }

  function normalizePlatform(value) {
    const platform = safeString(value).toLowerCase();
    return PLATFORMS.includes(platform) ? platform : 'unknown';
  }

  function normalizeCategory(value) {
    return safeString(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 60) || 'unknown';
  }

  function normalizeSeverity(value) {
    const severity = safeString(value).toLowerCase();
    return ['info', 'warn', 'error'].includes(severity) ? severity : 'warn';
  }

  function stripQuery(route) {
    return safeString(route).split(/[?#]/)[0] || '/';
  }

  function findUnsafeKeys(value, path = []) {
    if (!value || typeof value !== 'object') return [];
    return Object.keys(value).flatMap(key => {
      const current = path.concat(key);
      const finding = /learnerId|studentId|question|answer|explanation|email|token|stack|providerPayload/i.test(key) ? [current.join('.')] : [];
      return finding.concat(findUnsafeKeys(value[key], current));
    });
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildCrossPlatformReleaseFixtures,
    evaluateClientReleaseCompatibility,
    evaluatePlatformFeatureFlag,
    normalizeObservabilityEvent,
    validateCrossPlatformReleasePolicy
  };
});
