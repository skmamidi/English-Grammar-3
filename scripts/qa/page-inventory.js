#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function listHtmlFiles(root = repoRoot) {
  const files = [];
  walk(root, files);
  return files
    .filter(file => file.endsWith('.html'))
    .map(file => path.relative(root, file).split(path.sep).join('/'))
    .sort();
}

function walk(dir, files) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test-results') return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  });
}

function getTopicIndexPages(root = repoRoot) {
  return listHtmlFiles(root).filter(file => /^topics\/[^/]+\/index\.html$/.test(file));
}

function getSubtopicPages(root = repoRoot) {
  return listHtmlFiles(root).filter(file => /^topics\/[^/]+\/subtopics\/[^/]+\.html$/.test(file));
}

function getRepresentativeSubtopicPages(root = repoRoot) {
  const byDomain = new Map();
  getSubtopicPages(root).forEach(file => {
    const domain = file.split('/')[1];
    if (!byDomain.has(domain)) byDomain.set(domain, file);
  });
  return Array.from(byDomain.values()).sort();
}

function getCorePages(root = repoRoot) {
  return ['index.html', ...getTopicIndexPages(root), 'discovery.html', 'reports.html', 'settings.html', 'admin-operations.html', 'character-library.html']
    .filter(file => fs.existsSync(path.join(root, file)));
}

function buildRouteCompositionInventory(options = {}) {
  const root = options.root || repoRoot;
  const routes = listHtmlFiles(root).map(file => describeRoute(root, file));
  const legacyGlobals = Array.from(new Set(routes.flatMap(route => route.legacyGlobals))).sort();
  return {
    schemaVersion: 1,
    routes,
    legacyGlobals
  };
}

function describeRoute(root, file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const scripts = extractScripts(source);
  const stylesheets = extractStylesheets(source);
  const optionalScripts = scripts.external.filter(isOptionalScript);
  const requiredScripts = scripts.external.filter(script => !isOptionalScript(script));
  const legacyGlobals = Array.from(new Set(scripts.inline.flatMap(extractLegacyGlobals))).sort();
  return {
    path: file,
    type: classifyRoute(file),
    usesSharedShell: scripts.external.includes('assets/page-shell.js'),
    requiredShellAssets: stylesheets.concat(scripts.external.filter(script => script === 'assets/theme.js')).sort(),
    requiredScripts: requiredScripts.filter(script => !isGeneratedQuestionPayload(script)).sort(),
    optionalScripts: optionalScripts.sort(),
    serviceWorkerParticipation: scripts.external.includes('assets/service-worker-registration.js') ? 'registers' : 'none',
    legacyGlobals
  };
}

function extractScripts(source) {
  const external = [];
  const inline = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const src = readAttribute(match[1], 'src');
    if (src) external.push(normalizeAssetRef(src));
    else inline.push(match[2] || '');
  }
  return {
    external: Array.from(new Set(external)).sort(),
    inline
  };
}

function extractStylesheets(source) {
  const stylesheets = [];
  const pattern = /<link\b([^>]*rel=["']stylesheet["'][^>]*)>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const href = readAttribute(match[1], 'href');
    if (href) stylesheets.push(normalizeAssetRef(href));
  }
  return Array.from(new Set(stylesheets)).sort();
}

function extractLegacyGlobals(source) {
  return Array.from(source.matchAll(/\bwindow\.([A-Z][A-Z0-9_]+)\s*=/g))
    .map(match => match[1])
    .filter(name => name !== 'GRAMMAR_QUEST_CACHE_QUOTA_EXCEEDED')
    .sort();
}

function classifyRoute(file) {
  if (file === 'index.html') return 'home';
  if (/^topics\/[^/]+\/subtopics\/[^/]+\.html$/.test(file)) return 'quiz';
  if (/^topics\/[^/]+\/index\.html$/.test(file)) return 'topic-index';
  if (/-dashboard\.html$/.test(file)) return 'dashboard';
  if (file === 'admin-operations.html') return 'operations';
  if (file === 'discovery.html') return 'content-discovery';
  if (file === 'settings.html') return 'settings';
  if (file === 'subscription.html') return 'subscription';
  if (file === 'reports.html' || file === 'question-reports.html') return 'reports';
  if (file === 'assignments.html') return 'assignments';
  if (file === 'character-library.html') return 'character-library';
  if (/offline|error/.test(file)) return 'offline-error';
  return 'static';
}

function isOptionalScript(script) {
  return [
    'assets/auth-service.js',
    'assets/app-telemetry.js',
    'assets/app-telemetry-domain.js',
    'assets/app-telemetry-privacy.js',
    'assets/question-preloader.js',
    'assets/service-worker-registration.js'
  ].includes(script);
}

function isGeneratedQuestionPayload(script) {
  return /^assets\/question-(?:chunks|banks)\//.test(script);
}

function normalizeAssetRef(value) {
  const raw = String(value || '').split(/[?#]/)[0];
  const assetIndex = raw.indexOf('assets/');
  if (assetIndex >= 0) return raw.slice(assetIndex);
  return raw.replace(/^\/+/, '');
}

function readAttribute(source, name) {
  const pattern = new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = String(source || '').match(pattern);
  return match ? (match[1] || match[2] || '') : '';
}

if (require.main === module) {
  console.log(JSON.stringify({
    corePages: getCorePages(),
    representativeSubtopics: getRepresentativeSubtopicPages(),
    allSubtopics: getSubtopicPages(),
    routeComposition: buildRouteCompositionInventory()
  }, null, 2));
}

module.exports = {
  buildRouteCompositionInventory,
  repoRoot,
  listHtmlFiles,
  getTopicIndexPages,
  getSubtopicPages,
  getRepresentativeSubtopicPages,
  getCorePages
};
