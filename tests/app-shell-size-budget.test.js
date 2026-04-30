const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const budget = require('../scripts/qa/app-shell-size-budget');

const repoRoot = path.resolve(__dirname, '..');

test('app shell size budget excludes generated question payloads and passes current shell', () => {
  const result = budget.checkAppShellSizeBudget({ root: repoRoot });

  assert.deepEqual(result.errors, []);
  assert.equal(result.files.some(file => /question-(chunks|manifest)/.test(file.path)), false);
  assert.ok(result.totals.javascriptBytes > 0);
  assert.ok(result.totals.cssBytes > 0);
  assert.ok(result.totals.htmlBytes > 0);
});

test('app shell size budget fails oversized module output with actionable paths', () => {
  const result = budget.evaluateAppShellFiles([{
    path: 'assets/build/app-entry.js',
    bytes: 260 * 1024,
    category: 'javascript'
  }]);

  assert.ok(result.errors.some(error => /assets\/build\/app-entry\.js/.test(error)));
  assert.ok(result.errors.some(error => /javascript/i.test(error)));
});

test('app shell budget contract is documented for release review', () => {
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');

  assert.match(checklist, /app shell size budget/i);
  assert.match(checklist, /npm run qa:app-shell-size/i);
});
