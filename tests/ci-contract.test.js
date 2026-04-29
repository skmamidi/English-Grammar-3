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
  assert.match(pkg.scripts['qa:questions'], /npm run qa:manifest/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:chunks/);
  assert.match(pkg.scripts.test, /npm run qa:content/);
  assert.match(pkg.scripts.test, /npm run test:unit/);
  assert.match(pkg.scripts.test, /npm run test:ui/);
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
}
