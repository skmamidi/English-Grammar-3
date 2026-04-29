const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

test('package lock pins Playwright for reproducible installs', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');

  assert.equal(pkg.devDependencies.playwright, '1.44.0');
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages[''].devDependencies.playwright, '1.44.0');
  assert.equal(lock.packages['node_modules/playwright'].version, '1.44.0');
  assert.equal(lock.packages['node_modules/playwright-core'].version, '1.44.0');
});

test('package scripts expose reproducible browser install and full QA gate', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.scripts['install:browsers'], 'playwright install chromium');
  assert.match(pkg.scripts.test, /npm run qa:questions/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:schema/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:json-source/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:question-consistency/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:manifest/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:chunks/);
  assert.match(pkg.scripts.test, /npm run qa:content/);
  assert.match(pkg.scripts.test, /npm run test:unit/);
  assert.match(pkg.scripts.test, /npm run test:ui/);
  assert.match(pkg.scripts.test, /npm run test:a11y/);
  assert.match(pkg.scripts.test, /npm run test:offline/);
  assert.equal(pkg.scripts['test:a11y'], 'node tests/accessibility-smoke.spec.js');
  assert.equal(pkg.scripts['test:offline'], 'node tests/offline-smoke.spec.js');
  assert.equal(pkg.scripts['test:visual'], 'node tests/visual-regression.spec.js');
  assert.match(pkg.scripts['test:unit'], /tests\/access-control\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/guardian-access\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/system-admin-access\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/audit-log-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-signing\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-telemetry\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-api-budget\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-service\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/learner-state-repository\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/service-worker-cache\.test\.js/);
  assert.equal(pkg.scripts['questions:normalize'], 'node scripts/assign-question-ids.js --write');
  assert.equal(pkg.scripts['questions:write'], 'npm run manifest:write');
});

test('github qa workflow uses npm ci, installs chromium, and runs npm test', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'qa.yml'), 'utf8');

  assert.match(workflow, /actions\/setup-node@v4/);
  assert.match(workflow, /node-version:\s*20/);
  assert.match(workflow, /cache:\s*npm/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npx playwright install --with-deps chromium/);
  assert.match(workflow, /run:\s*npm test/);
});

test('ui smoke defaults to Playwright-managed Chromium with env override only', () => {
  const smoke = fs.readFileSync(path.join(repoRoot, 'tests', 'ui-smoke.spec.js'), 'utf8');

  assert.match(smoke, /PLAYWRIGHT_CHROMIUM_EXECUTABLE/);
  assert.doesNotMatch(smoke, /Google Chrome\.app|Chromium\.app/);
});

test('regular browser smoke disables service worker registration while offline smoke owns it', () => {
  const uiSmoke = fs.readFileSync(path.join(repoRoot, 'tests', 'ui-smoke.spec.js'), 'utf8');
  const a11ySmoke = fs.readFileSync(path.join(repoRoot, 'tests', 'accessibility-smoke.spec.js'), 'utf8');
  const offlineSmoke = fs.readFileSync(path.join(repoRoot, 'tests', 'offline-smoke.spec.js'), 'utf8');

  assert.match(uiSmoke, /disableServiceWorker:\s*true/);
  assert.match(a11ySmoke, /disableServiceWorker:\s*true/);
  assert.match(offlineSmoke, /navigator\.serviceWorker\.ready/);
});

