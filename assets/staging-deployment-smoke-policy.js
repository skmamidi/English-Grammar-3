(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestStagingDeploymentSmokePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const fs = typeof require === 'function' ? require('node:fs') : null;
  const path = typeof require === 'function' ? require('node:path') : null;
  const crypto = typeof require === 'function' ? require('node:crypto') : null;
  const security = typeof require === 'function' ? require('../server/security-header-policy') : null;

  const DEFAULT_STAGING_SMOKE_REQUIREMENTS = Object.freeze({
    requiredChecks: Object.freeze([
      'static_assets',
      'release_manifest',
      'frontend_manifest',
      'question_manifest_source_hash',
      'service_worker_cache_version',
      'feature_flag_config_hash',
      'security_headers',
      'allowed_origins',
      'telemetry_config',
      'health_readiness'
    ]),
    routes: Object.freeze([
      '/',
      '/topics/grammar/index.html',
      '/topics/grammar/subtopics/sentence-types.html',
      '/settings.html',
      '/reports.html',
      '/guardian-dashboard.html',
      '/admin-operations.html'
    ])
  });

  function buildExpectedStagingMetadata(options = {}) {
    const rootDir = options.root || (path ? path.resolve(__dirname, '..') : '');
    const releaseManifest = readJson(rootDir, 'assets/release-manifest.json');
    const frontendManifest = readJson(rootDir, 'assets/build/frontend-manifest.json');
    return {
      releaseManifest,
      frontendManifestHash: hashFile(rootDir, 'assets/build/frontend-manifest.json'),
      frontendFiles: frontendManifest.files || [],
      requiredRoutes: Array.from(DEFAULT_STAGING_SMOKE_REQUIREMENTS.routes),
      securityHeaders: security ? security.buildSecurityHeaders() : {},
      allowedOrigins: ['http://localhost:8000'],
      telemetryDefault: 'disabled',
      healthStatus: 'ready'
    };
  }

  function validateStagingDeploymentSnapshot(snapshot, expected = {}) {
    const clean = sanitizeStagingSnapshot(snapshot || {});
    const failures = [];

    compareReleaseManifest(clean.releaseManifest || {}, expected.releaseManifest || {}, failures);
    if ((clean.frontendManifest || {}).sha256 !== expected.frontendManifestHash) {
      failures.push(failure('frontend_manifest_mismatch', 'frontend manifest hash differs from expected release metadata'));
    }
    compareStaticAssets(clean.staticAssets || [], expected.frontendFiles || [], failures);
    compareRoutes(clean.routes || [], expected.requiredRoutes || [], failures);
    compareSecurityHeaders(clean.securityHeaders || {}, expected.securityHeaders || {}, failures);
    compareArray(clean.allowedOrigins || [], expected.allowedOrigins || [], 'allowed_origin_mismatch', failures);

    if ((clean.telemetryConfig || {}).default !== expected.telemetryDefault) {
      failures.push(failure('telemetry_config_mismatch', 'telemetry default does not match expected staging policy'));
    }
    if ((clean.healthReadiness || {}).status !== expected.healthStatus ||
      (clean.healthReadiness || {}).releaseId !== (expected.releaseManifest || {}).releaseId) {
      failures.push(failure('health_readiness_mismatch', 'health/readiness does not match expected release metadata'));
    }

    return {
      ok: failures.length === 0,
      failures,
      summary: {
        checkedRoutes: (clean.routes || []).length,
        checkedStaticAssets: (clean.staticAssets || []).length,
        requiredChecks: DEFAULT_STAGING_SMOKE_REQUIREMENTS.requiredChecks.length
      },
      snapshot: clean
    };
  }

  function compareReleaseManifest(actual, expected, failures) {
    ['releaseId', 'appVersion'].forEach(field => {
      if (actual[field] !== expected[field]) failures.push(failure('release_manifest_mismatch', `${field} differs from release manifest`));
    });
    if (actual.questionManifestSourceHash !== expected.questionManifestSourceHash) {
      failures.push(failure('question_manifest_source_hash_mismatch', 'question manifest source hash differs from release manifest'));
    }
    if (actual.serviceWorkerCacheVersion !== expected.serviceWorkerCacheVersion) {
      failures.push(failure('service_worker_cache_version_mismatch', 'service worker cache version differs from release manifest'));
    }
    if (actual.featureFlagConfigHash !== expected.featureFlagConfigHash) {
      failures.push(failure('feature_flag_config_hash_mismatch', 'feature flag hash differs from release manifest'));
    }
  }

  function compareStaticAssets(actualAssets, expectedFiles, failures) {
    const byPath = new Map(actualAssets.map(asset => [asset.path, asset]));
    expectedFiles.forEach(file => {
      const actual = byPath.get(file.path);
      if (!actual || actual.sha256 !== file.sha256 || actual.status !== 200) {
        failures.push(failure('static_asset_mismatch', `${file.path} does not match frontend manifest`));
      }
    });
  }

  function compareRoutes(actualRoutes, requiredRoutes, failures) {
    const byPath = new Map(actualRoutes.map(route => [route.path, route]));
    requiredRoutes.forEach(route => {
      const actual = byPath.get(route);
      if (!actual || actual.status !== 200) failures.push(failure('route_unavailable', `${route} did not return a 200 response`));
    });
  }

  function compareSecurityHeaders(actualHeaders, expectedHeaders, failures) {
    Object.keys(expectedHeaders).forEach(header => {
      if (actualHeaders[header] !== expectedHeaders[header]) {
        failures.push(failure('security_header_mismatch', `${header} does not match security policy`));
      }
    });
  }

  function compareArray(actual, expected, code, failures) {
    if (JSON.stringify(Array.from(actual).sort()) !== JSON.stringify(Array.from(expected).sort())) {
      failures.push(failure(code, `${code} detected`));
    }
  }

  function sanitizeStagingSnapshot(value) {
    if (Array.isArray(value)) return value.map(sanitizeStagingSnapshot).filter(Boolean);
    if (!value || typeof value !== 'object') return typeof value === 'string' ? stripQuery(value) : value;
    return Object.keys(value).sort().reduce((clean, key) => {
      if (/(secret|token|password|privatekey|credential|client_email|serviceaccount|raw)/i.test(key)) return clean;
      clean[key] = sanitizeStagingSnapshot(value[key]);
      return clean;
    }, {});
  }

  function stripQuery(value) {
    return value.replace(/[?#].*$/, '');
  }

  function readJson(rootDir, file) {
    return JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8'));
  }

  function hashFile(rootDir, file) {
    return crypto.createHash('sha256').update(fs.readFileSync(path.join(rootDir, file))).digest('hex');
  }

  function failure(code, message) {
    return { code, message };
  }

  return {
    DEFAULT_STAGING_SMOKE_REQUIREMENTS,
    buildExpectedStagingMetadata,
    sanitizeStagingSnapshot,
    validateStagingDeploymentSnapshot
  };
});
