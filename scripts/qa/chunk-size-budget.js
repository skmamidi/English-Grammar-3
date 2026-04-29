#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { repoRoot } = require('./bank-loader');

const DEFAULT_WARNING_BYTES = 250 * 1024;
const DEFAULT_FAILURE_BYTES = 750 * 1024;

function collectChunkSizeBudget(options = {}) {
  const root = options.repoRoot || repoRoot;
  const chunkRoot = options.chunkRoot || path.join(root, 'assets', 'question-chunks');
  const warningBytes = Number(options.warningBytes) || DEFAULT_WARNING_BYTES;
  const failureBytes = Number(options.failureBytes) || DEFAULT_FAILURE_BYTES;
  const files = findChunkFiles(chunkRoot)
    .map(file => {
      const relativePath = path.relative(root, file).split(path.sep).join('/');
      const sizeBytes = fs.statSync(file).size;
      return {
        path: relativePath,
        sizeBytes,
        warning: sizeBytes > warningBytes,
        failure: sizeBytes > failureBytes
      };
    })
    .sort((left, right) => right.sizeBytes - left.sizeBytes || left.path.localeCompare(right.path));

  return {
    warningBytes,
    failureBytes,
    largest: files.slice(0, Number(options.limit) || 20),
    warnings: files.filter(file => file.warning),
    failures: files.filter(file => file.failure)
  };
}

function findChunkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  walk(root, files);
  return files;
}

function walk(current, files) {
  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    fs.readdirSync(current).forEach(entry => walk(path.join(current, entry), files));
    return;
  }
  if (current.endsWith('.js')) files.push(current);
}

function formatChunkSizeBudget(report) {
  const lines = [
    `Chunk warning threshold: ${formatBytes(report.warningBytes)}.`,
    `Chunk failure threshold: ${formatBytes(report.failureBytes)}.`,
    'Largest generated chunks:'
  ];
  report.largest.forEach(item => {
    lines.push(`  ${formatBytes(item.sizeBytes)} ${item.path}`);
  });
  return lines.join('\n');
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function runCli() {
  const report = collectChunkSizeBudget();
  console.log(formatChunkSizeBudget(report));
  if (report.failures.length) {
    console.error(`Chunk size budget failed for ${report.failures.length} file(s).`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_FAILURE_BYTES,
  DEFAULT_WARNING_BYTES,
  collectChunkSizeBudget,
  formatChunkSizeBudget
};

if (require.main === module) runCli();
