#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const serviceWorkerCore = require('../../assets/service-worker-core');

const repoRoot = path.resolve(__dirname, '..', '..');
const DEFAULT_BUDGETS = {
  imageFile: { warnBytes: 120 * 1024, failBytes: 220 * 1024 },
  imageTotal: { warnBytes: 700 * 1024, failBytes: 1024 * 1024 },
  iconFile: { warnBytes: 12 * 1024, failBytes: 24 * 1024 },
  iconTotal: { warnBytes: 64 * 1024, failBytes: 96 * 1024 },
  fontFile: { warnBytes: 60 * 1024, failBytes: 90 * 1024 },
  fontTotal: { warnBytes: 120 * 1024, failBytes: 180 * 1024 },
  criticalShellCacheTotal: { warnBytes: 750 * 1024, failBytes: 900 * 1024 }
};
const ASSET_DIR_PATTERN = /^assets\/(?:images|icons|fonts)\//;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const ICON_EXTENSIONS = new Set(['.svg', '.ico']);
const FONT_EXTENSIONS = new Set(['.woff', '.woff2', '.ttf', '.otf']);
const SUPPORTED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...ICON_EXTENSIONS, ...FONT_EXTENSIONS]);
const CACHE_CATEGORIES = new Set(['critical-shell', 'lazy-ui', 'decorative', 'generated-content']);

function checkStaticAssets(options = {}) {
  const root = options.root || repoRoot;
  const manifest = buildStaticAssetManifest(options);
  const errors = [];
  const warnings = [];

  manifest.files.forEach(file => {
    validateAsset(file, errors);
    addFileBudgetResult(file, getBudgets(options), warnings, errors);
  });
  addTotalBudgetResult('image', manifest.totals.imageBytes, getBudgets(options).imageTotal, warnings, errors);
  addTotalBudgetResult('icon', manifest.totals.iconBytes, getBudgets(options).iconTotal, warnings, errors);
  addTotalBudgetResult('font', manifest.totals.fontBytes, getBudgets(options).fontTotal, warnings, errors);

  const unsupported = collectUnsupportedAssetFiles(root);
  unsupported.forEach(file => {
    errors.push(makeDiagnostic({
      code: 'unsupported_asset_extension',
      path: file.path,
      message: `unsupported static asset extension for ${file.path}`
    }));
  });

  const serviceWorker = evaluateServiceWorkerCriticalCache({ root, budgets: getBudgets(options) });
  errors.push(...serviceWorker.errors);
  warnings.push(...serviceWorker.warnings);

  return {
    manifest,
    errors: sortDiagnostics(errors),
    warnings: sortDiagnostics(warnings),
    serviceWorker
  };
}

function buildStaticAssetManifest(options = {}) {
  const root = options.root || repoRoot;
  const metadataByPath = normalizeMetadataMap(options.metadataByPath);
  const files = collectSupportedAssetFiles(root)
    .map(file => describeStaticAsset(root, file, metadataByPath[file.path] || {}))
    .sort((left, right) => left.path.localeCompare(right.path));
  const totals = files.reduce((result, file) => {
    result.totalBytes += file.bytes;
    if (file.type === 'image') result.imageBytes += file.bytes;
    if (file.type === 'icon') result.iconBytes += file.bytes;
    if (file.type === 'font') result.fontBytes += file.bytes;
    return result;
  }, {
    totalBytes: 0,
    imageBytes: 0,
    iconBytes: 0,
    fontBytes: 0
  });

  return {
    schemaVersion: 1,
    strategy: 'static-asset-inventory',
    files,
    totals,
    budgets: getBudgets(options)
  };
}

