#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..', '..');
const bankDir = path.join(repoRoot, 'assets', 'question-banks');

function getBankFiles(root = repoRoot) {
  const dir = path.join(root, 'assets', 'question-banks');
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(dir, file))
    .sort();
}

function createBrowserLikeContext() {
  const window = {};
  return {
    window,
    document: {
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
      querySelector() {
        return null;
      },
      getElementById() {
        return null;
      },
      createElement() {
        return { textContent: '', innerHTML: '' };
      }
    },
    console,
    localStorage: createMemoryStorage(),
    sessionStorage: createMemoryStorage(),
    URLSearchParams
  };
}

function createMemoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    clear() {
      data.clear();
    }
  };
}

function loadQuestionBanks(options = {}) {
  const root = options.repoRoot || repoRoot;
  const files = options.files || getBankFiles(root);
  const sharedContext = options.sharedContext !== false;
  const loaded = [];
  const shared = createBrowserLikeContext();
  shared.window.QUESTION_BANK = {};

  files.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    const context = sharedContext ? shared : createBrowserLikeContext();
    if (!context.window.QUESTION_BANK) context.window.QUESTION_BANK = {};
    const beforeKeys = new Set(Object.keys(context.window.QUESTION_BANK));
    vm.createContext(context);
    vm.runInContext(code, context, { filename: file });
    const currentBank = context.window.QUESTION_BANK || {};
    const fileBank = {};
    Object.keys(currentBank).forEach(key => {
      if (!sharedContext || !beforeKeys.has(key)) fileBank[key] = currentBank[key];
    });
    loaded.push({
      file,
      relativeFile: path.relative(root, file),
      bank: fileBank,
      bytes: Buffer.byteLength(code)
    });
  });

  return {
    files: loaded,
    bank: shared.window.QUESTION_BANK || Object.assign({}, ...loaded.map(item => item.bank))
  };
}

function flattenQuestionBanks(bankLoad) {
  return bankLoad.files.flatMap(fileRecord => {
    return Object.entries(fileRecord.bank).map(([setId, set]) => ({
      file: fileRecord.file,
      relativeFile: fileRecord.relativeFile,
      setId,
      set
    }));
  });
}

function flattenQuestions(bankLoad) {
  return flattenQuestionBanks(bankLoad).flatMap(setRecord => {
    const questions = Array.isArray(setRecord.set && setRecord.set.questions)
      ? setRecord.set.questions
      : [];
    return questions.map((question, index) => Object.assign({}, setRecord, {
      question,
      questionNumber: index + 1,
      sequence: question && question.metadata ? question.metadata.sequence : undefined
    }));
  });
}

function getDerivedQuestionKey(question, fallbackIndex) {
  const metadata = question && question.metadata || {};
  const source = metadata.sourceSet || '';
  const sequence = metadata.sequence || '';
  return [
    source || 'unknown',
    sequence || fallbackIndex,
    normalizeText(question && question.question),
    Array.isArray(question && question.choices) ? question.choices.map(normalizeText).join('|') : ''
  ].join('::');
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getBankSizeSummary(bankLoad) {
  const files = bankLoad.files.map(item => ({
    file: item.relativeFile,
    bytes: item.bytes
  }));
  const totalBytes = files.reduce((sum, item) => sum + item.bytes, 0);
  const largest = files.slice().sort((a, b) => b.bytes - a.bytes)[0] || null;
  return { totalBytes, largest, files };
}

module.exports = {
  repoRoot,
  bankDir,
  createMemoryStorage,
  getBankFiles,
  loadQuestionBanks,
  flattenQuestionBanks,
  flattenQuestions,
  getDerivedQuestionKey,
  getBankSizeSummary
};
