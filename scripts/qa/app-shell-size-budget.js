#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_APP_SHELL_BUDGET_LIMITS } = require('./app-shell-budget-config');

const repoRoot = path.resolve(__dirname, '..', '..');
const QUESTION_CONTENT_PATTERN = /(^|\/)assets\/question-(chunks|bank-source|banks|manifest)(\/|\.|$)/;
const STORY_LESSON_CONTENT_PATTERN = /(^|\/)assets\/story-lesson-chunks(\/|$)/;
const GUIDED_MISSION_CONTENT_PATTERN = /(^|\/)assets\/guided-mission-(source|catalog)(\/|\.|$)/;
const SPELLING_CONTENT_FILES = new Set([
  'assets/story-lesson-manifest.json',
  'assets/spelling-audio-manifest.js',
  'assets/spelling-word-list.js'
]);
const SERVICE_WORKER_FILES = new Set([
  'sw.js',
  'assets/service-worker-core.js',
  'assets/service-worker-registration.js'
]);
const NON_RUNTIME_CONTRACT_FILES = new Set([
  'assets/native-learner-sync-acceptance.js',
  'assets/universal-link-route-parity.js',
  'assets/cross-platform-release-policy.js',
  'assets/cross-platform-commerce-policy.js',
  'assets/commerce-readiness-policy.js',
  'assets/billing-owner-profile-domain.js',
  'assets/commerce-catalog-domain.js',
  'assets/subscription-ux-policy.js',
  'assets/subscription-plan-choice-policy.js',
  'assets/ui-copy-policy.js',
  'assets/transactional-communication-contract.js',
  'assets/commerce-security-policy.js',
  'assets/commerce-support-policy.js',
  'assets/billing-domain-contracts.js',
  'assets/billing-entitlement-projection.js',
  'assets/billing-status-presentation.js',
  'assets/payment-history-presentation.js',
  'assets/billing-management-action-policy.js',
  'assets/billing-state-presentation-policy.js',
  'assets/subscription-route-contract.js',
  'assets/checkout-method-policy.js',
  'assets/checkout-launch-availability-policy.js',
  'assets/billing-ux-regression-policy.js',
  'assets/billing-data-inventory-policy.js',
  'assets/billing-launch-checklist-policy.js',
  'assets/billing-operations-job-policy.js',
  'assets/billing-support-workflow-policy.js',
  'assets/billing-observability-policy.js',
  'assets/billing-payment-rehearsal-policy.js',
  'assets/billing-rollback-policy.js',
  'assets/billing-market-readiness-matrix.js',
  'assets/compliance-release-checklist.js',
  'assets/production-slo-policy.js',
  'assets/synthetic-monitor-policy.js',
  'assets/operational-cost-budget.js',
  'assets/curriculum-review-queue-dashboard.js',
  'assets/content-change-impact-analysis.js',
  'assets/curriculum-release-channel-policy.js',
  'assets/reviewer-workload-sla-report.js',
  'assets/authoring-fixture-library.js',
  'assets/story-lesson-domain.js'
]);
const ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf']);

function checkAppShellSizeBudget(options = {}) {
  const root = options.root || repoRoot;
  const requiredFiles = options.requiredFiles || [
    'index.html',
    'assets/styles.css',
    'sw.js'
  ];
  return evaluateAppShellFiles(collectAppShellFiles(root), options.limits || DEFAULT_APP_SHELL_BUDGET_LIMITS, { requiredFiles });
}

function collectAppShellFiles(root) {
  return [
    ...collectFiles(path.join(root, 'assets'), root, categorizeAssetFile),
    ...collectFiles(root, root, (fileName, fullPath) => path.dirname(fullPath) === root && fileName.endsWith('.html') ? 'html' : ''),
    ...collectFiles(path.join(root, 'topics'), root, fileName => fileName.endsWith('.html') ? 'html' : ''),
    ...['sw.js']
      .map(file => path.join(root, file))
      .filter(file => fs.existsSync(file))
      .map(file => describeFile(root, file, 'serviceWorker'))
  ];
}

function collectFiles(dir, root, categorize) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test-results') return [];
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectFiles(full, root, categorize);
      const category = categorize(entry.name, full);
      return category ? [describeFile(root, full, category)] : [];
    });
}

function categorizeAssetFile(fileName, fullPath) {
  const relativePath = path.relative(repoRoot, fullPath).split(path.sep).join('/');
  if (NON_RUNTIME_CONTRACT_FILES.has(relativePath)) return '';
  if (SERVICE_WORKER_FILES.has(relativePath)) return 'serviceWorker';
  if (GUIDED_MISSION_CONTENT_PATTERN.test(relativePath)) return 'guidedMissionContent';
  if (fileName === 'release-manifest.json' ||
    relativePath === 'assets/story-lesson-manifest.js' ||
    relativePath === 'assets/story-lesson-manifest.json' ||
    relativePath === 'assets/build/frontend-manifest.json' ||
    relativePath === 'assets/static-asset-manifest.json') return 'releaseMetadata';
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.js') return 'javascript';
  if (ext === '.css') return 'css';
  if (ASSET_EXTENSIONS.has(ext)) return 'asset';
  return '';
}

function describeFile(root, fullPath, category) {
  return {
    path: path.relative(root, fullPath).split(path.sep).join('/'),
    bytes: fs.statSync(fullPath).size,
    category
  };
}