test('live default tests do not load legacy JS question banks as canonical source', () => {
  const jsonSourceTests = fs.readFileSync(path.join(repoRoot, 'tests', 'question-bank-json-source.test.js'), 'utf8');

  assert.doesNotMatch(jsonSourceTests, /loadQuestionBanks\(\{\s*sourceType:\s*['"]legacy['"]\s*\}\)/);
  assert.match(jsonSourceTests, /fixtures['"], ['"]legacy-bank-conversion/);
});

test('question authoring guide documents the canonical content workflow', () => {
  const guide = fs.readFileSync(path.join(repoRoot, 'docs', 'question-authoring.md'), 'utf8');

  assert.match(guide, /assets\/question-bank-source\/\*\.json/);
  assert.match(guide, /npm run questions:normalize/);
  assert.match(guide, /npm run questions:write/);
  assert.match(guide, /npm run qa:content/);
  assert.match(guide, /contentHash/);
  assert.match(guide, /visualScene/);
  assert.match(guide, /assets\/question-chunks\/\*\*\/\*\.js/);
});

test('ui smoke covers subtopic selection telemetry', () => {
  const smoke = fs.readFileSync(path.join(repoRoot, 'tests', 'ui-smoke.spec.js'), 'utf8');

  assert.match(smoke, /capitalization pilot subtopic can use question selection API/);
  assert.match(smoke, /pilot subtopic should record normalized API telemetry/);
  assert.match(smoke, /pilot subtopic fallback should record normalized fallback telemetry/);
  assert.match(smoke, /api_unavailable/);
});

test('production pages load learner state repository before progress store', () => {
  const offenders = findHtmlFiles(repoRoot).filter(file => {
    const html = fs.readFileSync(file, 'utf8');
    const progressIndex = html.indexOf('assets/progress-store.js');
    if (progressIndex < 0) return false;
    const repositoryIndex = html.indexOf('assets/learner-state-repository.js');
    return repositoryIndex < 0 || repositoryIndex > progressIndex;
  }).map(file => path.relative(repoRoot, file).split(path.sep).join('/'));

  assert.deepEqual(offenders, []);
});

test('role and permission domain model is documented', () => {
  const accessControl = fs.readFileSync(path.join(repoRoot, 'assets', 'access-control.js'), 'utf8');
  const roleDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'roles-and-permissions.md'), 'utf8');

  assert.match(accessControl, /PARENT_GUARDIAN/);
  assert.match(accessControl, /SYSTEM_ADMIN/);
  assert.match(accessControl, /canAccess/);
  assert.match(roleDocs, /Parent\/guardian is not a system admin/);
  assert.match(roleDocs, /deny by default/);
});

test('guardian access boundary has relationship fixtures and contracts', () => {
  const guardianTest = fs.readFileSync(path.join(repoRoot, 'tests', 'guardian-access.test.js'), 'utf8');
  const fixture = fs.readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'access-control', 'guardian-links.json'), 'utf8');
  const roleDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'roles-and-permissions.md'), 'utf8');

  assert.match(guardianTest, /canOpenParentPreview/);
  assert.match(guardianTest, /canViewLearnerProgress/);
  assert.match(fixture, /"guardianId"/);
  assert.match(roleDocs, /Parent preview/);
  assert.match(roleDocs, /authenticated guardian/);
});

test('system admin audit boundary has contracts and docs', () => {
  const adminTest = fs.readFileSync(path.join(repoRoot, 'tests', 'system-admin-access.test.js'), 'utf8');
  const auditTest = fs.readFileSync(path.join(repoRoot, 'tests', 'audit-log-domain.test.js'), 'utf8');
  const auditDomain = fs.readFileSync(path.join(repoRoot, 'assets', 'audit-log-domain.js'), 'utf8');
  const adminDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'system-admin-role.md'), 'utf8');

  assert.match(adminTest, /manageSelectionRollout/);
  assert.match(auditTest, /sanitizeAuditMetadata/);
  assert.match(auditDomain, /canUseSupportAccess/);
  assert.match(adminDocs, /Audit/);
  assert.match(adminDocs, /support access/i);
});

test('visual regression suite and design token contract exist', () => {
  const pkg = readJson('package.json');
  const styles = fs.readFileSync(path.join(repoRoot, 'assets', 'styles.css'), 'utf8');
  const visualTest = fs.readFileSync(path.join(repoRoot, 'tests', 'visual-regression.spec.js'), 'utf8');
  const visualDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'ui-regression.md'), 'utf8');
  const baselineDir = path.join(repoRoot, 'tests', 'visual-baselines');
  const baselines = fs.readdirSync(baselineDir).filter(file => file.endsWith('.json'));

  assert.match(pkg.scripts.test, /npm run test:visual/);
  assert.match(styles, /design-tokens\.css/);
  assert.match(visualTest, /toVisualSignature/);
  assert.match(visualDocs, /baseline/i);
  assert.ok(baselines.length >= 8, 'expected reviewed visual baselines');
});

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
}

function findHtmlFiles(root) {
  const files = [];
  walk(root, files);
  return files;
}

function walk(current, files) {
  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    const name = path.basename(current);
    if (name === 'node_modules' || name === '.git') return;
    fs.readdirSync(current).forEach(entry => walk(path.join(current, entry), files));
    return;
  }
  if (current.endsWith('.html')) files.push(current);
}
