#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  loadQuestionBanks,
  flattenQuestions
} = require('./bank-loader');
const {
  loadJsonSources,
  flattenJsonQuestionRecords,
  writeJsonSource
} = require('./json-source-loader');

const SYSTEM_DICTIONARY_FILES = [
  '/usr/share/dict/words',
  '/usr/share/dict/web2',
  '/usr/share/dict/propernames'
];

const COMMON_WORDS = [
  'about', 'above', 'across', 'after', 'again', 'against', 'almost', 'already',
  'always', 'answer', 'around', 'asked', 'asking', 'because', 'before', 'being',
  'below', 'between', 'both', 'called', 'capital', 'capitalization', 'choice',
  'choose', 'correct', 'could', 'dance', 'does', 'done', 'during', 'each',
  'every', 'everyone', 'family', 'favorite', 'first', 'from', 'going', 'good',
  'great', 'have', 'into', 'knew', 'know', 'language', 'little', 'many', 'more',
  'most', 'mother', 'next', 'other', 'people', 'place', 'question', 'school',
  'sentence', 'should', 'some', 'someone', 'something', 'sometimes', 'student',
  'students', 'teacher', 'their', 'there', 'these', 'they', 'thing', 'through',
  'together', 'too', 'under', 'until', 'used', 'using', 'very', 'want', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'whose', 'with',
  'word', 'words', 'would', 'your'
];

const SHORT_JOIN_WORDS = [
  'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'hi', 'if', 'in', 'is',
  'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we'
];

const KNOWN_LEARNER_WORDS = [
  'accident', 'accidentally', 'adverbs', 'against', 'appearance', 'artifacts',
  'article', 'attended', 'audio', 'authors', 'beautifulest', 'become',
  'believe', 'belinda', 'best', 'bird', 'birthday', 'blue', 'boy', 'bridge',
  'brown', 'bunch', 'bunny', 'called', 'carrying', 'cattle', 'chief',
  'children', 'choose', 'christine', 'chocolate', 'correctly', 'copyright',
  'cuddly', 'dictionary', 'dinner', 'disappear', 'divide', 'document',
  'dolphins', 'earthquake', 'electric', 'eleventh', 'embarrass', 'empire',
  'energetic', 'english', 'envious', 'errors', 'event', 'everyone', 'existent',
  'expensive', 'extracted', 'failed', 'fearless', 'figures', 'fishing', 'food',
  'forming', 'fresher', 'future', 'german', 'getting', 'grand', 'grandmother',
  'grizzly', 'guests', 'happy', 'headphones', 'henry', 'history', 'hound',
  'imagination', 'incorrect', 'incorrectly', 'instead', 'integrity', 'introvert',
  'joanne', 'john', 'jumped', 'kitchen', 'know', 'lakers', 'liberty',
  'miserable', 'mission', 'monkeys', 'movie', 'ninth', 'ordered', 'oregon',
  'ostrich', 'outfit', 'overjoyed', 'packet', 'painfullest', 'paragraph',
  'people', 'personification', 'pleasant', 'potter', 'preoccupy',
  'prepositional', 'president', 'pronoun', 'proper', 'pumpkin', 'quiet',
  'recreational', 'referring', 'refutation', 'restaurant', 'restrict', 'river',
  'roberto', 'saturday', 'sentence', 'separate', 'shepherd', 'silverware',
  'sincerely', 'someone', 'spanish', 'spider', 'summertime', 'sunday',
  'testingmom', 'thiefs', 'tunnel', 'uncertainty', 'unnoticeable', 'weekend',
  'weatherman', 'without', 'workers', 'worsened'
];

