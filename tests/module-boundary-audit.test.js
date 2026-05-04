const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  auditModuleBoundaries,
  classifyLayer,
  MODULE_BOUNDARY_POLICY
} = require('../scripts/qa/module-boundary-audit');

const repoRoot = path.resolve(__dirname, '..');

test('module boundary policy exposes explicit layers and forbidden rules', () => {
  [
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
  ].forEach(layer => assert.ok(MODULE_BOUNDARY_POLICY.layers.includes(layer), `${layer} layer should be declared`));

  assert.equal(classifyLayer('index.html'), 'production_html');
  assert.equal(classifyLayer('assets/page-shell.js'), 'browser_shell');
  assert.equal(classifyLayer('assets/dashboard-ui.js'), 'browser_ui');
  assert.equal(classifyLayer('assets/quiz-selection-core.js'), 'portable_domain');
  assert.equal(classifyLayer('assets/question-chunks/grammar/sentence-types.js'), 'generated_content');
  assert.equal(classifyLayer('server/question-selection-runtime.js'), 'server_runtime');
  assert.equal(classifyLayer('scripts/qa/content-qa.js'), 'qa_scripts');
  assert.equal(classifyLayer('tests/module-boundary-audit.test.js'), 'tests');
  assert.equal(classifyLayer('docs/adr/README.md'), 'docs');
  assert.equal(classifyLayer('providers/firebase/auth-adapter.js'), 'provider_adapters');
});

test('module boundary audit rejects forbidden UI server generated shell and provider dependencies', () => {
  const fixtureRoot = makeFixture({
    'index.html': '<script src="assets/page-shell.js"></script><script>window.NEW_ROUTE_GLOBAL = true;</script>',
    'assets/dashboard-ui.js': "const runtime = require('../server/question-selection-runtime');",
    'assets/page-shell.js': "import chunks from './question-chunks/grammar/sentence-types.js';",
    'assets/quiz-selection-core.js': "const firebase = require('firebase/app'); localStorage.getItem('x');",
    'assets/question-selection-telemetry.js': "module.exports = { send() { fetch('/telemetry'); } };",
    'server/question-selection-runtime.js': 'module.exports = {};',
    'assets/question-chunks/grammar/sentence-types.js': 'window.QUESTION_BANK = {};',
    'docs/frontend-architecture.md': ''
  });

  const report = auditModuleBoundaries({ root: fixtureRoot });
  const codes = report.violations.map(violation => violation.code);

  assert.ok(codes.includes('browser_ui_depends_on_server_runtime'));
  assert.ok(codes.includes('browser_shell_depends_on_generated_content'));
  assert.ok(codes.includes('provider_sdk_in_browser_domain'));
  assert.ok(codes.includes('browser_api_in_portable_domain'));
  assert.ok(codes.includes('telemetry_without_privacy_gate'));
  assert.ok(codes.includes('unowned_production_global'));
  assert.equal(report.ok, false);
});

test('module boundary audit allows owned globals and privacy-gated telemetry', () => {
  const fixtureRoot = makeFixture({
    'index.html': '<script src="assets/page-shell.js"></script><script>window.QUIZ_SET_ID = "grammar";</script>',
    'assets/page-shell.js': "import './theme.js';",
    'assets/theme.js': 'module.exports = {};',
    'assets/question-selection-telemetry.js': "const privacy = require('./privacy-preferences-domain'); module.exports = {};",
    'assets/privacy-preferences-domain.js': 'module.exports = {};',
    'docs/frontend-architecture.md': 'Owned production globals: QUIZ_SET_ID'
  });

  const report = auditModuleBoundaries({ root: fixtureRoot });

  assert.deepEqual(report.violations, []);
  assert.equal(report.ok, true);
  assert.ok(report.summary.totalFiles >= 5);
});

test('current repository passes module boundary audit', () => {
  const report = auditModuleBoundaries({ root: repoRoot });

  assert.deepEqual(report.violations, []);
  assert.equal(report.ok, true);
  assert.ok(report.summary.productionRoutes > 0);
  assert.ok(report.summary.dependencies > 0);
  assert.ok(report.summary.ownedProductionGlobals.includes('QUIZ_SET_ID'));
  assert.ok(report.summary.portableDomainModules >= 10);
});

test('module boundary docs and package script are wired', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'architecture-boundaries.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /module dependency and boundary audit/i);
  assert.match(docs, /npm run qa:module-boundaries/);
  assert.match(docs, /browser UI must not depend on server runtime/i);
  assert.match(docs, /provider SDKs/i);
  assert.equal(pkg.scripts['qa:module-boundaries'], 'node scripts/qa/module-boundary-audit.js');
  assert.match(pkg.scripts['test:unit'], /tests\/module-boundary-audit\.test\.js/);
});

function makeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'module-boundary-audit-'));
  Object.entries(files).forEach(([file, source]) => {
    const fullPath = path.join(root, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, source);
  });
  return root;
}
