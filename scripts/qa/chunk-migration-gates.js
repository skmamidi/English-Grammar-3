#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  flattenQuestionBanks,
  loadQuestionBanks
} = require('./bank-loader');
const {
  CHUNKED_DOMAINS,
  CHUNK_MIGRATION_ORDER
} = require('../question-chunk-config');
const {
  generateManifest
} = require('../generate-question-manifest');
const {
  buildQuestionChunkScript,
  buildQuestionSubchunkScript,
  getExpectedChunkPath,
  getExpectedChunkRelativePath,
  getExpectedSubchunkPath,
  writeQuestionChunks
} = require('../generate-question-chunks');
const {
  loadEntryChunkBank,
  validateQuestionChunkSet
} = require('./chunk-qa');

function runDomainGate(domain, options = {}) {
  const root = options.repoRoot || repoRoot;
  const bankLoad = options.bankLoad || loadQuestionBanks({ repoRoot: root });
  const manifest = options.manifest || generateManifest(bankLoad);
  const sourceRecords = new Map(flattenQuestionBanks(bankLoad).map(record => [record.setId, record]));
  const entries = (manifest.sets || []).filter(set => set && set.domain === domain);
  const errors = [];

  if (!CHUNKED_DOMAINS.has(domain)) {
    errors.push(`${domain}: domain is not configured for generated chunks.`);
  }
  if (!entries.length) {
    errors.push(`${domain}: no manifest sets found.`);
    return { domain, checked: 0, errors };
  }

  entries.forEach(entry => {
    const expectedChunkFile = getExpectedChunkRelativePath({ domain, setId: entry.id });
    const expectedSubchunkFile = Array.isArray(entry.chunks) && entry.chunks.length ? entry.chunks[0].chunkFile : '';
    if (entry.chunks && entry.chunkFile !== expectedSubchunkFile) {
      errors.push(`${entry.id}: chunkFile is ${formatValue(entry.chunkFile)}; expected first subchunk ${formatValue(expectedSubchunkFile)}.`);
      return;
    }
    if (!entry.chunks && entry.chunkFile !== expectedChunkFile) {
      errors.push(`${entry.id}: chunkFile is ${formatValue(entry.chunkFile)}; expected ${formatValue(expectedChunkFile)}.`);
      return;
    }

    const sourceRecord = sourceRecords.get(entry.id);
    if (!sourceRecord) {
      errors.push(`${entry.id}: source set missing.`);
      return;
    }

    const expectedPaths = getExpectedPaths({ entry, domain, root });
    expectedPaths.forEach(expectedPath => {
      if (!fs.existsSync(expectedPath)) {
        errors.push(`${entry.id}: chunk file is missing at ${path.relative(root, expectedPath)}.`);
      }
    });
    if (expectedPaths.some(expectedPath => !fs.existsSync(expectedPath))) return;

    let chunkBank;
    try {
      chunkBank = loadEntryChunkBank(entry, { repoRoot: root }).chunkBank;
    } catch (error) {
      errors.push(`${entry.id}: chunk file could not be loaded: ${error.message}`);
      return;
    }

    const chunkSetIds = Object.keys(chunkBank || {});
    if (chunkSetIds.length !== 1 || chunkSetIds[0] !== entry.id) {
      errors.push(`${entry.id}: chunk populates [${chunkSetIds.join(', ')}]; expected exactly ${entry.id}.`);
    }

    validateManifestEntry({ entry, sourceSet: sourceRecord.set, errors });
    validateQuestionChunkSet({
      setId: entry.id,
      domain,
      sourceSet: sourceRecord.set,
      chunkSet: chunkBank && chunkBank[entry.id]
    }).errors.forEach(error => errors.push(error));

    const buildOptions = {
      domain,
      setId: entry.id,
      sourceFile: sourceRecord.relativeFile,
      set: sourceRecord.set
    };
    if (Array.isArray(entry.chunks) && entry.chunks.length) {
      entry.chunks.forEach((chunk, index) => {
        const expectedContents = buildQuestionSubchunkScript(Object.assign({}, buildOptions, {
          fullSet: sourceRecord.set,
          questions: sourceRecord.set.questions.filter(question => chunk.ids.includes(question.id)),
          chunkIndex: index + 1
        }));
        const actualContents = fs.readFileSync(getExpectedSubchunkPath({ domain, setId: entry.id, index: index + 1 }, root), 'utf8');
        if (actualContents !== expectedContents) {
          errors.push(`${entry.id}: checked-in subchunk ${index + 1} does not match deterministic generated output.`);
        }
      });
    } else {
      const expectedContents = buildQuestionChunkScript(buildOptions);
      const actualContents = fs.readFileSync(getExpectedChunkPath({ domain, setId: entry.id }, root), 'utf8');
      if (actualContents !== expectedContents) {
        errors.push(`${entry.id}: checked-in chunk file does not match deterministic generated output.`);
      }
    }
  });

  const dryRunSummary = writeQuestionChunks(manifest, bankLoad, { repoRoot: root, dryRun: true });
  dryRunSummary.written
    .filter(item => isDomainPath(item.relativePath, domain))
    .forEach(item => errors.push(`${item.relativePath}: generated chunk is stale or missing.`));
  dryRunSummary.removed
    .filter(item => isDomainPath(item.relativePath, domain))
    .forEach(item => errors.push(`${item.relativePath}: stale chunk file exists.`));

  return { domain, checked: entries.length, errors };
}