const FORCED_SPLIT_PAIRS = new Map([
  ['b eautifulest', 'beautifulest'],
  ['capit alized', 'capitalized'],
  ['h e', 'he'],
  ['h er', 'her'],
  ['h is', 'his'],
  ['i f', 'if'],
  ['i n', 'in'],
  ['i s', 'is'],
  ['re ferring', 'referring'],
  ['shou ld', 'should'],
  ['sentenc e', 'sentence'],
  ['t he', 'the'],
  ['t o', 'to'],
  ['t oo', 'too'],
  ['u sed', 'used'],
  ['depressi on', 'depression'],
  ['w ho', 'who'],
  ['w ork', 'work'],
  ['w orkers', 'workers'],
  ['wa s', 'was'],
  ['wh ich', 'which'],
  ['wh o', 'who'],
  ['wh ose', 'whose'],
  ['yo u', 'you'],
  ['you r', 'your']
]);

const LEGITIMATE_TWO_WORD_PHRASES = new Set([
  'a b', 'b c', 'c d', 'd e', 'e f',
  'b and', 'c and', 'd and',
  'i am', 'i can', 'i like', 'i will',
  'long a', 'long e', 'long i', 'long o', 'long u',
  'short a', 'short e', 'short i', 'short o', 'short u',
  'sun rises'
]);

