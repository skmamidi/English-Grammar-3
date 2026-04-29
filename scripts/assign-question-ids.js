#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  buildQuestionId,
  computeContentHash,
  getQuestionSequence,
  getQuestionSourceSet
} = require('./qa/question-metadata');

const repoRoot = path.resolve(__dirname, '..');
const bankDir = path.join(repoRoot, 'assets', 'question-banks');

function main() {
  const files = fs.readdirSync(bankDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(bankDir, file))
    .sort();
  const globalIds = new Map();
  let changedQuestions = 0;
  let totalQuestions = 0;

  files.forEach(file => {
    const { bank, prefix, suffix } = loadBankFile(file);
    let fileChanged = false;

    Object.entries(bank).forEach(([setId, set]) => {
      const questions = Array.isArray(set.questions) ? set.questions : [];
      const setIds = new Map();
      const seenSequences = new Set();
      const hashCounts = new Map();
      questions.forEach(question => {
        const hash = computeContentHash(question);
        hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
      });
      questions.forEach((question, index) => {
        totalQuestions += 1;
        const existingSequence = getQuestionSequence(question, index + 1);
        let sequence = seenSequences.has(existingSequence) ? index + 1 : existingSequence;
        while (seenSequences.has(sequence)) sequence += 1;
        seenSequences.add(sequence);
        const sourceSet = getQuestionSourceSet(question, setId);
        const expectedId = buildQuestionId(sourceSet, sequence);
        const id = question.id || expectedId;

        if (setIds.has(id)) {
          throw new Error(`${path.relative(repoRoot, file)} | ${setId} | duplicate id ${id} at questions ${setIds.get(id)} and ${index + 1}`);
        }
        setIds.set(id, index + 1);

        if (globalIds.has(id)) {
          throw new Error(`${path.relative(repoRoot, file)} | ${setId} | id ${id} conflicts with ${globalIds.get(id)}`);
        }
        globalIds.set(id, `${path.relative(repoRoot, file)} | ${setId} | question ${index + 1}`);

        const contentHash = computeContentHash(question);
        const normalized = normalizeQuestion(question, id, contentHash, setId, sequence, hashCounts.get(contentHash) > 1);
        if (JSON.stringify(normalized) !== JSON.stringify(question)) {
          questions[index] = normalized;
          changedQuestions += 1;
          fileChanged = true;
        }
      });
    });

    if (fileChanged) {
      fs.writeFileSync(file, `${prefix}${JSON.stringify(bank, null, 2)}${suffix}`);
    }
  });

  console.log(`Processed ${totalQuestions} questions. Updated ${changedQuestions} question record(s).`);
}

function loadBankFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: file });
  const bank = context.window.QUESTION_BANK || {};
  const match = code.match(/^([\s\S]*?Object\.assign\(window\.QUESTION_BANK \|\| \{\},\s*)(\{[\s\S]*\})(\s*\);\s*\}\)\(\);\s*)$/);
  if (!match) {
    throw new Error(`Could not identify question-bank wrapper in ${path.relative(repoRoot, file)}`);
  }
  return {
    bank,
    prefix: match[1],
    suffix: match[3]
  };
}

function normalizeQuestion(question, id, contentHash, setId, sequence, allowDuplicateContentHash) {
  const rest = Object.assign({}, question);
  delete rest.id;
  delete rest.version;
  delete rest.contentHash;
  const metadata = Object.assign({}, rest.metadata || {}, {
    sourceSet: rest.metadata && rest.metadata.sourceSet || setId,
    sequence
  });
  if (allowDuplicateContentHash) metadata.allowDuplicateContentHash = true;
  rest.metadata = metadata;
  return Object.assign({
    id,
    version: Number.isInteger(Number(question.version)) && Number(question.version) >= 1 ? Number(question.version) : 1,
    contentHash
  }, rest);
}

if (require.main === module) main();

module.exports = {
  loadBankFile,
  main,
  normalizeQuestion
};
