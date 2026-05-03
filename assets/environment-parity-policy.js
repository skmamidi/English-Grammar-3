(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestEnvironmentParityPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_ENVIRONMENTS = Object.freeze(['local', 'ci', 'staging', 'production']);
  const REQUIRED_PARITY_DIMENSIONS = Object.freeze([
    'node_version',
    'playwright_browser_matrix',
    'feature_flags',
    'asset_budgets',
    'security_headers',
    'allowed_origins',
    'telemetry_defaults',
    'selection_api_mode'
  ]);
  const APPROVED_COMMAND_PREFIXES = Object.freeze(['npm run ', 'node --test ', 'node scripts/']);
  const UNSAFE_FIELD_PATTERN = /(secret|token|password|privatekey|credential|learnerid|studentid|email|question|choices|answer|explanation|prompt|stack)/i;

  const DEFAULT_SNAPSHOT = Object.freeze({
    nodeVersion: '24.x',
    playwrightBrowsers: Object.freeze(['chromium']),
    featureFlags: Object.freeze([
      'serverSelectionEnabled=false',
      'preloadingEnabled=false',
      'telemetryEnabled=false',
      'syncEnabled=false'
    ]),
    assetBudgets: Object.freeze([
      'appShellBytes<=250000',
      'generatedChunkBytes<=150000',
      'staticAssetsPublicSafe=true'
    ]),
    securityHeaders: Object.freeze([
      'content-security-policy',
      'referrer-policy',
      'x-content-type-options'
    ]),
    allowedOrigins: Object.freeze(['http://localhost:8000']),
    telemetryDefault: 'disabled',
    selectionApiMode: 'local-fallback'
  });

  const DEFAULT_ENVIRONMENT_PARITY_POLICY = Object.freeze({
    schemaVersion: 1,
    dimensions: Object.freeze([
      dimension('node_version', 'Node version', 'platform', '24.x', 'node --test tests/ci-contract.test.js'),
      dimension('playwright_browser_matrix', 'Playwright browser matrix', 'qa', 'chromium', 'npm run test:browser:cross'),
      dimension('feature_flags', 'Feature flags', 'platform', 'safe defaults', 'node --test tests/feature-flag-domain.test.js'),
      dimension('asset_budgets', 'Asset budgets', 'frontend', 'app shell and generated artifact budgets', 'npm run qa:app-shell'),
      dimension('security_headers', 'Security headers', 'platform', 'runtime security headers', 'node --test tests/security-header-policy.test.js'),
      dimension('allowed_origins', 'Allowed origins', 'platform', 'configured public origins only', 'node --test tests/api-request-guard.test.js'),
      dimension('telemetry_defaults', 'Telemetry defaults', 'privacy', 'disabled by default', 'node --test tests/app-telemetry-privacy.test.js'),
      dimension('selection_api_mode', 'Selection API mode', 'platform', 'local fallback unless explicitly enabled', 'node --test tests/question-selection-runtime-contract.test.js')
    ]),
    snapshots: Object.freeze({
      local: DEFAULT_SNAPSHOT,
      ci: DEFAULT_SNAPSHOT,
      staging: DEFAULT_SNAPSHOT,
      production: DEFAULT_SNAPSHOT
    })
  });

  function validateEnvironmentParityPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const dimensions = (Array.isArray(input.dimensions) ? input.dimensions : []).map(normalizeDimension);
    const snapshots = input.snapshots && typeof input.snapshots === 'object' ? input.snapshots : {};
    const errors = [];
    const ids = new Set();

    dimensions.forEach(item => {
      if (!item.id) errors.push('dimension id is required');
      if (ids.has(item.id)) errors.push(`${item.id} dimension id must be unique`);
      ids.add(item.id);
      if (!REQUIRED_PARITY_DIMENSIONS.includes(item.id)) errors.push(`${item.id} dimension is not supported`);
      if (!item.label) errors.push(`${item.id} label is required`);
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!item.expected) errors.push(`${item.id} expected is required`);
      if (!isApprovedCommand(item.verificationCommand)) errors.push(`${item.id} verificationCommand must use an approved local command`);
    });

    REQUIRED_PARITY_DIMENSIONS.forEach(id => {
      if (!ids.has(id)) errors.push(`missing required dimension ${id}`);
    });

    REQUIRED_ENVIRONMENTS.forEach(environment => {
      if (!snapshots[environment]) {
        errors.push(`missing required environment ${environment}`);
      }
    });

    REQUIRED_ENVIRONMENTS.forEach(environment => {
      if (!snapshots[environment]) return;
      Object.keys(snapshots[environment]).forEach(key => {
        if (UNSAFE_FIELD_PATTERN.test(key)) errors.push(`${environment} snapshot includes unsafe field ${key}`);
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        dimensions,
        snapshots: normalizeSnapshots(snapshots)
      }
    };
  }

  function buildEnvironmentParityReport(policy) {
    const validation = validateEnvironmentParityPolicy(policy);
    const snapshots = validation.policy.snapshots;
    const baseline = snapshots.local || {};
    const drift = [];

    REQUIRED_PARITY_DIMENSIONS.forEach(dimensionId => {
      const field = dimensionField(dimensionId);
      const expected = normalizeComparable(baseline[field]);
      REQUIRED_ENVIRONMENTS.forEach(environment => {
        if (environment === 'local') return;
        const actual = normalizeComparable((snapshots[environment] || {})[field]);
        if (actual !== expected) {
          if (drift.some(item => item.dimension === dimensionId)) return;
          drift.push({
            environment,
            dimension: dimensionId,
            expected,
            actual
          });
        }
      });
    });

    return {
      schemaVersion: 1,
      ok: validation.valid && drift.length === 0,
      valid: validation.valid,
      errors: validation.errors,
      environments: REQUIRED_ENVIRONMENTS.slice(),
      dimensions: REQUIRED_PARITY_DIMENSIONS.slice(),
      checkedLiveEnvironments: false,
      drift,
      nextStep: 'Review parity before promotion, then run the listed verification commands for any drifted dimension.'
    };
  }

  function sanitizeEnvironmentSnapshot(snapshot = {}) {
    const safe = {};
    Object.keys(snapshot || {}).forEach(key => {
      if (UNSAFE_FIELD_PATTERN.test(key)) return;
      const value = snapshot[key];
      safe[key] = Array.isArray(value) ? value.map(stripUrlSecrets) : stripUrlSecrets(value);
    });
    return safe;
  }

  function dimension(id, label, owner, expected, verificationCommand) {
    return Object.freeze({ id, label, owner, expected, verificationCommand });
  }

  function normalizeDimension(item) {
    const input = item && typeof item === 'object' ? item : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label),
      owner: safeString(input.owner),
      expected: safeString(input.expected),
      verificationCommand: safeString(input.verificationCommand)
    };
  }

  function normalizeSnapshots(snapshots) {
    return REQUIRED_ENVIRONMENTS.reduce((memo, environment) => {
      if (snapshots[environment]) memo[environment] = sanitizeEnvironmentSnapshot(snapshots[environment]);
      return memo;
    }, {});
  }

  function dimensionField(dimensionId) {
    return {
      node_version: 'nodeVersion',
      playwright_browser_matrix: 'playwrightBrowsers',
      feature_flags: 'featureFlags',
      asset_budgets: 'assetBudgets',
      security_headers: 'securityHeaders',
      allowed_origins: 'allowedOrigins',
      telemetry_defaults: 'telemetryDefault',
      selection_api_mode: 'selectionApiMode'
    }[dimensionId];
  }

  function normalizeComparable(value) {
    if (Array.isArray(value)) return value.map(safeString).sort().join('|');
    return safeString(value);
  }

  function stripUrlSecrets(value) {
    const text = safeString(value);
    if (!text) return text;
    try {
      const url = new URL(text);
      url.search = '';
      url.hash = '';
      const normalized = url.toString();
      return normalized.endsWith('/') && url.pathname === '/' ? normalized.slice(0, -1) : normalized;
    } catch (_error) {
      return text.replace(/\b(token|secret|password|credential)=([^\s&]+)/gi, '$1=[redacted]');
    }
  }

  function isApprovedCommand(command) {
    const normalized = safeString(command);
    if (/[?&=]/.test(normalized)) return false;
    return APPROVED_COMMAND_PREFIXES.some(prefix => normalized.startsWith(prefix));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_ENVIRONMENT_PARITY_POLICY,
    REQUIRED_PARITY_DIMENSIONS,
    buildEnvironmentParityReport,
    sanitizeEnvironmentSnapshot,
    validateEnvironmentParityPolicy
  };
});