const LETTER_CONTEXT_RE = /\b(long|short|silent|letter|sound|vowel|consonant|ends? in|starts? with|spell(?:ed|ing)?|syllab|prefix|suffix|root|morpheme|capital(?:ized|ization)|lowercase|uppercase|choice [a-d]|option [a-d])\b/i;
const WORD_RE = /[A-Za-z]+(?:[’'][A-Za-z]+)?/g;
const SUFFIXES = ['s', 'es', 'ed', 'ing', 'er', 'est', 'ly', 'ful', 'less', 'ness'];

function buildSplitWordLexicon(bankLoad = loadQuestionBanks({ sourceType: 'json' })) {
  const words = new Set();
  COMMON_WORDS.concat(SHORT_JOIN_WORDS, KNOWN_LEARNER_WORDS).forEach(word => words.add(word));
  loadSystemDictionaryWords().forEach(word => words.add(word));
  flattenQuestions(bankLoad).forEach(record => {
    getQuestionScanFields(record.question).forEach(field => {
      String(field.value || '').match(WORD_RE)?.forEach(token => {
        const word = normalizeWord(token);
        if (word.length >= 3 && !isLikelyFragment(word)) words.add(word);
      });
    });
  });
  return words;
}

function loadSystemDictionaryWords() {
  const words = new Set();
  SYSTEM_DICTIONARY_FILES.forEach(file => {
    if (!fs.existsSync(file)) return;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(word => {
      const normalized = normalizeWord(word);
      if (normalized.length >= 2) words.add(normalized);
    });
  });
  return words;
}

function findSuspiciousSplitWords(bankLoad = loadQuestionBanks({ sourceType: 'json' }), options = {}) {
  const lexicon = options.lexicon || buildSplitWordLexicon(bankLoad);
  const issues = [];
  flattenQuestions(bankLoad).forEach(record => {
    getQuestionScanFields(record.question).forEach(field => {
      findSuspiciousSplitWordsInText(field.value, { lexicon }).forEach(match => {
        issues.push(Object.assign({}, match, {
          file: record.file,
          relativeFile: record.relativeFile,
          setId: record.setId,
          questionId: record.question && record.question.id || '',
          location: `question ${record.questionNumber}${record.question && record.question.id ? ` (${record.question.id})` : ''}`,
          field: field.path
        }));
      });
    });
  });
  return issues;
}

function findSuspiciousSplitWordsInText(value, options = {}) {
  const text = String(value || '');
  if (!text) return [];
  const lexicon = options.lexicon || buildSplitWordLexicon();
  const tokens = tokenizeWords(text);
  const matches = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const leftToken = tokens[index];
    const rightToken = tokens[index + 1];
    const gap = text.slice(leftToken.end, rightToken.start);
    if (!/^ +$/.test(gap)) continue;

    const left = normalizeWord(leftToken.text);
    const right = normalizeWord(rightToken.text);
    const phrase = `${left} ${right}`;
    const forcedReplacement = FORCED_SPLIT_PAIRS.get(phrase);
    if (!forcedReplacement && LEGITIMATE_TWO_WORD_PHRASES.has(phrase)) continue;
    if (!forcedReplacement && isLetterOrSyllableContext(text, leftToken, rightToken)) continue;
    if (!forcedReplacement && isWordLike(left, lexicon) && /^[A-Z]/.test(rightToken.text)) continue;

    const joined = forcedReplacement || `${left}${right}`;
    if (!forcedReplacement && !isSuspiciousFragmentPair(left, right, joined, lexicon)) continue;

    matches.push({
      start: leftToken.start,
      end: rightToken.end,
      splitText: text.slice(leftToken.start, rightToken.end),
      replacement: text.slice(leftToken.start, rightToken.end).replace(gap, ''),
      context: text.slice(Math.max(0, leftToken.start - 45), Math.min(text.length, rightToken.end + 45)).replace(/\s+/g, ' ')
    });
  }

  return chooseNonOverlappingMatches(matches);
}

function repairSuspiciousSplitWordsInText(value, options = {}) {
  let text = String(value || '');
  const allMatches = [];

  for (let pass = 0; pass < 5; pass += 1) {
    const matches = findSuspiciousSplitWordsInText(text, options);
    if (!matches.length) break;

    let repaired = '';
    let cursor = 0;
    matches.forEach(match => {
      repaired += text.slice(cursor, match.start);
      repaired += match.replacement;
      cursor = match.end;
      allMatches.push(match);
    });
    repaired += text.slice(cursor);
    text = repaired;
  }

  return { text, matches: allMatches };
}

function repairJsonQuestionSources(options = {}) {
  const records = options.records || loadJsonSources(options);
  const bankLoad = loadQuestionBanks({
    repoRoot: options.repoRoot || repoRoot,
    sourceType: 'json',
    files: records.map(record => record.file)
  });
  const lexicon = options.lexicon || buildSplitWordLexicon(bankLoad);
  const write = options.write === true;
  const summary = {
    filesChecked: records.length,
    filesChanged: 0,
    questionsChanged: 0,
    replacements: []
  };

  flattenJsonQuestionRecords(records).forEach(record => {
    let questionChanged = false;
    getQuestionScanFields(record.question).forEach(field => {
      const current = getValueAtPath(record.question, field.path);
      if (typeof current !== 'string') return;
      const repaired = repairSuspiciousSplitWordsInText(current, { lexicon });
      if (repaired.text === current) return;
      setValueAtPath(record.question, field.path, repaired.text);
      questionChanged = true;
      repaired.matches.forEach(match => {
        summary.replacements.push({
          file: record.relativeFile,
          setId: record.setId,
          questionId: record.question && record.question.id || '',
          field: field.path,
          splitText: match.splitText,
          replacement: match.replacement
        });
      });
    });
    if (questionChanged) summary.questionsChanged += 1;
  });

  records.forEach(record => {
    if (JSON.stringify(record.source) === JSON.stringify(JSON.parse(record.originalContents))) return;
    summary.filesChanged += 1;
    if (write) writeJsonSource(record);
  });

  return summary;
}

function getQuestionScanFields(question) {
  const fields = [];
  if (typeof (question && question.question) === 'string') fields.push({ path: 'question', value: question.question });
  if (Array.isArray(question && question.choices)) {
    question.choices.forEach((choice, index) => {
      if (typeof choice === 'string') fields.push({ path: `choices.${index}`, value: choice });
    });
  }
  if (question && question.explanation && typeof question.explanation.correct === 'string') {
    fields.push({ path: 'explanation.correct', value: question.explanation.correct });
  }
  if (question && question.explanation && Array.isArray(question.explanation.incorrect)) {
    question.explanation.incorrect.forEach((entry, index) => {
      if (typeof entry === 'string') {
        fields.push({ path: `explanation.incorrect.${index}`, value: entry });
      } else if (entry && typeof entry === 'object') {
        if (typeof entry.choice === 'string') {
          fields.push({ path: `explanation.incorrect.${index}.choice`, value: entry.choice });
        }
        if (typeof entry.reason === 'string') {
          fields.push({ path: `explanation.incorrect.${index}.reason`, value: entry.reason });
        }
      }
    });
  }
  return fields;
}

function isSuspiciousFragmentPair(left, right, joined, lexicon) {
  if (!joined || joined.length < 2 || !isJoinableWord(joined, lexicon)) return false;
  if (isWordLike(left, lexicon) && isWordLike(right, lexicon)) return false;
  if (left.length === 1 || right.length === 1) return true;
  return !isWordLike(left, lexicon) || !isWordLike(right, lexicon);
}

function isJoinableWord(word, lexicon) {
  if (lexicon.has(word)) return true;
  return SUFFIXES.some(suffix => word.endsWith(suffix) && lexicon.has(word.slice(0, -suffix.length)));
}

function isWordLike(word, lexicon) {
  if (!word) return false;
  if (word.length === 1) return true;
  return isJoinableWord(word, lexicon);
}

function isLikelyFragment(word) {
  if (FORCED_SPLIT_PAIRS.has(word)) return true;
  return /^[bcdfghjklmnpqrstvwxyz]$/.test(word) || /^(acc|bec|capit|choic|correc|inc|mov|peo|sentenc|wh|yo)$/.test(word);
}

function isLetterOrSyllableContext(text, leftToken, rightToken) {
  const context = text.slice(
    Math.max(0, leftToken.start - 18),
    Math.min(text.length, rightToken.end + 18)
  );
  return LETTER_CONTEXT_RE.test(context) && (leftToken.text.length === 1 || rightToken.text.length === 1);
}

function chooseNonOverlappingMatches(matches) {
  const chosen = [];
  matches
    .sort((a, b) => a.start - b.start || confidenceScore(b) - confidenceScore(a))
    .forEach(match => {
      const previous = chosen[chosen.length - 1];
      if (!previous || match.start >= previous.end) {
        chosen.push(match);
        return;
      }
      if (confidenceScore(match) > confidenceScore(previous)) chosen[chosen.length - 1] = match;
    });
  return chosen;
}

function confidenceScore(match) {
  const normalized = normalizeWord(match.splitText);
  if (FORCED_SPLIT_PAIRS.has(normalized.replace(/\s+/, ' '))) return 3;
  if (/^[A-Za-z] /.test(match.splitText) || / [A-Za-z]$/.test(match.splitText)) return 2;
  return 1;
}

function tokenizeWords(text) {
  return Array.from(text.matchAll(WORD_RE), match => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length
  }));
}

