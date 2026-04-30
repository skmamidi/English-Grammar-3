#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const DEFAULT_LIMITS = Object.freeze({
  javascriptFileBytes: 96 * 1024,
  javascriptTotalBytes: 160 * 1024,
  cssFileBytes: 160 * 1024,
  cssTotalBytes: 180 * 1024,
  htmlFileBytes: 80 * 1024,
  htmlTotalBytes: 420 * 1024,
  serviceWorkerBytes: 32 * 1024
});

function checkAppShellSizeBudget(options = {}) {
  const root = options.root || repoRoot;
  return evaluateAppShellFiles(collectAppShellFiles(root), options.limits || DEFAULT_LIMITS);
}

function collectAppShellFiles(root) {
  return [
    ...collectFiles(path.join(root, 'assets', 'build'), 'javascript', root, file => file.endsWith('.js')),
    ...collectFiles(path.join(root, 'assets'), 'css', root, file => file === 'styles.css'),
    ...collectFiles(root, 'html', root, file => file.endsWith('.html')),
    ...['sw.js', 'assets/service-worker-core.js', 'assets/service-worker-registration.js']
      .map(file => path.join(root, file))
      .filter(file => fs.existsSync(file))
      .map(file => describeFile(root, file, 'serviceWorker'))
  ].filter(file => !/assets\/question-(chunks|manifest)/.test(file.path));
}

function collectFiles(dir, category, root, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test-results') return [];
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectFiles(full, category, root, predicate);
      return predicate(entry.name, full) ? [describeFile(root, full, category)] : [];
    });
}

function describeFile(root, fullPath, category) {
  return {
    path: path.relative(root, fullPath).split(path.sep).join('/'),
    bytes: fs.statSync(fullPath).size,
    category
  };
}

function evaluateAppShellFiles(files, limits = DEFAULT_LIMITS) {
  const normalizedFiles = (Array.isArray(files) ? files : []).map(file => ({
    path: String(file.path || ''),
    bytes: Math.max(0, Number(file.bytes) || 0),
    category: String(file.category || '')
  }));
  const totals = normalizedFiles.reduce((result, file) => {
    if (file.category === 'javascript') result.javascriptBytes += file.bytes;
    if (file.category === 'css') result.cssBytes += file.bytes;
    if (file.category === 'html') result.htmlBytes += file.bytes;
    if (file.category === 'serviceWorker') result.serviceWorkerBytes += file.bytes;
    return result;
  }, { javascriptBytes: 0, cssBytes: 0, htmlBytes: 0, serviceWorkerBytes: 0 });
  const errors = [];
  normalizedFiles.forEach(file => {
    const fileLimit = getFileLimit(file.category, limits);
    if (fileLimit && file.bytes > fileLimit) {
      errors.push(`${file.category} app shell file ${file.path} is ${file.bytes} bytes, over ${fileLimit}`);
    }
  });
  if (totals.javascriptBytes > limits.javascriptTotalBytes) errors.push(`javascript app shell total is ${totals.javascriptBytes} bytes, over ${limits.javascriptTotalBytes}`);
  if (totals.cssBytes > limits.cssTotalBytes) errors.push(`css app shell total is ${totals.cssBytes} bytes, over ${limits.cssTotalBytes}`);
  if (totals.htmlBytes > limits.htmlTotalBytes) errors.push(`html app shell total is ${totals.htmlBytes} bytes, over ${limits.htmlTotalBytes}`);
  if (totals.serviceWorkerBytes > limits.serviceWorkerBytes) errors.push(`service worker app shell total is ${totals.serviceWorkerBytes} bytes, over ${limits.serviceWorkerBytes}`);
  return {
    files: normalizedFiles.sort((left, right) => left.path.localeCompare(right.path)),
    totals,
    errors
  };
}

function getFileLimit(category, limits) {
  if (category === 'javascript') return limits.javascriptFileBytes;
  if (category === 'css') return limits.cssFileBytes;
  if (category === 'html') return limits.htmlFileBytes;
  if (category === 'serviceWorker') return limits.serviceWorkerBytes;
  return 0;
}

if (require.main === module) {
  const result = checkAppShellSizeBudget();
  result.files.forEach(file => {
    console.log(`${file.category.padEnd(13)} ${String(file.bytes).padStart(7)} ${file.path}`);
  });
  if (result.errors.length) {
    result.errors.forEach(error => console.error(`ERROR: ${error}`));
    process.exit(1);
  }
  console.log('App shell size budget passed.');
}

module.exports = {
  checkAppShellSizeBudget,
  collectAppShellFiles,
  evaluateAppShellFiles
};
