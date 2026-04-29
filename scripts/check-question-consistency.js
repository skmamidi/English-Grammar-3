#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const bankDir = path.join(repoRoot, 'assets', 'question-banks');
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

const issues = [];

function main() {
  const banks = loadQuestionBanks();
  const syllableMap = loadSyllableMap();
  addStudyAidDivisions(syllableMap, banks);

  for (const item of banks) {
    checkCorrectIndex(item);
    checkIncorrectExplanationShape(item);
    checkSyllableCountChoice(item, syllableMap);
    checkSyllableNumberAnswer(item, syllableMap);
    checkClosedFirstSyllable(item, syllableMap);
    checkSyllableDivisionChoice(item, syllableMap);
  }

  const errors = issues.filter(issue => issue.level === 'error');
  const warnings = issues.filter(issue => issue.level === 'warning');

  for (const issue of issues) {
    const location = [
      path.relative(repoRoot, issue.file),
      issue.setId,
      issue.sequence ? `sequence ${issue.sequence}` : `question ${issue.questionNumber}`
    ].filter(Boolean).join(' | ');
    console.log(`${issue.level.toUpperCase()}: ${location}`);
    console.log(`  ${issue.message}`);
    if (issue.prompt) console.log(`  Prompt: ${issue.prompt}`);
  }

  console.log(`Checked ${banks.length} questions. ${errors.length} error(s), ${warnings.length} warning(s).`);
  if (errors.length) process.exitCode = 1;
}

function loadQuestionBanks() {
  const files = fs.readdirSync(bankDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(bankDir, file))
    .sort();
  const items = [];

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(code, context, { filename: file });
    const questionBank = context.window.QUESTION_BANK || {};

    for (const [setId, set] of Object.entries(questionBank)) {
      const questions = Array.isArray(set.questions) ? set.questions : [];
      questions.forEach((question, index) => {
        items.push({
          file,
          setId,
          setTitle: set.title || '',
          question,
          questionNumber: index + 1,
          sequence: question && question.metadata ? question.metadata.sequence : undefined
        });
      });
    }
  }

  return items;
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

main();
