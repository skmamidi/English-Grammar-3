#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const pageInventory = require('./page-inventory');
const sharedDomainContracts = require('../../assets/shared-domain-contracts');

const MODULE_BOUNDARY_POLICY = {
  layers: [
    'production_html',
    'browser_shell',
    'browser_ui',
    'browser_domain',
    'portable_domain',
    'generated_content',
    'server_runtime',
    'qa_scripts',
    'tests',
    'docs',
    'provider_adapters'
  ],
  providerSdkPrefixes: [
    '@aws-sdk/',
    '@braintree/',
    '@firebase/',
    '@google-cloud/',
    '@paypal/',
    '@sentry/',
    '@stripe/',
    'aws-sdk',
    'braintree',
    'firebase',
    'firebase/',
    'paypal',
    'paypal-checkout',
    'stripe',
    'supabase',
    '@supabase/'
  ],
  ownedProductionGlobals: [
    'GRAMMAR_QUEST_CACHE_QUOTA_EXCEEDED',
    'QUIZ_SET_ID'
  ],
  portableDomainModules: [
    'assets/adaptive-review-domain.js',
    'assets/app-telemetry-domain.js',
    'assets/assignment-domain.js',
    'assets/feature-flag-domain.js',
    'assets/learner-goals-domain.js',
    'assets/learner-state-sync-domain.js',
    'assets/mastery-projection-domain.js',
    'assets/privacy-preferences-domain.js',
    'assets/quiz-selection-core.js',
    'assets/selection-telemetry-domain.js',
    'assets/spaced-repetition-domain.js',
    'assets/weak-skill-recommendation-domain.js'
  ]
};

function auditModuleBoundaries(options = {}) {
  const root = options.root || repoRoot;
  const files = listProjectFiles(root);
  const dependencies = files.flatMap(file => collectDependencies(root, file));
  const productionInventory = pageInventory.buildRouteCompositionInventory({ root });
  const ownedProductionGlobals = collectOwnedProductionGlobals(root);
  const violations = [];

  dependencies.forEach(dependency => {
    const fromLayer = classifyLayer(dependency.from);
    const toLayer = classifyDependencyLayer(dependency, root);

    if (fromLayer === 'browser_ui' && toLayer === 'server_runtime') {
      violations.push(violation('browser_ui_depends_on_server_runtime', dependency.from, dependency.to, 'Browser UI must not import server runtime modules.'));
    }

    if (fromLayer === 'browser_shell' && toLayer === 'generated_content') {
      violations.push(violation('browser_shell_depends_on_generated_content', dependency.from, dependency.to, 'Browser shell modules must not depend on generated question payloads.'));
    }

    if (isBrowserLayer(fromLayer) && dependency.type === 'bare' && isProviderSdk(dependency.to)) {
      violations.push(violation('provider_sdk_in_browser_domain', dependency.from, dependency.to, 'Provider SDKs must stay behind provider adapter boundaries.'));
    }
  });

  files
    .filter(file => classifyLayer(file) === 'portable_domain')
    .forEach(file => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      sharedDomainContracts.auditPortableDomainSource(file, source).forEach(item => {
        violations.push(violation(item.code, item.file, null, item.message));
      });
    });

  files
    .filter(file => classifyLayer(file) === 'browser_domain' || classifyLayer(file) === 'browser_ui' || classifyLayer(file) === 'browser_shell')
    .filter(file => /telemetry/i.test(path.basename(file)))
    .forEach(file => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      if (usesTelemetryTransport(source) && !usesPrivacyGate(source)) {
        violations.push(violation('telemetry_without_privacy_gate', file, null, 'Telemetry transports must depend on privacy preference or privacy guard domains.'));
      }
    });

  productionInventory.routes.forEach(route => {
    route.legacyGlobals.forEach(globalName => {
      if (!ownedProductionGlobals.includes(globalName)) {
        violations.push(violation('unowned_production_global', route.path, globalName, 'Production browser globals must be owned by the route inventory docs.'));
      }
    });
  });

  return {
    ok: violations.length === 0,
    policyVersion: 1,
    summary: {
      totalFiles: files.length,
      dependencies: dependencies.length,
      productionRoutes: productionInventory.routes.length,
      portableDomainModules: files.filter(file => classifyLayer(file) === 'portable_domain').length,
      ownedProductionGlobals
    },
    dependencies,
    violations
  };
}

function listProjectFiles(root = repoRoot) {
  const files = [];
  walk(root, files);
  return files
    .map(file => path.relative(root, file).split(path.sep).join('/'))
    .filter(file => /\.(?:js|html|md)$/.test(file))
    .sort();
}

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (['.git', 'node_modules', 'test-results'].includes(entry.name)) return;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  });
}

