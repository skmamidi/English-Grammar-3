const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const budget = require('../scripts/qa/app-shell-size-budget');
const config = require('../scripts/qa/app-shell-budget-config');

const repoRoot = path.resolve(__dirname, '..');

test('app shell size budget excludes generated question payloads and passes current shell', () => {
  const result = budget.checkAppShellSizeBudget({ root: repoRoot });

  assert.deepEqual(result.errors, []);
  assert.equal(result.files.some(file => /question-(chunks|manifest)/.test(file.path)), false);
  assert.equal(result.files.some(file => /story-lesson-chunks/.test(file.path)), false);
  assert.equal(result.files.some(file => /story-lesson-manifest\.json/.test(file.path)), false);
  assert.equal(result.files.some(file => /spelling-(audio-manifest|word-list)/.test(file.path)), false);
  assert.ok(result.excludedFiles.some(file => /question-manifest/.test(file.path)));
  assert.ok(result.excludedFiles.some(file => /story-lesson-chunks/.test(file.path)));
  assert.ok(result.excludedFiles.some(file => /story-lesson-manifest\.json/.test(file.path)));
  assert.ok(result.excludedFiles.some(file => /spelling-audio-manifest/.test(file.path)));
  assert.ok(result.totals.javascriptBytes > 0);
  assert.ok(result.totals.cssBytes > 0);
  assert.ok(result.totals.htmlBytes > 0);
  assert.ok(result.topOffenders.length > 0);
});

test('app shell budget config exposes warning and failure thresholds', () => {
  const limits = config.DEFAULT_APP_SHELL_BUDGET_LIMITS;

  assert.ok(limits.javascriptFile.warnBytes < limits.javascriptFile.failBytes);
  assert.ok(limits.javascriptTotal.warnBytes < limits.javascriptTotal.failBytes);
  assert.ok(limits.cssTotal.warnBytes < limits.cssTotal.failBytes);
  assert.ok(limits.serviceWorkerTotal.warnBytes < limits.serviceWorkerTotal.failBytes);
  assert.ok(limits.releaseMetadataTotal.warnBytes < limits.releaseMetadataTotal.failBytes);
});

test('app shell size budget warns and fails oversized module output with deltas', () => {
  const result = budget.evaluateAppShellFiles([{
    path: 'assets/build/app-entry.js',
    bytes: 260 * 1024,
    category: 'javascript'
  }], config.DEFAULT_APP_SHELL_BUDGET_LIMITS);

  assert.ok(result.errors.some(error => /assets\/build\/app-entry\.js/.test(error.message)));
  assert.ok(result.errors.some(error => error.deltaBytes > 0));
  assert.ok(result.warnings.some(warning => /javascript/i.test(warning.message)));
  assert.equal(result.topOffenders[0].path, 'assets/build/app-entry.js');
});

test('app shell size budget reports missing required assets and ignores question content', () => {
  const result = budget.evaluateAppShellFiles([{
    path: 'assets/question-chunks/grammar/grammar-sentence-types.js',
    bytes: 500 * 1024,
    category: 'questionContent'
  }, {
    path: 'assets/story-lesson-chunks/grammar/grammar-sentence-types.js',
    bytes: 500 * 1024,
    category: 'storyLessonContent'
  }], config.DEFAULT_APP_SHELL_BUDGET_LIMITS, {
    requiredFiles: ['sw.js']
  });

  assert.equal(result.files.length, 0);
  assert.equal(result.excludedFiles[0].path, 'assets/question-chunks/grammar/grammar-sentence-types.js');
  assert.equal(result.excludedFiles[1].path, 'assets/story-lesson-chunks/grammar/grammar-sentence-types.js');
  assert.ok(result.errors.some(error => /missing required app shell asset sw\.js/.test(error.message)));
});

test('app shell size budget measures assets and release metadata separately', () => {
  const result = budget.evaluateAppShellFiles([
    { path: 'assets/icons/app.svg', bytes: 2048, category: 'asset' },
    { path: 'release-manifest.json', bytes: 1024, category: 'releaseMetadata' },
    { path: 'assets/build/app-entry.js', bytes: 1024, category: 'javascript' }
  ]);

  assert.equal(result.totals.assetBytes, 2048);
  assert.equal(result.totals.releaseMetadataBytes, 1024);
  assert.equal(result.totals.javascriptBytes, 1024);
});

test('app shell budget excludes non-runtime policy modules but counts browser route code', () => {
  const result = budget.checkAppShellSizeBudget({ root: repoRoot });
  const countedPaths = new Set(result.files.map(file => file.path));

  [
    'assets/billing-operations-job-policy.js',
    'assets/billing-rollback-policy.js',
    'assets/curriculum-release-channel-policy.js',
    'assets/reviewer-workload-sla-report.js',
    'assets/cross-platform-commerce-policy.js',
    'assets/billing-market-readiness-matrix.js'
  ].forEach(file => {
    assert.equal(countedPaths.has(file), false, `${file} should stay out of runtime shell totals`);
  });

  [
    'assets/subscription-route.js',
    'assets/page-shell.js',
    'assets/theme.js'
  ].forEach(file => {
    assert.equal(countedPaths.has(file), true, `${file} should remain budgeted runtime code`);
  });
});

test('app shell budget contract is documented for release review', () => {
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'performance', 'app-shell-budgets.md'), 'utf8');

  assert.match(checklist, /app shell size budget/i);
  assert.match(checklist, /npm run qa:app-shell/);
  assert.match(docs, /required app shell/i);
  assert.match(docs, /preloaded question chunks/i);
  assert.match(docs, /non-runtime policy modules/i);
});
