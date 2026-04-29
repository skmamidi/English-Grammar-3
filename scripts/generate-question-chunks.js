#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  loadQuestionBanks,
  flattenQuestionBanks
} = require('./qa/bank-loader');
const { CHUNKED_DOMAINS } = require('./question-chunk-config');
const {
  buildQuestionChunkProvenance
} = require('./question-artifact-provenance');

const CHUNK_ROOT = path.posix.join('assets', 'question-chunks');

function getChunkedSets(manifest) {
  return (manifest.sets || []).filter(set => set && CHUNKED_DOMAINS.has(set.domain));
}

function getExpectedChunkPath({ domain, setId }, root = repoRoot) {
  if (!domain) throw new Error(`${setId || 'unknown set'}: domain is required for chunk path generation.`);
  if (!setId) throw new Error(`${domain}: setId is required for chunk path generation.`);
  return path.join(root, CHUNK_ROOT, domain, `${setId}.js`);
}

function getExpectedChunkRelativePath({ domain, setId }) {
  return path.posix.join(CHUNK_ROOT, domain, `${setId}.js`);
}

function buildQuestionChunkScript(input, legacySet, legacySourceFile) {
  const options = normalizeBuildOptions(input, legacySet, legacySourceFile);
  const domain = options.domain || getDomainFromSource(options.sourceFile, options.setId);
  const provenance = buildQuestionChunkProvenance({
    setId: options.setId,
    sourceFile: options.sourceFile,
    set: options.set
  });

  return `/**
 * English Language Quiz App - ${domain} chunk: ${options.setId}
 * Generated from ${options.sourceFile}.
 * Generator version: ${provenance.generatorVersion}.
 * Source hash: ${provenance.sourceHash}.
 */
(function () {
  'use strict';
  window.QUESTION_BANK = Object.assign(window.QUESTION_BANK || {}, ${JSON.stringify({ [options.setId]: options.set }, null, 2)}
  );
})();
`;
}

function writeQuestionChunks(manifest, bankLoad, options = {}) {
  const root = options.repoRoot || repoRoot;
  const dryRun = options.dryRun === true;
  const summary = {
    written: [],
    unchanged: [],
    removed: []
  };
  const expectedFiles = new Set();
  const sourceRecords = new Map(flattenQuestionBanks(bankLoad).map(record => [record.setId, record]));

  getChunkedSets(manifest).forEach(entry => {
    const sourceRecord = sourceRecords.get(entry.id);
    if (!sourceRecord) throw new Error(`${entry.id}: source set missing for chunk generation.`);

    const chunkPath = getExpectedChunkPath({ domain: entry.domain, setId: entry.id }, root);
    const relativePath = path.relative(root, chunkPath);
    const contents = buildQuestionChunkScript({
      domain: entry.domain,
      setId: entry.id,
      sourceFile: sourceRecord.relativeFile,
      set: sourceRecord.set
    });
    expectedFiles.add(chunkPath);

    if (fs.existsSync(chunkPath) && fs.readFileSync(chunkPath, 'utf8') === contents) {
      summary.unchanged.push({ path: chunkPath, relativePath });
      return;
    }

    summary.written.push({ path: chunkPath, relativePath, contents });
    if (!dryRun) {
      fs.mkdirSync(path.dirname(chunkPath), { recursive: true });
      fs.writeFileSync(chunkPath, contents);
    }
  });

  CHUNKED_DOMAINS.forEach(domain => {
    const domainDir = path.join(root, CHUNK_ROOT, domain);
    if (!fs.existsSync(domainDir)) return;

    fs.readdirSync(domainDir)
      .filter(file => file.endsWith('.js'))
      .sort()
      .forEach(file => {
        const chunkPath = path.join(domainDir, file);
        if (expectedFiles.has(chunkPath)) return;

        summary.removed.push({
          path: chunkPath,
          relativePath: path.relative(root, chunkPath)
        });
        if (!dryRun) fs.unlinkSync(chunkPath);
      });
  });

  return summary;
}

function normalizeBuildOptions(input, legacySet, legacySourceFile) {
  if (input && typeof input === 'object' && Object.hasOwn(input, 'setId')) {
    return input;
  }
  return {
    setId: input,
    set: legacySet,
    sourceFile: legacySourceFile
  };
}

function getDomainFromSource(sourceFile, setId) {
  const basename = path.basename(sourceFile || '', '.js');
  if (basename) return basename;
  return String(setId || '').split('-')[0];
}

function formatSummary(summary) {
  return [
    `Question chunks written: ${summary.written.length}.`,
    `Question chunks unchanged: ${summary.unchanged.length}.`,
    `Question chunks removed: ${summary.removed.length}.`
  ].join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  const shouldWrite = argv.includes('--write');
  const dryRun = !shouldWrite || argv.includes('--dry-run');
  const { generateManifest } = require('./generate-question-manifest');
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const summary = writeQuestionChunks(manifest, bankLoad, { dryRun });

  console.log(formatSummary(summary));
  if (dryRun && summary.written.length + summary.removed.length > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  CHUNKED_DOMAINS,
  getChunkedSets,
  buildQuestionChunkScript,
  writeQuestionChunks,
  getExpectedChunkPath,
  getExpectedChunkRelativePath
};

if (require.main === module) runCli();