function collectDependencies(root, file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath) || !/\.(?:js|html)$/.test(file)) return [];
  const source = fs.readFileSync(fullPath, 'utf8');
  if (file.endsWith('.html')) return collectHtmlScriptDependencies(source, file);
  return collectJavaScriptDependencies(root, file, source);
}

function collectJavaScriptDependencies(root, file, source) {
  const dependencies = [];
  const patterns = [
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(source))) {
      const specifier = match[1];
      dependencies.push({
        from: file,
        to: normalizeDependencyTarget(root, file, specifier),
        specifier,
        type: specifier.startsWith('.') || specifier.startsWith('/') ? 'relative' : 'bare'
      });
    }
  });

  return dependencies;
}

function collectHtmlScriptDependencies(source, file) {
  const dependencies = [];
  const pattern = /<script\b([^>]*)>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const src = readAttribute(match[1], 'src');
    if (!src) continue;
    dependencies.push({
      from: file,
      to: normalizeAssetRef(src),
      specifier: src,
      type: 'script'
    });
  }
  return dependencies;
}

function normalizeDependencyTarget(root, fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return specifier;
  const base = specifier.startsWith('/')
    ? path.join(root, specifier)
    : path.resolve(root, path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.json`,
    path.join(base, 'index.js')
  ];
  const resolved = candidates.find(candidate => fs.existsSync(candidate)) || base;
  return path.relative(root, resolved).split(path.sep).join('/');
}

function normalizeAssetRef(value) {
  const raw = String(value || '').split(/[?#]/)[0];
  const assetIndex = raw.indexOf('assets/');
  if (assetIndex >= 0) return raw.slice(assetIndex);
  return raw.replace(/^\/+/, '');
}

function classifyDependencyLayer(dependency, root = repoRoot) {
  if (dependency.type === 'bare') return isProviderSdk(dependency.to) ? 'provider_adapters' : 'external';
  return classifyLayer(dependency.to, root);
}

function classifyLayer(file) {
  const normalized = String(file || '').replace(/\\/g, '/');
  if (/\.html$/.test(normalized)) return 'production_html';
  if (/^docs\//.test(normalized)) return 'docs';
  if (/^tests\//.test(normalized)) return 'tests';
  if (/^server\//.test(normalized)) return 'server_runtime';
  if (/^(providers|adapters)\//.test(normalized)) return 'provider_adapters';
  if (/^scripts\//.test(normalized)) return 'qa_scripts';
  if (/^assets\/question-chunks\//.test(normalized) || /^assets\/question-bank-source\//.test(normalized)) return 'generated_content';
  if (MODULE_BOUNDARY_POLICY.portableDomainModules.includes(normalized)) return 'portable_domain';
  if (/^assets\/(?:page-shell|app-entry|service-worker-registration|service-worker-core|theme)\.js$/.test(normalized)) return 'browser_shell';
  if (/^assets\/build\//.test(normalized)) return 'browser_shell';
  if (/^assets\/.*(?:-ui|dashboard|reports|assignments-page|progress-transfer|entry)\.js$/.test(normalized)) return 'browser_ui';
  if (/^assets\//.test(normalized)) return 'browser_domain';
  return 'unknown';
}

function collectOwnedProductionGlobals(root) {
  const globals = new Set(MODULE_BOUNDARY_POLICY.ownedProductionGlobals);
  const docsPath = path.join(root, 'docs', 'frontend-architecture.md');
  if (fs.existsSync(docsPath)) {
    const source = fs.readFileSync(docsPath, 'utf8');
    for (const match of source.matchAll(/`([A-Z][A-Z0-9_]+)`/g)) {
      globals.add(match[1]);
    }
  }
  return Array.from(globals).sort();
}

function isBrowserLayer(layer) {
  return ['browser_shell', 'browser_ui', 'browser_domain', 'portable_domain'].includes(layer);
}

function isProviderSdk(specifier) {
  return MODULE_BOUNDARY_POLICY.providerSdkPrefixes.some(prefix => String(specifier || '').startsWith(prefix));
}

function usesTelemetryTransport(source) {
  return /\b(fetch|sendBeacon|XMLHttpRequest)\b|endpoint|transport/i.test(source);
}

function usesPrivacyGate(source) {
  return /privacy-preferences-domain|app-telemetry-privacy|PrivacyPreferences|canSendTelemetry/i.test(source);
}

function readAttribute(source, name) {
  const pattern = new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = String(source || '').match(pattern);
  return match ? (match[1] || match[2] || '') : '';
}

function violation(code, from, to, message) {
  return { code, from, to, message };
}

if (require.main === module) {
  const report = auditModuleBoundaries({ root: repoRoot });
  console.log(JSON.stringify({
    ok: report.ok,
    policyVersion: report.policyVersion,
    summary: report.summary,
    violations: report.violations
  }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

module.exports = {
  MODULE_BOUNDARY_POLICY,
  auditModuleBoundaries,
  classifyLayer,
  listProjectFiles
};
