#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  buildQuestionId,
  computeContentHash
} = require('./qa/question-metadata');
const {
  loadQuestionBanks,
  flattenQuestions
} = require('./qa/bank-loader');

const repoRoot = path.resolve(__dirname, '..');
const quizEnginePath = path.join(repoRoot, 'assets', 'quiz-engine.js');

const numberWords = new Map([
  ['zero', 0],
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10]
]);

let issues = [];

function checkQuestionConsistency(options = {}) {
  issues = [];
  const banks = loadQuestionItems(options);
  const syllableMap = loadSyllableMap();
  addStudyAidDivisions(syllableMap, banks);

  for (const item of banks) {
    checkStableIdentity(item);
    checkCorrectIndex(item);
    checkIncorrectExplanationShape(item);
    checkSyllableCountChoice(item, syllableMap);
    checkSyllableNumberAnswer(item, syllableMap);
    checkClosedFirstSyllable(item, syllableMap);
    checkSyllableDivisionChoice(item, syllableMap);
  }
  checkGlobalStableIdUniqueness(banks);
  checkSetIdentityCollections(banks);

  const errors = issues.filter(issue => issue.level === 'error');
  const warnings = issues.filter(issue => issue.level === 'warning');

  return {
    items: banks,
    issues,
    errors,
    warnings
  };
}

