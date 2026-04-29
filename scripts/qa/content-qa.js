#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  loadQuestionBanks,
  flattenQuestionBanks,
  flattenQuestions,
  getDerivedQuestionKey,
  getBankSizeSummary
} = require('./bank-loader');
const {
  buildQuestionId,
  computeContentHash
} = require('./question-metadata');

function validateContent(options = {}) {
  const bankLoad = loadQuestionBanks(options);
  return validateLoadedContent(bankLoad);
}

function validateLoadedContent(bankLoad) {
  const issues = [];
  const sets = flattenQuestionBanks(bankLoad);
  const questions = flattenQuestions(bankLoad);

  if (!sets.length) {
    addIssue(issues, 'error', '', '', '', 'No question sets were loaded.');
  }

  bankLoad.files.forEach(fileRecord => {
    if (!fileRecord.bank || !Object.keys(fileRecord.bank).length) {
      addIssue(issues, 'error', fileRecord.file, '', '', 'window.QUESTION_BANK was not populated.');
    }
  });

  sets.forEach(record => validateSet(record, issues));
  questions.forEach(record => validateQuestion(record, issues));
  validateUniqueQuestionKeys(sets, issues);
  validateStableQuestionIdentity(sets, issues);

  return {
    bankLoad,
    sets,
    questions,
    issues,
    errors: issues.filter(issue => issue.level === 'error'),
    warnings: issues.filter(issue => issue.level === 'warning'),
    sizeSummary: getBankSizeSummary(bankLoad)
  };
}

function validateStableQuestionIdentity(sets, issues) {
  const globalIds = new Map();
  sets.forEach(record => {
    const questions = Array.isArray(record.set && record.set.questions) ? record.set.questions : [];
    const sequences = new Map();
    const hashes = new Map();

    questions.forEach((question, index) => {
      const location = `question ${index + 1}`;
      const metadata = question && question.metadata || {};
      const sequence = Number(metadata.sequence);
      const id = question && question.id;
      const contentHash = question && question.contentHash;

      if (!id || typeof id !== 'string') {
        addIssue(issues, 'error', record.file, record.setId, location, 'Missing stable question id.');
      } else {
        if (globalIds.has(id)) {
          addIssue(issues, 'error', record.file, record.setId, location, `Duplicate stable question id "${id}" also appears at ${globalIds.get(id)}.`);
        } else {
          globalIds.set(id, `${record.relativeFile} | ${record.setId} | ${location}`);
        }
        if (!id.startsWith(`${record.setId}-q`)) {
          addIssue(issues, 'error', record.file, record.setId, location, `Stable question id "${id}" must start with "${record.setId}-q".`);
        }
      }

      if (!Number.isInteger(question && question.version) || question.version < 1) {
        addIssue(issues, 'error', record.file, record.setId, location, 'Question version must be an integer >= 1.');
      }

      if (!contentHash || typeof contentHash !== 'string') {
        addIssue(issues, 'error', record.file, record.setId, location, 'Missing contentHash.');
      } else if (!/^sha256:[a-f0-9]{64}$/.test(contentHash)) {
        addIssue(issues, 'error', record.file, record.setId, location, `Invalid contentHash "${contentHash}".`);
      } else {
        const expectedHash = computeContentHash(question);
        if (contentHash !== expectedHash) {
          addIssue(issues, 'error', record.file, record.setId, location, `contentHash is stale. Expected ${expectedHash}.`);
        }
        if (hashes.has(contentHash) && !metadata.allowDuplicateContentHash) {
          addIssue(issues, 'error', record.file, record.setId, location, `Duplicate contentHash also appears at question ${hashes.get(contentHash)}.`);
        } else {
          hashes.set(contentHash, index + 1);
        }
      }

      if (metadata.sourceSet !== record.setId) {
        addIssue(issues, 'error', record.file, record.setId, location, `metadata.sourceSet must match containing set "${record.setId}".`);
      }
      if (!Number.isInteger(sequence) || sequence < 1) {
        addIssue(issues, 'error', record.file, record.setId, location, 'metadata.sequence must be an integer >= 1.');
      } else {
        if (sequences.has(sequence)) {
          addIssue(issues, 'error', record.file, record.setId, location, `Duplicate metadata.sequence ${sequence} also appears at question ${sequences.get(sequence)}.`);
        } else {
          sequences.set(sequence, index + 1);
        }
        if (id && id === buildQuestionId(record.setId, sequence) && !id.endsWith(`q${String(sequence).padStart(4, '0')}`)) {
          addIssue(issues, 'error', record.file, record.setId, location, `Stable question id "${id}" is not aligned with metadata.sequence ${sequence}.`);
        } else if (id && id.startsWith(`${record.setId}-q`) && id !== buildQuestionId(record.setId, sequence)) {
          addIssue(issues, 'error', record.file, record.setId, location, `Stable question id "${id}" is not aligned with metadata.sequence ${sequence}.`);
        }
      }
    });
  });
}