function getExpectedPaths({ entry, domain, root }) {
  if (Array.isArray(entry.chunks) && entry.chunks.length) {
    return entry.chunks.map((chunk, index) => getExpectedSubchunkPath({ domain, setId: entry.id, index: index + 1 }, root));
  }
  return [getExpectedChunkPath({ domain, setId: entry.id }, root)];
}

function validateManifestEntry({ entry, sourceSet, errors }) {
  if (!sourceSet) return;

  const sourceQuestions = Array.isArray(sourceSet.questions) ? sourceSet.questions : [];
  if (entry.id !== (sourceSet.metadata && sourceSet.metadata.sourceSet || entry.id)) {
    errors.push(`${entry.id}: manifest set id does not match source identity.`);
  }
  if (entry.title !== (sourceSet.title || '')) {
    errors.push(`${entry.id}: manifest title is ${formatValue(entry.title)}; expected ${formatValue(sourceSet.title || '')}.`);
  }
  if (entry.topic !== (sourceSet.topic || '')) {
    errors.push(`${entry.id}: manifest topic is ${formatValue(entry.topic)}; expected ${formatValue(sourceSet.topic || '')}.`);
  }
  if (entry.questionCount !== sourceQuestions.length) {
    errors.push(`${entry.id}: manifest questionCount is ${entry.questionCount}; expected ${sourceQuestions.length}.`);
  }

  const manifestQuestions = Array.isArray(entry.questions) ? entry.questions : [];
  sourceQuestions.forEach((question, index) => {
    const manifestQuestion = manifestQuestions[index] || {};
    const label = question && question.id || `${entry.id} question ${index + 1}`;
    if (manifestQuestion.id !== (question && question.id || '')) {
      errors.push(`${entry.id}: manifest question ${index + 1} id is ${formatValue(manifestQuestion.id)}; expected ${formatValue(question && question.id || '')}.`);
    }
    if (manifestQuestion.version !== (question && question.version || 1)) {
      errors.push(`${entry.id}/${label}: manifest version is ${formatValue(manifestQuestion.version)}; expected ${formatValue(question && question.version || 1)}.`);
    }
    if (manifestQuestion.contentHash !== (question && question.contentHash || '')) {
      errors.push(`${entry.id}/${label}: manifest contentHash is ${formatValue(manifestQuestion.contentHash)}; expected ${formatValue(question && question.contentHash || '')}.`);
    }
  });
}

function isDomainPath(relativePath, domain) {
  return normalizePath(relativePath).startsWith(`assets/question-chunks/${domain}/`);
}

function normalizePath(file) {
  return String(file || '').split(path.sep).join('/');
}

function formatValue(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function parseArgs(argv) {
  const domainIndex = argv.indexOf('--domain');
  const domain = domainIndex >= 0 ? argv[domainIndex + 1] : '';
  return {
    all: argv.includes('--all'),
    domain
  };
}

function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const domains = args.all ? CHUNK_MIGRATION_ORDER : [args.domain].filter(Boolean);

  if (!domains.length) {
    console.error('Usage: node scripts/qa/chunk-migration-gates.js --domain <domain> | --all');
    process.exitCode = 1;
    return;
  }

  const results = domains.map(domain => runDomainGate(domain));
  const errors = results.flatMap(result => result.errors.map(error => `${result.domain}: ${error}`));

  if (errors.length) {
    console.error(`Question chunk migration gate failed:\n${errors.join('\n')}`);
    process.exitCode = 1;
    return;
  }

  const totalSets = results.reduce((sum, result) => sum + result.checked, 0);
  console.log(`Question chunk migration gate passed for ${domains.join(', ')} (${totalSets} sets).`);
}

module.exports = {
  runDomainGate
};

if (require.main === module) runCli();