function main() {
  const result = checkQuestionConsistency();

  for (const issue of result.issues) {
    const location = [
      path.relative(repoRoot, issue.file),
      issue.setId,
      issue.sequence ? `sequence ${issue.sequence}` : `question ${issue.questionNumber}`
    ].filter(Boolean).join(' | ');
    console.log(`${issue.level.toUpperCase()}: ${location}`);
    console.log(`  ${issue.message}`);
    if (issue.prompt) console.log(`  Prompt: ${issue.prompt}`);
  }

  console.log(`Checked ${result.items.length} questions. ${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
  if (result.errors.length) process.exitCode = 1;
}

function checkStableIdentity(item) {
  const { question, setId } = item;
  if (!question) return;
  const metadata = question.metadata || {};
  const locationPrompt = question.question || '';
  if (!question.id || typeof question.id !== 'string') {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, 'Missing stable question id.');
  } else if (!question.id.startsWith(`${setId}-q`)) {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, `Stable question id "${question.id}" must start with "${setId}-q".`);
  }

  if (!Number.isInteger(question.version) || question.version < 1) {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, 'Question version must be an integer >= 1.');
  }

  if (!question.contentHash || typeof question.contentHash !== 'string') {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, 'Missing contentHash.');
  } else if (!/^sha256:[a-f0-9]{64}$/.test(question.contentHash)) {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, `Invalid contentHash "${question.contentHash}".`);
  } else {
    const expectedHash = computeContentHash(question);
    if (question.contentHash !== expectedHash) {
      addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, `contentHash is stale. Expected ${expectedHash}.`);
    }
  }

  if (metadata.sourceSet !== setId) {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, `metadata.sourceSet must match containing set "${setId}".`);
  }
  if (!Number.isInteger(metadata.sequence) || metadata.sequence < 1) {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, 'metadata.sequence must be an integer >= 1.');
  } else if (question.id && question.id.startsWith(`${setId}-q`) && question.id !== buildQuestionId(setId, metadata.sequence)) {
    addIssue('error', item.file, setId, item.sequence, item.questionNumber, locationPrompt, `Stable question id "${question.id}" is not aligned with metadata.sequence ${metadata.sequence}.`);
  }
}

function checkGlobalStableIdUniqueness(items) {
  const seen = new Map();
  items.forEach(item => {
    const id = item.question && item.question.id;
    if (!id) return;
    const previous = seen.get(id);
    if (previous) {
      addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, item.question.question, `Duplicate stable question id "${id}" also appears at ${previous}.`);
    } else {
      seen.set(id, `${path.relative(repoRoot, item.file)} | ${item.setId} | question ${item.questionNumber}`);
    }
  });
}

function checkSetIdentityCollections(items) {
  const bySet = new Map();
  items.forEach(item => {
    const key = `${item.file}::${item.setId}`;
    if (!bySet.has(key)) bySet.set(key, []);
    bySet.get(key).push(item);
  });

  bySet.forEach(setItems => {
    const sequences = new Map();
    const hashes = new Map();
    setItems.forEach(item => {
      const question = item.question || {};
      const sequence = question.metadata && question.metadata.sequence;
      if (Number.isInteger(sequence)) {
        if (sequences.has(sequence)) {
          addIssue('error', item.file, item.setId, sequence, item.questionNumber, question.question, `Duplicate metadata.sequence ${sequence} also appears at question ${sequences.get(sequence)}.`);
        } else {
          sequences.set(sequence, item.questionNumber);
        }
      }
      if (question.contentHash) {
        if (hashes.has(question.contentHash) && !(question.metadata && question.metadata.allowDuplicateContentHash)) {
          addIssue('error', item.file, item.setId, sequence, item.questionNumber, question.question, `Duplicate contentHash also appears at question ${hashes.get(question.contentHash)}.`);
        } else {
          hashes.set(question.contentHash, item.questionNumber);
        }
      }
    });
  });
}

function loadQuestionItems(options = {}) {
  const bankLoad = loadQuestionBanks(Object.assign({ sourceType: 'json' }, options));
  return flattenQuestions(bankLoad).map(record => ({
    file: record.file,
    relativeFile: record.relativeFile,
    setId: record.setId,
    setTitle: record.set && record.set.title || '',
    question: record.question,
    questionNumber: record.questionNumber,
    sequence: record.sequence
  }));
}

function loadSyllableMap() {
  const map = new Map();
  const code = fs.readFileSync(quizEnginePath, 'utf8');
  const objectMatch = code.match(/const\s+syllableDivisionMap\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (!objectMatch) {
    addIssue('warning', quizEnginePath, '', 0, 0, '', 'Could not find syllableDivisionMap in quiz-engine.js.');
    return map;
  }

  const entryPattern = /^\s*([A-Za-z][A-Za-z'-]*)\s*:\s*'([^']+)'/gm;
  let match;
  while ((match = entryPattern.exec(objectMatch[1]))) {
    map.set(normalizeWord(match[1]), match[2].toLowerCase());
  }
  return map;
}

function addStudyAidDivisions(syllableMap, banks) {
  for (const { question } of banks) {
    const example = question && question.studyAid ? String(question.studyAid.example || '') : '';
    const divisions = example.match(/\b[A-Za-z]+(?:-[A-Za-z]+)+\b/g) || [];
    for (const division of divisions) {
      const word = normalizeWord(stripSyllableMarks(division));
      if (word && !syllableMap.has(word)) syllableMap.set(word, division.toLowerCase());
    }
  }
}

function checkCorrectIndex(item) {
  const { question } = item;
  if (!question || !Array.isArray(question.choices)) return;
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.choices.length) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, question.question, `Correct index ${question.correct} is outside the choices array.`);
  }
}

function checkIncorrectExplanationShape(item) {
  const { question } = item;
  if (!question || !Array.isArray(question.choices) || !question.explanation) return;
  const incorrect = question.explanation.incorrect;
  if (!Array.isArray(incorrect)) return;

  if (incorrect.length !== question.choices.length) {
    addIssue('warning', item.file, item.setId, item.sequence, item.questionNumber, question.question, `Incorrect explanation count is ${incorrect.length}, but choice count is ${question.choices.length}.`);
    return;
  }

  const correctExplanation = String(incorrect[question.correct] || '').trim();
  if (correctExplanation) {
    addIssue('warning', item.file, item.setId, item.sequence, item.questionNumber, question.question, `Incorrect explanation at the correct index should be blank, but found: "${correctExplanation}".`);
  }
}

function checkSyllableCountChoice(item, syllableMap) {
  const { question } = item;
  if (!question || !Array.isArray(question.choices)) return;
  const prompt = String(question.question || '');
  const requested = getRequestedSyllableCount(prompt);
  if (!requested || !/\bchoose\s+one\s+word\s+that\s+has\b/i.test(prompt)) return;

  const choiceCounts = question.choices.map(choice => getSyllableCountForChoice(choice, syllableMap));
  const knownChoices = choiceCounts.filter(count => count > 0).length;
  const matchingIndexes = choiceCounts
    .map((count, index) => count === requested ? index : -1)
    .filter(index => index >= 0);
  const correctCount = choiceCounts[question.correct];

  if (correctCount > 0 && correctCount !== requested) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Correct choice "${question.choices[question.correct]}" has ${correctCount} syllable(s), not ${requested}.`);
  }

  if (knownChoices === question.choices.length && matchingIndexes.length !== 1) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Expected exactly one ${requested}-syllable choice, but found ${matchingIndexes.length}: ${formatChoiceIndexes(question, matchingIndexes)}.`);
  }

  if (knownChoices === question.choices.length && matchingIndexes.length === 1 && matchingIndexes[0] !== question.correct) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Only ${requested}-syllable choice is "${question.choices[matchingIndexes[0]]}", but correct index points to "${question.choices[question.correct]}".`);
  }
}