function evaluateServiceWorkerCriticalCache(options = {}) {
  const root = options.root || repoRoot;
  const budgets = getBudgets(options);
  const urls = serviceWorkerCore.buildPrecacheUrls();
  const uniquePaths = Array.from(new Set(urls.map(urlToFilePath).filter(Boolean)));
  let bytes = 0;
  const missing = [];
  uniquePaths.forEach(relativePath => {
    const fullPath = path.join(root, relativePath);
    if (!fs.existsSync(fullPath)) {
      missing.push(relativePath);
      return;
    }
    bytes += fs.statSync(fullPath).size;
  });
  const errors = [];
  const warnings = [];
  missing.forEach(relativePath => {
    errors.push(makeDiagnostic({
      code: 'missing_service_worker_precache_asset',
      path: relativePath,
      message: `service worker precache asset is missing: ${relativePath}`
    }));
  });
  addTotalBudgetResult('critical service worker cache', bytes, budgets.criticalShellCacheTotal, warnings, errors);
  return {
    bytes,
    urls,
    files: uniquePaths,
    errors: sortDiagnostics(errors),
    warnings: sortDiagnostics(warnings)
  };
}

function collectSupportedAssetFiles(root) {
  return collectAssetFiles(root)
    .filter(file => SUPPORTED_EXTENSIONS.has(file.ext));
}

function collectUnsupportedAssetFiles(root) {
  return collectAssetFiles(root)
    .filter(file => !SUPPORTED_EXTENSIONS.has(file.ext));
}

function collectAssetFiles(root) {
  const assetsRoot = path.join(root, 'assets');
  if (!fs.existsSync(assetsRoot)) return [];
  return collectFiles(assetsRoot, root)
    .map(fullPath => ({
      path: path.relative(root, fullPath).split(path.sep).join('/'),
      fullPath,
      ext: path.extname(fullPath).toLowerCase()
    }))
    .filter(file => isStaticAssetCandidate(file.path));
}

function collectFiles(dir, root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'question-chunks' || entry.name === 'question-bank-source' || entry.name === 'question-banks') return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath, root);
    return [fullPath];
  });
}