function normalizeWord(value) {
  return String(value || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z]/g, '');
}

function getValueAtPath(object, dotPath) {
  return dotPath.split('.').reduce((value, key) => value && value[key], object);
}

function setValueAtPath(object, dotPath, nextValue) {
  const parts = dotPath.split('.');
  const key = parts.pop();
  const parent = parts.reduce((value, part) => value && value[part], object);
  if (parent && key !== undefined) parent[key] = nextValue;
}

function formatRepairSummary(summary, write) {
  const action = write ? 'Repaired' : 'Would repair';
  const lines = [
    `${action} ${summary.replacements.length} split-word spacing issue(s) across ${summary.questionsChanged} question(s).`
  ];
  summary.replacements.slice(0, 80).forEach(item => {
    lines.push(`${item.file} | ${item.setId} | ${item.questionId} | ${item.field}: "${item.splitText}" -> "${item.replacement}"`);
  });
  if (summary.replacements.length > 80) {
    lines.push(`... ${summary.replacements.length - 80} additional replacement(s) hidden.`);
  }
  return lines.join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const summary = repairJsonQuestionSources({ write });
  console.log(formatRepairSummary(summary, write));
  if (!write && summary.replacements.length) process.exitCode = 1;
}

module.exports = {
  buildSplitWordLexicon,
  findSuspiciousSplitWords,
  findSuspiciousSplitWordsInText,
  repairJsonQuestionSources,
  repairSuspiciousSplitWordsInText,
  formatRepairSummary
};

if (require.main === module) runCli();
