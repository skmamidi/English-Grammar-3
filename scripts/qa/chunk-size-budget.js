#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PRELOAD_WARNING_BYTES = 250 * 1024;
const DEFAULT_LIMIT = 10;

function summarizeChunkSizeBudget(chunks, options = {}) {
  const preloadWarningBytes = Number(options.preloadWarningBytes) || DEFAULT_PRELOAD_WARNING_BYTES;
  const limit = Number(options.limit) || DEFAULT_LIMIT;
  const normalized = (Array.isArray(chunks) ? chunks : [])
    .map(item => ({
      path: String(item.path || ''),
      bytes: Math.max(0, Number(item.bytes) || 0)
    }))
    .filter(item => item.path)
    .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));

  return {
    totalChunks: normalized.length,
    preloadWarningBytes,
    largestChunks: normalized.slice(0, limit),
    preloadWarnings: normalized.filter(item => item.bytes > preloadWarningBytes)
  };
}

function collectChunkSizes(rootDir) {
  const root = rootDir || process.cwd();
  const chunkRoot = path.join(root, 'assets', 'question-chunks');
  const files = [];
  walk(chunkRoot, file => {
    if (file.endsWith('.js')) {
      files.push({
        path: path.relative(root, file).split(path.sep).join('/'),
        bytes: fs.statSync(file).size
      });
    }
  });
  return files;
}

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, visit);
    else visit(fullPath);
  });
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  const summary = summarizeChunkSizeBudget(collectChunkSizes(root));
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = {
  collectChunkSizes,
  summarizeChunkSizeBudget
};