function validateSet(record, issues) {
  const set = record.set || {};
  if (!set.title || typeof set.title !== 'string') {
    addIssue(issues, 'error', record.file, record.setId, '', 'Set is missing a title.');
  }
  if (!set.topic || typeof set.topic !== 'string') {
    addIssue(issues, 'error', record.file, record.setId, '', 'Set is missing a topic.');
  }
  if (!Array.isArray(set.questions) || !set.questions.length) {
    addIssue(issues, 'error', record.file, record.setId, '', 'Set has no questions.');
  }

  const metadata = set.metadata || {};
  const questions = Array.isArray(set.questions) ? set.questions : [];
  if (metadata.gradesSupported && metadata.difficultiesSupported) {
    const grades = metadata.gradesSupported.map(String);
    grades.forEach(grade => {
      const gradeCount = questions.filter(question => questionSupportsGrade(question, grade)).length;
      if (!gradeCount) {
        addIssue(issues, 'error', record.file, record.setId, '', `No questions are usable for grade ${grade}.`);
      }
    });
    const availableDifficulties = new Set();
    questions.forEach(question => {
      Object.values(question.metadata && question.metadata.difficultyByGrade || {}).forEach(value => {
        if (value) availableDifficulties.add(String(value));
      });
    });
    metadata.difficultiesSupported.map(String).forEach(difficulty => {
      if (!availableDifficulties.has(difficulty)) {
        addIssue(issues, 'warning', record.file, record.setId, '', `No exact questions are tagged for difficulty ${difficulty}; quiz selection will use fallback questions.`);
      }
    });
  }
}

function validateQuestion(record, issues) {
  const question = record.question || {};
  const location = `question ${record.questionNumber}`;
  if (!question.question || typeof question.question !== 'string') {
    addIssue(issues, 'error', record.file, record.setId, location, 'Question prompt is missing.');
  }
  if (!Array.isArray(question.choices) || !question.choices.length) {
    addIssue(issues, 'error', record.file, record.setId, location, 'Question choices are missing or empty.');
  }
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= (question.choices || []).length) {
    addIssue(issues, 'error', record.file, record.setId, location, `Correct index ${question.correct} is outside the choices array.`);
  }
  if (!question.explanation || typeof question.explanation !== 'object') {
    addIssue(issues, 'error', record.file, record.setId, location, 'Question explanation is missing.');
  } else {
    if (!question.explanation.correct) {
      addIssue(issues, 'error', record.file, record.setId, location, 'Correct-answer explanation is missing.');
    }
    if (Array.isArray(question.explanation.incorrect) && Array.isArray(question.choices) && question.explanation.incorrect.length !== question.choices.length) {
      addIssue(issues, 'error', record.file, record.setId, location, `Incorrect explanation count is ${question.explanation.incorrect.length}, but choice count is ${question.choices.length}.`);
    }
  }
  if (!question.metadata || typeof question.metadata !== 'object') {
    addIssue(issues, 'error', record.file, record.setId, location, 'Question metadata is missing.');
    return;
  }
  if (question.metadata.gradeLevels && !Array.isArray(question.metadata.gradeLevels)) {
    addIssue(issues, 'error', record.file, record.setId, location, 'metadata.gradeLevels must be an array.');
  }
  if (question.metadata.gradeLevels && !question.metadata.gradeLevels.length) {
    addIssue(issues, 'error', record.file, record.setId, location, 'metadata.gradeLevels is empty.');
  }
  if (question.metadata.difficultyByGrade && typeof question.metadata.difficultyByGrade !== 'object') {
    addIssue(issues, 'error', record.file, record.setId, location, 'metadata.difficultyByGrade must be an object.');
  }
  if (question.metadata.gradeLevels && question.metadata.difficultyByGrade) {
    question.metadata.gradeLevels.map(String).forEach(grade => {
      if (!question.metadata.difficultyByGrade[grade]) {
        addIssue(issues, 'error', record.file, record.setId, location, `metadata.difficultyByGrade is missing grade ${grade}.`);
      }
    });
  }
}

function validateUniqueQuestionKeys(sets, issues) {
  sets.forEach(record => {
    const seen = new Map();
    const questions = Array.isArray(record.set && record.set.questions) ? record.set.questions : [];
    questions.forEach((question, index) => {
      const key = getDerivedQuestionKey(question, index + 1);
      if (seen.has(key)) {
        addIssue(issues, 'error', record.file, record.setId, `question ${index + 1}`, `Duplicate derived question key "${key}" also appears at question ${seen.get(key)}.`);
      } else {
        seen.set(key, index + 1);
      }
    });
  });
}

function questionSupportsGrade(question, grade) {
  const levels = question.metadata && question.metadata.gradeLevels;
  return !levels || levels.map(String).includes(String(grade));
}

function addIssue(issues, level, file, setId, location, message) {
  issues.push({
    level,
    file,
    relativeFile: file ? path.relative(repoRoot, file) : '',
    setId,
    location,
    message
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function runCli() {
  const result = validateContent();
  result.issues.forEach(issue => {
    const location = [issue.relativeFile, issue.setId, issue.location].filter(Boolean).join(' | ');
    console.log(`${issue.level.toUpperCase()}: ${location}`);
    console.log(`  ${issue.message}`);
  });

  const sizes = result.sizeSummary;
  console.log(`Checked ${result.sets.length} sets and ${result.questions.length} questions.`);
  console.log(`Question-bank payload: ${formatBytes(sizes.totalBytes)} total, ${formatBytes(sizes.largest.bytes)} largest (${sizes.largest.file}).`);
  sizes.files.forEach(item => {
    console.log(`  ${item.file}: ${formatBytes(item.bytes)}`);
  });
  console.log(`${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
  if (result.errors.length) process.exitCode = 1;
}

if (require.main === module) runCli();

module.exports = {
  validateContent,
  validateLoadedContent,
  formatBytes
};
