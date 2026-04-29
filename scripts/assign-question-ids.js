#!/usr/bin/env node

const path = require('path');
const {
  buildQuestionId,
  computeContentHash
} = require('./qa/question-metadata');
const {
  loadJsonSources,
  serializeJsonSource,
  writeJsonSource
} = require('./qa/json-source-loader');

function normalizeQuestionSources(options = {}) {
  if (options.legacyJs) {
    throw new Error('Legacy JS normalization is no longer supported by default. Edit assets/question-bank-source/*.json and regenerate runtime artifacts.');
  }

  const records = options.records || loadJsonSources(options);
  const write = options.write === true;
  const summary = {
    filesChecked: records.length,
    filesChanged: 0,
    totalQuestions: 0,
    changedQuestions: 0,
    changedFiles: []
  };

  records.forEach(record => {
    const before = serializeJsonSource(record.source);
    normalizeSourceRecord(record, summary);
    const after = serializeJsonSource(record.source);

    if (before !== after) {
      summary.filesChanged += 1;
      summary.changedFiles.push(record.relativeFile || path.basename(record.file));
      if (write) writeJsonSource(record);
    }
  });

  return summary;
}

function normalizeSourceRecord(record, summary) {
  const sets = record.source && record.source.sets && typeof record.source.sets === 'object'
    ? record.source.sets
    : {};

  Object.entries(sets).forEach(([setId, set]) => {
    const questions = Array.isArray(set && set.questions) ? set.questions : [];
    const seenSequences = new Set();
    const hashCounts = new Map();

    questions.forEach(question => {
      const hash = computeContentHash(question);
      hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
    });

    questions.forEach((question, index) => {
      summary.totalQuestions += 1;
      const sequence = chooseSequence(question, setId, index + 1, seenSequences);
      seenSequences.add(sequence);
      const contentHash = computeContentHash(question);
      const id = buildQuestionId(setId, sequence);
      const normalized = normalizeQuestion(
        question,
        id,
        contentHash,
        setId,
        sequence,
        hashCounts.get(contentHash) > 1
      );

      if (JSON.stringify(normalized) !== JSON.stringify(question)) {
        questions[index] = normalized;
        summary.changedQuestions += 1;
      }
    });
  });
}

function chooseSequence(question, setId, fallback, seenSequences) {
  const idSequence = getSequenceFromQuestionId(question && question.id, setId);
  if (idSequence && !seenSequences.has(idSequence)) return idSequence;

  const metadataSequence = Number(question && question.metadata && question.metadata.sequence);
  if (Number.isInteger(metadataSequence) && metadataSequence > 0 && !seenSequences.has(metadataSequence)) {
    return metadataSequence;
  }

  let sequence = fallback;
  while (seenSequences.has(sequence)) sequence += 1;
  return sequence;
}

function getSequenceFromQuestionId(id, setId) {
  const match = String(id || '').match(new RegExp(`^${escapeRegExp(setId)}-q(\\d+)$`));
  if (!match) return 0;
  const sequence = Number(match[1]);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : 0;
}

function normalizeQuestion(question, id, contentHash, setId, sequence, allowDuplicateContentHash) {
  const rest = Object.assign({}, question);
  delete rest.id;
  delete rest.version;
  delete rest.contentHash;
  const metadata = Object.assign({}, rest.metadata || {}, {
    sourceSet: setId,
    sequence
  });
  if (allowDuplicateContentHash) metadata.allowDuplicateContentHash = true;
  else delete metadata.allowDuplicateContentHash;
  rest.metadata = metadata;
  return Object.assign({
    id,
    version: Number.isInteger(Number(question && question.version)) && Number(question.version) >= 1 ? Number(question.version) : 1,
    contentHash
  }, rest);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSummary(summary, write) {
  const action = write ? 'Updated' : 'Would update';
  return [
    `Processed ${summary.totalQuestions} questions across ${summary.filesChecked} JSON source file(s).`,
    `${action} ${summary.changedQuestions} question record(s) in ${summary.filesChanged} file(s).`
  ].join('\n');
}

function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const legacyJs = argv.includes('--legacy-js');

  try {
    const summary = normalizeQuestionSources({ write, legacyJs });
    console.log(formatSummary(summary, write));
    if (!write && summary.changedQuestions > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  main,
  normalizeQuestion,
  normalizeQuestionSources,
  chooseSequence,
  getSequenceFromQuestionId
};