function isStaticAssetCandidate(relativePath) {
  return ASSET_DIR_PATTERN.test(relativePath) || SUPPORTED_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

function describeStaticAsset(root, file, metadata = {}) {
  const bytes = fs.statSync(file.fullPath).size;
  const type = inferAssetType(file.path);
  const dimensions = normalizeDimensions(metadata.dimensions || readDimensions(file.fullPath, file.ext));
  return {
    path: file.path,
    type,
    bytes,
    sha256: hashFile(file.fullPath),
    cacheCategory: normalizeCacheCategory(metadata.cacheCategory),
    criticalPath: metadata.cacheCategory === 'critical-shell',
    dimensions: dimensions || null,
    fallback: type === 'font' ? String(metadata.fallback || '').trim() : ''
  };
}

function validateAsset(file, errors) {
  if (!CACHE_CATEGORIES.has(file.cacheCategory)) {
    errors.push(makeDiagnostic({
      code: 'missing_cache_category',
      path: file.path,
      message: `${file.path} must declare one of ${Array.from(CACHE_CATEGORIES).join(', ')}`
    }));
  }
  if ((file.type === 'image' || file.type === 'icon') && !file.dimensions) {
    errors.push(makeDiagnostic({
      code: 'missing_asset_dimensions',
      path: file.path,
      message: `${file.path} must declare deterministic dimensions`
    }));
  }
  if (file.type === 'font' && !file.fallback) {
    errors.push(makeDiagnostic({
      code: 'missing_font_fallback',
      path: file.path,
      message: `${file.path} must declare a fallback font stack`
    }));
  }
}

function addFileBudgetResult(file, budgets, warnings, errors) {
  const budget = budgets[`${file.type}File`];
  if (!budget) return;
  if (file.bytes > budget.failBytes) {
    errors.push(makeDiagnostic({
      code: 'asset_file_over_budget',
      path: file.path,
      bytes: file.bytes,
      limitBytes: budget.failBytes,
      message: `${file.type} asset ${file.path} is ${file.bytes} bytes, over ${budget.failBytes}`
    }));
  }
  if (file.bytes > budget.warnBytes) {
    warnings.push(makeDiagnostic({
      code: 'asset_file_warning',
      path: file.path,
      bytes: file.bytes,
      limitBytes: budget.warnBytes,
      message: `${file.type} asset ${file.path} is ${file.bytes} bytes, over warning ${budget.warnBytes}`
    }));
  }
}

function addTotalBudgetResult(category, bytes, budget, warnings, errors) {
  if (!budget) return;
  if (bytes > budget.failBytes) {
    errors.push(makeDiagnostic({
      code: 'asset_total_over_budget',
      path: '',
      bytes,
      limitBytes: budget.failBytes,
      message: `${category} total is ${bytes} bytes, over ${budget.failBytes}`
    }));
  }
  if (bytes > budget.warnBytes) {
    warnings.push(makeDiagnostic({
      code: 'asset_total_warning',
      path: '',
      bytes,
      limitBytes: budget.warnBytes,
      message: `${category} total is ${bytes} bytes, over warning ${budget.warnBytes}`
    }));
  }
}

function inferAssetType(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if (/\/fonts\//.test(relativePath) || FONT_EXTENSIONS.has(ext)) return 'font';
  if (/\/icons\//.test(relativePath) || ext === '.ico') return 'icon';
  return 'image';
}

function readDimensions(filePath, ext) {
  if (ext === '.svg') return readSvgDimensions(filePath);
  if (ext === '.png') return readPngDimensions(filePath);
  return null;
}

function readSvgDimensions(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const width = Number((source.match(/\bwidth=["']?([0-9.]+)/i) || [])[1]);
  const height = Number((source.match(/\bheight=["']?([0-9.]+)/i) || [])[1]);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }
  const viewBox = source.match(/\bviewBox=["'][^"']*?([0-9.]+)\s+([0-9.]+)["']/i);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  return null;
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function normalizeMetadataMap(input) {
  return Object.keys(input || {}).reduce((result, key) => {
    result[String(key).replace(/\\/g, '/')] = input[key] || {};
    return result;
  }, {});
}

function normalizeDimensions(input) {
  if (!input || typeof input !== 'object') return null;
  const width = Number(input.width);
  const height = Number(input.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function normalizeCacheCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function urlToFilePath(url) {
  if (url === '/') return 'index.html';
  return String(url || '').replace(/^\//, '').split(/[?#]/)[0];
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function makeDiagnostic(input) {
  return {
    code: input.code,
    path: input.path || '',
    bytes: Number(input.bytes) || 0,
    limitBytes: Number(input.limitBytes) || 0,
    message: input.message
  };
}

function sortDiagnostics(diagnostics) {
  return diagnostics.slice().sort((left, right) => (
    left.path.localeCompare(right.path) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  ));
}

function getBudgets(options = {}) {
  return Object.assign({}, DEFAULT_BUDGETS, options.budgets || {});
}

function writeStaticAssetManifest(options = {}) {
  const root = options.root || repoRoot;
  const result = checkStaticAssets(options);
  if (result.errors.length) return result;
  const output = options.output || path.join(root, 'assets', 'static-asset-manifest.json');
  fs.writeFileSync(output, `${JSON.stringify(result.manifest, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  const write = process.argv.includes('--write');
  const json = process.argv.includes('--json');
  const result = write ? writeStaticAssetManifest({ root: repoRoot }) : checkStaticAssets({ root: repoRoot });
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.errors.length) {
    result.errors.forEach(error => console.error(`${error.code} ${error.path} ${error.message}`));
  } else {
    console.log(`Static asset QA passed: ${result.manifest.files.length} assets, ${result.manifest.totals.totalBytes} bytes.`);
  }
  process.exit(result.errors.length ? 1 : 0);
}

module.exports = {
  DEFAULT_BUDGETS,
  buildStaticAssetManifest,
  checkStaticAssets,
  evaluateServiceWorkerCriticalCache,
  writeStaticAssetManifest
};