function checkSyllableNumberAnswer(item, syllableMap) {
  const { question } = item;
  if (!question || !Array.isArray(question.choices)) return;
  const prompt = String(question.question || '');
  const targetWord = getHowManySyllablesTarget(prompt);
  if (!targetWord) return;

  const targetCount = getSyllableCountForWord(targetWord, syllableMap);
  if (!targetCount) return;

  const selectedCount = parseNumberChoice(question.choices[question.correct]);
  if (!selectedCount) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Correct choice "${question.choices[question.correct]}" is not a parseable number for a syllable-count question.`);
    return;
  }

  if (selectedCount !== targetCount) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `"${targetWord}" has ${targetCount} syllable(s), but the correct choice is "${question.choices[question.correct]}".`);
  }
}

function checkClosedFirstSyllable(item, syllableMap) {
  const { question } = item;
  if (!question || !Array.isArray(question.choices)) return;
  const prompt = String(question.question || '');
  if (!/\bclosed first syllable\b/i.test(prompt)) return;

  const states = question.choices.map(choice => {
    const division = getSyllableDivision(stripSyllableMarks(choice), syllableMap);
    return division ? isClosedFirstDivision(division) : undefined;
  });
  if (states.some(state => state === undefined)) return;

  const matchingIndexes = states
    .map((state, index) => state ? index : -1)
    .filter(index => index >= 0);

  if (matchingIndexes.length !== 1) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Expected exactly one closed-first-syllable choice, but found ${matchingIndexes.length}: ${formatChoiceIndexes(question, matchingIndexes)}.`);
  }

  if (matchingIndexes.length === 1 && matchingIndexes[0] !== question.correct) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Closed-first-syllable choice is "${question.choices[matchingIndexes[0]]}", but correct index points to "${question.choices[question.correct]}".`);
  }
}

function checkSyllableDivisionChoice(item, syllableMap) {
  const { question } = item;
  if (!question || !Array.isArray(question.choices)) return;
  const prompt = String(question.question || '');
  if (!/\bdivide\b.*\bsyllables?\b|\bsyllables?\b.*\bdivide\b/i.test(prompt)) return;
  if (!question.choices.every(choice => /-/.test(String(choice)))) return;

  const strippedWords = [...new Set(question.choices.map(choice => normalizeWord(stripSyllableMarks(choice))))];
  if (strippedWords.length !== 1) return;

  const expectedDivision = getSyllableDivision(strippedWords[0], syllableMap);
  if (!expectedDivision) return;

  const matchingIndexes = question.choices
    .map((choice, index) => normalizeDivision(choice) === expectedDivision ? index : -1)
    .filter(index => index >= 0);

  if (matchingIndexes.length !== 1) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Expected exactly one division matching "${expectedDivision}", but found ${matchingIndexes.length}.`);
  }

  if (matchingIndexes.length === 1 && matchingIndexes[0] !== question.correct) {
    addIssue('error', item.file, item.setId, item.sequence, item.questionNumber, prompt, `Expected division "${expectedDivision}" is choice "${question.choices[matchingIndexes[0]]}", but correct index points to "${question.choices[question.correct]}".`);
  }
}

function getRequestedSyllableCount(prompt) {
  const text = String(prompt || '');
  const digitMatch = text.match(/\bhas\s+(\d+)\s+syllables?\b|\bwith\s+(\d+)\s+syllables?\b/i);
  if (digitMatch) return Number(digitMatch[1] || digitMatch[2]);
  const wordMatch = text.match(/\bhas\s+(one|two|three|four|five|six|seven|eight|nine|ten)\s+syllables?\b|\bwith\s+(one|two|three|four|five|six|seven|eight|nine|ten)\s+syllables?\b/i);
  return wordMatch ? numberWords.get(String(wordMatch[1] || wordMatch[2]).toLowerCase()) : 0;
}

function getHowManySyllablesTarget(prompt) {
  const match = String(prompt || '').match(/\bhow\s+many\s+syllables\s+(?:are|is)\s+in\s+["']?([A-Za-z'-]+)["']?/i);
  return match ? normalizeWord(match[1]) : '';
}

function getSyllableCountForChoice(choice, syllableMap) {
  const text = String(choice || '');
  if (/-/.test(text)) return getSyllableCountFromDivision(text);
  return getSyllableCountForWord(text, syllableMap);
}

function getSyllableCountForWord(word, syllableMap) {
  const division = getSyllableDivision(word, syllableMap);
  return division ? getSyllableCountFromDivision(division) : 0;
}

function getSyllableDivision(word, syllableMap) {
  return syllableMap.get(normalizeWord(word)) || '';
}

function getSyllableCountFromDivision(division) {
  return String(division || '').split('-').filter(Boolean).length;
}

function parseNumberChoice(choice) {
  const text = String(choice || '').trim().toLowerCase();
  if (/^\d+$/.test(text)) return Number(text);
  return numberWords.get(text) || 0;
}

function isClosedFirstDivision(division) {
  const first = String(division || '').split('-')[0].toLowerCase();
  return /[aeiou][^aeiouy]$/.test(first);
}

function stripSyllableMarks(value) {
  return String(value || '').replace(/-/g, '').replace(/[^A-Za-z']/g, '');
}

function normalizeWord(value) {
  return stripSyllableMarks(value).toLowerCase();
}

function normalizeDivision(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function formatChoiceIndexes(question, indexes) {
  if (!indexes.length) return 'none';
  return indexes.map(index => `${index}:${question.choices[index]}`).join(', ');
}

function addIssue(level, file, setId, sequence, questionNumber, prompt, message) {
  issues.push({ level, file, setId, sequence, questionNumber, prompt, message });
}

if (require.main === module) main();

module.exports = {
  checkQuestionConsistency,
  loadQuestionItems,
  main
};
