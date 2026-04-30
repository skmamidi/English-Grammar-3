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
const {
  enrichQuestionWithSkillTags,
  loadSkillTaxonomy
} = require('./qa/question-skill-taxonomy');

const CHUNK_ROOT = path.posix.join('assets', 'question-chunks');
const SUBCHUNK_BYTE_THRESHOLD = 350 * 1024;
const SUBCHUNK_QUESTION_COUNT = 50;

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

function getExpectedSubchunkPath({ domain, setId, index }, root = repoRoot) {
  return path.join(root, getExpectedSubchunkRelativePath({ domain, setId, index }));
}

function getExpectedSubchunkRelativePath({ domain, setId, index }) {
  const suffix = String(index).padStart(3, '0');
  return path.posix.join(CHUNK_ROOT, domain, `${setId}-${suffix}.js`);
}

function shouldSubchunkSet(input) {
  const options = normalizeBuildOptions(input);
  const fullScript = buildQuestionChunkScript(options);
  return Buffer.byteLength(fullScript, 'utf8') > SUBCHUNK_BYTE_THRESHOLD;
}

function buildSubchunkDescriptors(input) {
  const options = normalizeBuildOptions(input);
  const questions = Array.isArray(options.set && options.set.questions) ? options.set.questions : [];
  if (!shouldSubchunkSet(options)) return [];
  const chunks = [];
  for (let start = 0; start < questions.length; start += SUBCHUNK_QUESTION_COUNT) {
    const slice = questions.slice(start, start + SUBCHUNK_QUESTION_COUNT);
    const index = chunks.length + 1;
    chunks.push({
      chunkFile: getExpectedSubchunkRelativePath({ domain: options.domain, setId: options.setId, index }),
      firstSequence: getQuestionSequence(slice[0], start + 1),
      lastSequence: getQuestionSequence(slice[slice.length - 1], start + slice.length),
      questionCount: slice.length,
      ids: slice.map(question => question.id).filter(Boolean)
    });
  }
  return chunks;
}

function buildQuestionChunkScript(input, legacySet, legacySourceFile) {
  const options = normalizeBuildOptions(input, legacySet, legacySourceFile);
  const domain = options.domain || getDomainFromSource(options.sourceFile, options.setId);
  const provenance = buildQuestionChunkProvenance({
    setId: options.setId,
    sourceFile: options.sourceFile,
    set: options.set
  });
  const enrichedSet = enrichSetWithSkillTags(options.set, { domain, taxonomy: loadSkillTaxonomy() });

  return `/**
 * English Language Quiz App - ${domain} chunk: ${options.setId}
 * Generated from ${options.sourceFile}.
 * Generator version: ${provenance.generatorVersion}.
 * Source hash: ${provenance.sourceHash}.
 */
(function () {
  'use strict';
  window.QUESTION_BANK = Object.assign(window.QUESTION_BANK || {}, ${JSON.stringify({ [options.setId]: enrichedSet })}
  );
})();
`;
}

function buildQuestionSubchunkScript(input) {
  const options = normalizeBuildOptions(input);
  const domain = options.domain || getDomainFromSource(options.sourceFile, options.setId);
  const provenance = buildQuestionChunkProvenance({
    setId: options.setId,
    sourceFile: options.sourceFile,
    set: options.fullSet || options.set
  });
  const set = Object.assign({}, options.set || {}, {
    questions: Array.isArray(options.questions) ? options.questions : []
  });
  const enrichedSet = enrichSetWithSkillTags(set, { domain, taxonomy: loadSkillTaxonomy() });

  return `/**
 * English Language Quiz App - ${domain} subchunk: ${options.setId} ${options.chunkIndex}
 * Generated from ${options.sourceFile}.
 * Generator version: ${provenance.generatorVersion}.
 * Source hash: ${provenance.sourceHash}.
 */
(function () {
  'use strict';
  const chunkSet = ${JSON.stringify(enrichedSet)};
  const bank = window.QUESTION_BANK = window.QUESTION_BANK || {};
  const existing = bank[${JSON.stringify(options.setId)}];
  if (existing && Array.isArray(existing.questions)) {
    const seen = new Set(existing.questions.map(question => question && question.id));
    chunkSet.questions.forEach(question => {
      if (!seen.has(question && question.id)) existing.questions.push(question);
    });
  } else {
    bank[${JSON.stringify(options.setId)}] = chunkSet;
  }
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

    const buildOptions = {
      domain: entry.domain,
      setId: entry.id,
      sourceFile: sourceRecord.relativeFile,
      set: sourceRecord.set
    };
    const subchunks = Array.isArray(entry.chunks) ? entry.chunks : [];
    if (subchunks.length) {
      subchunks.forEach((chunk, chunkIndex) => {
        const chunkPath = path.join(root, chunk.chunkFile);
        const relativePath = path.relative(root, chunkPath);
        const questions = sourceRecord.set.questions.filter(question => chunk.ids.includes(question.id));
        const contents = buildQuestionSubchunkScript(Object.assign({}, buildOptions, {
          fullSet: sourceRecord.set,
          questions,
          chunkIndex: chunkIndex + 1
        }));
        expectedFiles.add(chunkPath);
        writeChunkIfChanged({ chunkPath, relativePath, contents, summary, dryRun });
      });
      return;
    }

    const chunkPath = getExpectedChunkPath({ domain: entry.domain, setId: entry.id }, root);
    const relativePath = path.relative(root, chunkPath);
    const contents = buildQuestionChunkScript(buildOptions);
    expectedFiles.add(chunkPath);
    writeChunkIfChanged({ chunkPath, relativePath, contents, summary, dryRun });
  });

  removeStaleChunks({ root, expectedFiles, summary, dryRun });

  return summary;
}

function writeChunkIfChanged({ chunkPath, relativePath, contents, summary, dryRun }) {
  if (fs.existsSync(chunkPath) && fs.readFileSync(chunkPath, 'utf8') === contents) {
    summary.unchanged.push({ path: chunkPath, relativePath });
    return;
  }

  summary.written.push({ path: chunkPath, relativePath, contents });
  if (!dryRun) {
    fs.mkdirSync(path.dirname(chunkPath), { recursive: true });
    fs.writeFileSync(chunkPath, contents);
  }
}

function removeStaleChunks({ root, expectedFiles, summary, dryRun }) {
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

function getQuestionSequence(question, fallback) {
  const sequence = question && question.metadata && Number(question.metadata.sequence);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : fallback;
}

function getDomainFromSource(sourceFile, setId) {
  const basename = path.basename(sourceFile || '', '.js');
  if (basename) return basename;
  return String(setId || '').split('-')[0];
}

function enrichSetWithSkillTags(set, options) {
  const questions = Array.isArray(set && set.questions) ? set.questions : [];
  return Object.assign({}, set || {}, {
    questions: questions.map(question => enrichQuestionWithSkillTags(question, options))
  });
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
  SUBCHUNK_BYTE_THRESHOLD,
  SUBCHUNK_QUESTION_COUNT,
  buildSubchunkDescriptors,
  getChunkedSets,
  buildQuestionChunkScript,
  buildQuestionSubchunkScript,
  writeQuestionChunks,
  getExpectedChunkPath,
  getExpectedChunkRelativePath,
  getExpectedSubchunkPath,
  getExpectedSubchunkRelativePath,
  enrichSetWithSkillTags,
  shouldSubchunkSet
};

if (require.main === module) runCli();
