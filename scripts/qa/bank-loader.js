#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..', '..');
const bankDir = path.join(repoRoot, 'assets', 'question-banks');
const jsonBankDir = path.join(repoRoot, 'assets', 'question-bank-source');

function getLegacyBankFiles(root = repoRoot) {
  const dir = path.join(root, 'assets', 'question-banks');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(dir, file))
    .sort();
}

function getJsonBankFiles(root = repoRoot) {
  const dir = path.join(root, 'assets', 'question-bank-source');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dir, file))
    .sort();
}

function getBankFiles(root = repoRoot, options = {}) {
  return resolveBankFiles(root, options).files;
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
  const resolved = options.files
    ? { files: options.files, sourceType: options.sourceType || inferSourceType(options.files[0]) }
    : resolveBankFiles(root, options);
  const files = resolved.files;
  const sourceType = resolved.sourceType;

  if (sourceType === 'json') return loadJsonQuestionBanks({ root, files });

  return loadLegacyQuestionBanks({ root, files, sharedContext: options.sharedContext });
}

function loadLegacyQuestionBanks({ root, files, sharedContext: configuredSharedContext }) {
  const sharedContext = configuredSharedContext !== false;
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
    const relativeFile = path.relative(root, file).split(path.sep).join('/');
    loaded.push({
      file,
      relativeFile,
      sourceType: 'javascript',
      domain: getDomainFromBankFile(file),
      runtimeBankFile: relativeFile,
      bank: fileBank,
      bytes: Buffer.byteLength(code)
    });
  });

  return {
    files: loaded,
    bank: shared.window.QUESTION_BANK || Object.assign({}, ...loaded.map(item => item.bank))
  };
}

function loadJsonQuestionBanks({ root, files }) {
  const loaded = files.map(file => {
    const code = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(code);
    const domain = parsed.domain || getDomainFromBankFile(file);
    const bank = parsed.sets && typeof parsed.sets === 'object' && !Array.isArray(parsed.sets)
      ? parsed.sets
      : {};

    return {
      file,
      relativeFile: path.relative(root, file).split(path.sep).join('/'),
      sourceType: 'json',
      domain,
      runtimeBankFile: path.posix.join('assets', 'question-banks', `${domain}.js`),
      bank,
      bytes: Buffer.byteLength(code)
    };
  });

  return {
    files: loaded,
    bank: Object.assign({}, ...loaded.map(item => item.bank))
  };
}

function resolveBankFiles(root, options = {}) {
  const sourceType = options.sourceType || 'auto';
  if (sourceType === 'json') return { files: getJsonBankFiles(root), sourceType: 'json' };
  if (sourceType === 'legacy' || sourceType === 'javascript' || sourceType === 'js') {
    return { files: getLegacyBankFiles(root), sourceType: 'javascript' };
  }

  const jsonFiles = getJsonBankFiles(root);
  if (jsonFiles.length) return { files: jsonFiles, sourceType: 'json' };
  return { files: getLegacyBankFiles(root), sourceType: 'javascript' };
}

function inferSourceType(file) {
  return String(file || '').endsWith('.json') ? 'json' : 'javascript';
}

function getDomainFromBankFile(file) {
  return path.basename(file || '', path.extname(file || ''));
}

function flattenQuestionBanks(bankLoad) {
  return bankLoad.files.flatMap(fileRecord => {
    return Object.entries(fileRecord.bank).map(([setId, set]) => ({
      file: fileRecord.file,
      relativeFile: fileRecord.relativeFile,
      sourceType: fileRecord.sourceType,
      domain: fileRecord.domain,
      runtimeBankFile: fileRecord.runtimeBankFile,
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
  jsonBankDir,
  createMemoryStorage,
  getBankFiles,
  getJsonBankFiles,
  getLegacyBankFiles,
  loadQuestionBanks,
  flattenQuestionBanks,
  flattenQuestions,
  getDerivedQuestionKey,
  getBankSizeSummary
};