function evaluateAppShellFiles(files, limits = DEFAULT_APP_SHELL_BUDGET_LIMITS, options = {}) {
  const normalizedFiles = (Array.isArray(files) ? files : []).map(file => ({
    path: String(file.path || ''),
    bytes: Math.max(0, Number(file.bytes) || 0),
    category: String(file.category || '')
  }));
  const excludedFiles = normalizedFiles.filter(file => isQuestionContent(file.path, file.category));
  const shellFiles = normalizedFiles.filter(file => !isQuestionContent(file.path, file.category));
  const totals = shellFiles.reduce((result, file) => {
    if (file.category === 'javascript') result.javascriptBytes += file.bytes;
    if (file.category === 'css') result.cssBytes += file.bytes;
    if (file.category === 'html') result.htmlBytes += file.bytes;
    if (file.category === 'serviceWorker') result.serviceWorkerBytes += file.bytes;
    if (file.category === 'asset') result.assetBytes += file.bytes;
    if (file.category === 'releaseMetadata') result.releaseMetadataBytes += file.bytes;
    return result;
  }, {
    javascriptBytes: 0,
    cssBytes: 0,
    htmlBytes: 0,
    serviceWorkerBytes: 0,
    assetBytes: 0,
    releaseMetadataBytes: 0
  });
  const errors = [];
  const warnings = [];
  shellFiles.forEach(file => {
    addBudgetResult({ file, budget: getFileBudget(file.category, limits), warnings, errors });
  });
  addTotalBudgetResult('javascript', totals.javascriptBytes, limits.javascriptTotal, warnings, errors);
  addTotalBudgetResult('css', totals.cssBytes, limits.cssTotal, warnings, errors);
  addTotalBudgetResult('html', totals.htmlBytes, limits.htmlTotal, warnings, errors);
  addTotalBudgetResult('service worker', totals.serviceWorkerBytes, limits.serviceWorkerTotal, warnings, errors);
  addTotalBudgetResult('asset', totals.assetBytes, limits.assetTotal, warnings, errors);
  addTotalBudgetResult('release metadata', totals.releaseMetadataBytes, limits.releaseMetadataTotal, warnings, errors);
  normalizeStringArray(options.requiredFiles).forEach(requiredPath => {
    if (!shellFiles.some(file => file.path === requiredPath)) {
      errors.push(makeResult({
        category: 'required',
        path: requiredPath,
        bytes: 0,
        limitBytes: 0,
        message: `missing required app shell asset ${requiredPath}`
      }));
    }
  });
  return {
    files: shellFiles.sort((left, right) => left.path.localeCompare(right.path)),
    excludedFiles: excludedFiles.sort((left, right) => left.path.localeCompare(right.path)),
    topOffenders: shellFiles.slice().sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path)).slice(0, 10),
    totals,
    warnings,
    errors
  };
}

function addBudgetResult({ file, budget, warnings, errors }) {
  if (!budget) return;
  if (file.bytes > budget.failBytes) {
    errors.push(makeResult({
      category: file.category,
      path: file.path,
      bytes: file.bytes,
      limitBytes: budget.failBytes,
      message: `${file.category} app shell file ${file.path} is ${file.bytes} bytes, over ${budget.failBytes}`
    }));
  }
  if (file.bytes > budget.warnBytes) {
    warnings.push(makeResult({
      category: file.category,
      path: file.path,
      bytes: file.bytes,
      limitBytes: budget.warnBytes,
      message: `${file.category} app shell file ${file.path} is ${file.bytes} bytes, over warning ${budget.warnBytes}`
    }));
  }
}

function addTotalBudgetResult(category, bytes, budget, warnings, errors) {
  if (!budget) return;
  if (bytes > budget.failBytes) {
    errors.push(makeResult({
      category,
      path: '',
      bytes,
      limitBytes: budget.failBytes,
      message: `${category} app shell total is ${bytes} bytes, over ${budget.failBytes}`
    }));
  }
  if (bytes > budget.warnBytes) {
    warnings.push(makeResult({
      category,
      path: '',
      bytes,
      limitBytes: budget.warnBytes,
      message: `${category} app shell total is ${bytes} bytes, over warning ${budget.warnBytes}`
    }));
  }
}

function makeResult({ category, path, bytes, limitBytes, message }) {
  return {
    category,
    path,
    bytes,
    limitBytes,
    deltaBytes: Math.max(0, bytes - limitBytes),
    message
  };
}

function getFileBudget(category, limits) {
  if (category === 'javascript') return limits.javascriptFile;
  if (category === 'css') return limits.cssFile;
  if (category === 'html') return limits.htmlFile;
  if (category === 'asset') return limits.assetFile;
  if (category === 'serviceWorker') return limits.serviceWorkerTotal;
  return null;
}

function isQuestionContent(filePath, category) {
  return category === 'questionContent' ||
    category === 'storyLessonContent' ||
    category === 'guidedMissionContent' ||
    QUESTION_CONTENT_PATTERN.test(filePath) ||
    STORY_LESSON_CONTENT_PATTERN.test(filePath) ||
    GUIDED_MISSION_CONTENT_PATTERN.test(filePath) ||
    SPELLING_CONTENT_FILES.has(filePath);
}

function normalizeStringArray(values) {
  return (Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean);
}

if (require.main === module) {
  const result = checkAppShellSizeBudget();
  result.files.forEach(file => {
    console.log(`${file.category.padEnd(13)} ${String(file.bytes).padStart(7)} ${file.path}`);
  });
  if (result.excludedFiles.length) {
    console.log(`Excluded question content artifacts: ${result.excludedFiles.length}`);
  }
  if (result.warnings.length) {
    result.warnings.forEach(warning => console.warn(`WARNING: ${warning.message} (+${warning.deltaBytes} bytes)`));
  }
  if (result.errors.length) {
    result.errors.forEach(error => console.error(`ERROR: ${error.message} (+${error.deltaBytes} bytes)`));
    process.exit(1);
  }
  console.log('App shell size budget passed.');
}

module.exports = {
  checkAppShellSizeBudget,
  collectAppShellFiles,
  evaluateAppShellFiles
};
