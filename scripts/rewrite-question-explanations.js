#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  computeContentHash
} = require('./qa/question-metadata');
const {
  loadJsonSources,
  serializeJsonSource,
  writeJsonSource
} = require('./qa/json-source-loader');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/[ \t\r\n]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .trim();
}

function ensurePeriod(value) {
  const text = normalizeWhitespace(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function stripLeadIns(question) {
  return normalizeWhitespace(question)
    .replace(/^Grade\s+\d+\s+(Easy|Medium|Hard):\s*/i, '')
    .replace(/^Choose the best answer\.\s*/i, '')
    .replace(/^Analyze the details and choose the strongest answer\.\s*/i, '')
    .replace(/^Read (the|this) (passage|story|poem)\.\s*/i, '');
}

function quote(value) {
  return `"${displayText(value)}"`;
}

function labelChoice(label, value) {
  const text = displayText(value);
  return `${label}: ${text}${/[.!?]["'”’]?$/.test(text) ? '' : '.'}`;
}

function displayText(value) {
  return normalizeWhitespace(value)
    .replace(/([^.\s])\.\.(?=\s|$)/g, '$1.')
    .replace(/\s+\.\.\./g, ' ...');
}

function lowerFirst(value) {
  const text = normalizeWhitespace(value);
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : '';
}

function trimLong(value, max = 170) {
  const text = normalizeWhitespace(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max - 1)}...`;
}

function cleanExistingRationale(value, choice) {
  let text = normalizeWhitespace(value);
  if (!text) return '';
  text = text
    .replace(/^Answer:\s*/i, '')
    .replace(/^Correct:\s*/i, '')
    .replace(/^Not:\s*/i, '');
  const normalizedChoice = normalizeWhitespace(choice);
  if (normalizedChoice) {
    text = text.replace(new RegExp(`^${escapeRegExp(normalizedChoice)}\\.?\\s*`, 'i'), '');
  }
  text = text.replace(/^[-:;]\s*/, '');
  if (isGenericRationale(text)) return '';
  return text;
}

function isGenericRationale(value) {
  const text = normalizeWhitespace(value);
  if (!text) return true;
  return /^(check|try again|incorrect|wrong|not quite|this is incorrect)\b/i.test(text) ||
    /check the (grammar|rule|clue|usage|question)/i.test(text) ||
    /does not match the rules? for/i.test(text) ||
    /leaves a capitalization, punctuation, spelling, grammar, or meaning error/i.test(text);
}

function getRule(question) {
  const inferred = getInferredRule(question);
  if (inferred) return inferred;
  const studyAid = question.studyAid || {};
  const definition = normalizeWhitespace(studyAid.definition);
  const example = normalizeWhitespace(studyAid.example);
  if (definition && definition.length <= 220) return definition;
  if (example && example.length <= 220) return example;
  if (definition) return trimLong(definition, 220);
  if (example) return trimLong(example, 220);
  return 'The best answer must match the exact clue in the question.';
}

function getInferredRule(question) {
  const prompt = stripLeadIns(question.question || '');
  const skillText = getSkillText(question);
  if (/contraction/.test(skillText)) {
    return 'A contraction combines words and uses an apostrophe to show where letters were left out.';
  }
  if (/belongs to\s+[A-Z]/i.test(prompt) || /apostrophe|possessive/.test(skillText)) {
    return 'For singular possession, add apostrophe + s to the one person or thing that owns something.';
  }
  if (/capital/.test(skillText) || /\bcapitalized\b/i.test(prompt)) {
    return 'Capitalize proper nouns, names, titles used with names, and the first word of a sentence; keep ordinary common nouns lowercase.';
  }
  if (/double-negative|double negatives/.test(skillText)) {
    return 'In Standard English, use one negative idea in a sentence instead of pairing a negative with hardly, scarcely, no, or never.';
  }
  if (/verb|tense/.test(skillText)) {
    return 'Choose the verb form that matches the time clue, helping verb, and subject in the sentence.';
  }
  if (/plural|singular/.test(skillText)) {
    return 'A plural noun names more than one; regular plurals often add s or es, while irregular plurals use special forms.';
  }
  return '';
}

function getSkillText(question) {
  const metadata = question.metadata || {};
  return [
    ...(Array.isArray(metadata.skills) ? metadata.skills : []),
    ...(Array.isArray(metadata.skillIds) ? metadata.skillIds : []),
    metadata.sourceSet || ''
  ].join(' ').toLowerCase();
}

function promptFocus(question) {
  const prompt = stripLeadIns(question.question || '');
  const beforeQuote = prompt.split('"')[0].trim();
  if (/which/i.test(beforeQuote)) return lowerFirst(beforeQuote.replace(/\?$/, ''));
  if (/what/i.test(beforeQuote)) return lowerFirst(beforeQuote.replace(/\?$/, ''));
  if (/choose/i.test(beforeQuote)) return lowerFirst(beforeQuote.replace(/\?$/, ''));
  return lowerFirst(trimLong(beforeQuote || prompt, 130).replace(/\?$/, ''));
}

function asksForBadChoice(question) {
  const prompt = stripLeadIns(question.question || '');
  return /\b(which|what|choose|identify)\b[\s\S]{0,100}\b(NOT|not|incorrectly|incorrect|error|mistake|does not belong|does NOT belong|least)\b/.test(prompt) &&
    !/\bfact,\s+not an opinion\b/i.test(prompt);
}

function articleReason(choice, correctChoice, question, isCorrect) {
  const prompt = question.question || '';
  const blankTail = (prompt.match(/___\s+([^.'"?]+)/) || [])[1] || '';
  const nextWord = normalizeWhitespace(blankTail).split(/\s+/)[0] || 'the next word';
  if (isCorrect) {
    return `${quote(correctChoice)} fits before ${quote(nextWord)} because the article must match the sound that begins the next word.`;
  }
  if (/^a$/i.test(choice)) return `${quote(choice)} is used before consonant sounds, so it does not fit before ${quote(nextWord)} here.`;
  if (/^an$/i.test(choice)) return `${quote(choice)} is used before vowel sounds, so it does not fit the sound needed here.`;
  if (/^the$/i.test(choice)) return `${quote(choice)} points to a specific noun, but this sentence needs the indefinite article ${quote(correctChoice)}.`;
  return `${quote(choice)} leaves out the article that the sentence needs before ${quote(nextWord)}.`;
}

function possessiveReason(choice, correctChoice, question, isCorrect) {
  const prompt = question.question || '';
  const owner = (prompt.match(/belongs to\s+([A-Z][A-Za-z'-]*)/i) || [])[1] ||
    (correctChoice.match(/\b(?:The|A|An)\s+([A-Za-z]+)[’']s\s+/i) || [])[1] ||
    (correctChoice.match(/^([A-Z][A-Za-z'-]+)[’']s\b/) || [])[1] ||
    'the owner';
  const owned = (correctChoice.match(/[’']s\s+([A-Za-z]+)\b/) || [])[1] || 'the thing owned';
  if (isCorrect) {
    return `The prompt names one owner, ${owner}, so the singular possessive form adds apostrophe + s to the owner: ${quote(correctChoice)} shows that ${owned} belongs to ${owner}.`;
  }
  if (/[’']s\s+\w+(?:ed|ing)\b/i.test(choice) || /[’']s\s+(?:a|an|the|not|parked|going)\b/i.test(choice)) {
    return `${quote(choice)} uses apostrophe + s like a contraction for "is" or "has," not as a possessive noun showing ownership.`;
  }
  if (/[’']s\s+(?:by|at|in|on|for|to|with)\b/i.test(choice)) {
    return `${quote(choice)} uses apostrophe + s where the sentence needs a regular noun form, so it does not clearly show ownership.`;
  }
  if (new RegExp(`${escapeRegExp(owner)}s[’']s`, 'i').test(choice)) {
    return `${quote(choice)} adds an extra s before the apostrophe, making the owner look like ${quote(`${owner}s`)} instead of ${quote(owner)}.`;
  }
  if (/[A-Za-z]s[’']\b/.test(choice)) {
    return `${quote(choice)} puts the apostrophe after an s, which usually marks plural possession; the prompt names one ${owner}, not several owners.`;
  }
  if (/\b\w+s\b/.test(choice) && !/[’']/.test(choice)) {
    return `${quote(choice)} adds an s but no apostrophe to the owner, so it looks plural instead of possessive.`;
  }
  if (/[’']$/.test(choice) || /\w+s[’']\b/.test(choice.split(/\s+/).slice(1).join(' '))) {
    return `${quote(choice)} places possession on the thing being owned instead of on ${owner}, the owner named in the question.`;
  }
  return `${quote(choice)} does not form the singular possessive of ${owner}; the apostrophe + s belongs on the owner before ${owned}.`;
}

function contractionReason(choice, correctChoice, question, isCorrect) {
  const rule = getRule(question);
  if (isCorrect) return `${quote(correctChoice)} is the correct contraction because the apostrophe marks the letters left out when the two words are combined.`;
  if (!/[’']/.test(choice)) return `${quote(choice)} is missing the apostrophe that contractions need to show omitted letters.`;
  if ((choice.match(/[’']/g) || []).length > 1) return `${quote(choice)} uses too many apostrophes; a contraction needs one apostrophe in the correct spot.`;
  return `${quote(choice)} puts the apostrophe in the wrong place for this contraction. ${rule}`;
}

function punctuationReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const expected = (correctChoice.match(/[.!?]$/) || correctChoice.match(/[:,;]/) || ['punctuation'])[0];
  if (isCorrect) {
    return `${quote(correctChoice)} uses the punctuation the sentence needs. The mark ${quote(expected)} matches the purpose or structure asked for in the question.`;
  }
  const mark = (choice.match(/[.!?]$/) || choice.match(/[:,;]/) || ['no correct punctuation'])[0];
  if (/question/i.test(prompt) || correctChoice.endsWith('?')) {
    return `${quote(choice)} uses ${quote(mark)}, but the sentence is a direct question and needs a question mark.`;
  }
  if (/comma|series|date|address|dialogue/i.test(prompt)) {
    return `${quote(choice)} puts commas in the wrong place or leaves out a comma needed by the pattern in the question.`;
  }
  if (/semicolon/i.test(prompt)) {
    return `${quote(choice)} does not use a semicolon to join two complete, closely related thoughts.`;
  }
  if (/quotation|dialogue/i.test(prompt)) {
    return `${quote(choice)} does not keep the spoken words and dialogue punctuation in the correct places.`;
  }
  return `${quote(choice)} uses ${quote(mark)}, but the sentence needs ${quote(expected)} to match the rule being tested.`;
}

function capitalizationDiffReason(choice, correctChoice, isCorrect) {
  if (isCorrect) return `${quote(correctChoice)} follows the capitalization rule and keeps ordinary words lowercase.`;
  const choiceWords = wordsWithCase(choice);
  const correctWords = wordsWithCase(correctChoice);
  const notes = [];
  const max = Math.min(choiceWords.length, correctWords.length);
  for (let i = 0; i < max; i += 1) {
    const a = choiceWords[i];
    const b = correctWords[i];
    if (a.lower !== b.lower) continue;
    if (a.word !== b.word) {
      if (/^[A-Z]/.test(b.word) && /^[a-z]/.test(a.word)) notes.push(`${quote(a.word)} should be capitalized as ${quote(b.word)}`);
      else if (/^[a-z]/.test(b.word) && /^[A-Z]/.test(a.word)) notes.push(`${quote(a.word)} should stay lowercase as ${quote(b.word)}`);
    }
    if (notes.length >= 2) break;
  }
  if (notes.length) return `${quote(choice)} is not correct because ${notes.join(' and ')}.`;
  return `${quote(choice)} does not match the capitalization pattern required by the sentence or title.`;
}

function wordsWithCase(value) {
  return normalizeWhitespace(value)
    .match(/[A-Za-z][A-Za-z.'-]*/g)?.map(word => ({ word, lower: word.toLowerCase() })) || [];
}

function spellingReason(choice, correctChoice, isCorrect) {
  if (isCorrect) return `${quote(correctChoice)} is the standard spelling; every needed letter is in the right order.`;
  return `${quote(choice)} changes, adds, or leaves out letters from the standard spelling ${quote(correctChoice)}.`;
}

function readingReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the choice the prompt asks for because it is the one that does not fit the category, evidence, or reading task.`
      : `${quote(correctChoice)} matches the strongest evidence in the passage or prompt, not just a related word.`;
  }
  return bad
    ? `${quote(choice)} actually fits the category, evidence, or reading task, so it is not the choice the prompt asks you to find.`
    : `${quote(choice)} is not supported as strongly by the passage or prompt; it either focuses on the wrong detail or adds an idea the text does not prove.`;
}

function grammarReason(choice, correctChoice, question, isCorrect) {
  const prompt = stripLeadIns(question.question || '');
  const skillText = getSkillText(question);
  const bad = asksForBadChoice(question);
  if (/\b(prefix|suffix|root|base word|means)\b/i.test(prompt)) {
    return vocabularyReason(choice, correctChoice, question, isCorrect);
  }
  if (/article/.test(skillText)) return articleReason(choice, correctChoice, question, isCorrect);
  if (/double-negative|double negatives/.test(skillText)) {
    if (isCorrect) return bad ? `${quote(correctChoice)} is the sentence the prompt asks for because it contains more than one negative idea.` : `${quote(correctChoice)} uses only one negative idea, which is the Standard English form.`;
    return bad ? `${quote(choice)} does not contain the double-negative error the prompt asks you to find.` : `${quote(choice)} uses two negative ideas together or otherwise breaks the Standard English negative pattern.`;
  }
  if (/pronoun/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} uses the pronoun case and agreement needed by its job in the sentence.`;
    return `${quote(choice)} uses a pronoun form that does not match the noun, number, or sentence job required here.`;
  }
  if (/plural|singular|irregular nouns/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the singular/plural noun rule the prompt is testing.`;
    return bad ? `${quote(choice)} is a correct noun form, so it is not the incorrect or non-plural choice the prompt asks for.` : `${quote(choice)} does not use the correct singular or plural noun form for this sentence.`;
  }
  if (/verb|tense|agreement/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the verb form, tense, and subject needed by the sentence.`;
    return bad ? `${quote(choice)} keeps the verb pattern acceptable, so it is not the verb error the prompt asks you to find.` : `${quote(choice)} does not match the tense, helping verb, or subject-verb pattern required here.`;
  }
  if (/sentence types|identify-sentence|sentence-combinations|run-on|clause|compound|complex/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} has the sentence structure the prompt asks for and expresses a complete, correctly connected thought.`;
    return `${quote(choice)} does not have the sentence structure the prompt asks for; it is incomplete, incorrectly joined, or a different sentence type.`;
  }
  if (/parts-of-speech|noun|adjective|adverb|preposition|conjunction|subject-predicate|appositive/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} names the word or phrase doing the grammar job asked about in the sentence.`;
    return `${quote(choice)} points to a word or phrase with a different grammar job from the one the question asks for.`;
  }
  if (/which claim is clear for an opinion paragraph\?/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} takes a position and states what someone should think or do, so it is an opinion that can be supported with reasons.`;
    return `${quote(choice)} is a fact, a broad topic, or a statement that does not take a position, so it is not an opinion claim to support with reasons.`;
  }
  if (/formal|informal|paragraph|opinion|persuasive|informative|narrative|revising|editing|writing/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} best fits the writing purpose in the prompt because it is clear, precise, and focused on the topic.`;
    return `${quote(choice)} does not fit the writing purpose as well; it is too vague, off topic, too informal, or not the requested sentence part.`;
  }
  if (/sentence-correction|correction/.test(skillText) || /^choose the best correction/i.test(prompt)) {
    if (isCorrect) return `${quote(correctChoice)} fixes the sentence while keeping the intended meaning clear.`;
    return `${quote(choice)} still leaves a grammar, capitalization, punctuation, spelling, or meaning problem in the sentence.`;
  }
  if (bad && isCorrect) return `${quote(correctChoice)} is the choice with the error or mismatch the prompt asks you to find.`;
  if (bad) return `${quote(choice)} follows the rule well enough, so it is not the error or mismatch the prompt asks for.`;
  if (isCorrect) return `${quote(correctChoice)} matches the grammar clue in the question and follows the rule for this sentence.`;
  return `${quote(choice)} does not match the grammar clue in ${quote(trimLong(prompt, 120))}; compare its form with the rule used by the correct answer.`;
}

function vocabularyReason(choice, correctChoice, question, isCorrect) {
  const skillText = getSkillText(question);
  const bad = asksForBadChoice(question);
  if (/homophone/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} has the meaning needed in the sentence; homophones can sound alike, so the context decides the word.`;
    return `${quote(choice)} may sound similar, but its meaning does not fit the sentence context.`;
  }
  if (/rhym/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} has the same ending sound as the target word, so it rhymes.`;
    return `${quote(choice)} does not share the same ending sound as the target word.`;
  }
  if (/synonym|antonym|shades/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the meaning relationship the prompt asks for.`;
    return `${quote(choice)} has a different meaning or strength, so it does not match the requested synonym, antonym, or shade of meaning.`;
  }
  if (/context|multiple-meaning/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} fits the context clues in the sentence, so it gives the intended meaning.`;
    return `${quote(choice)} does not fit the context clues around the word.`;
  }
  if (/spelling/.test(skillText)) return spellingReason(choice, correctChoice, isCorrect);
  if (/syllable/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} matches the number of beats you hear when the word is divided into syllables.`;
    return `${quote(choice)} gives the wrong number of syllable beats for the word.`;
  }
  if (/prefix|suffix|base|root/.test(skillText)) {
    if (isCorrect) return `${quote(correctChoice)} correctly separates the meaningful word parts asked for in the prompt.`;
    return `${quote(choice)} splits the word parts incorrectly or gives a meaning that does not match the root, prefix, or suffix.`;
  }
  if (bad && isCorrect) return `${quote(correctChoice)} is the word or category that does not fit, which is exactly what the prompt asks for.`;
  if (bad) return `${quote(choice)} fits the word pattern or category, so it is not the odd one out.`;
  if (isCorrect) return `${quote(correctChoice)} matches the word meaning, spelling pattern, or word relationship asked for in the prompt.`;
  return `${quote(choice)} does not match the meaning, spelling pattern, or word relationship needed here.`;
}

function referenceReason(choice, correctChoice, question, isCorrect) {
  const bad = asksForBadChoice(question);
  if (isCorrect) {
    return bad
      ? `${quote(correctChoice)} is the item that does not fit the reference-skill task in the prompt.`
      : `${quote(correctChoice)} names the reference feature or study skill that the prompt describes.`;
  }
  return bad
    ? `${quote(choice)} fits the reference-skill task, so it is not the exception the prompt asks for.`
    : `${quote(choice)} names a different reference feature or study skill than the one described in the prompt.`;
}

function domainReason(choice, correctChoice, question, domain, isCorrect) {
  const skillText = getSkillText(question);
  if (/contraction/.test(skillText)) return contractionReason(choice, correctChoice, question, isCorrect);
  if (/apostrophe|possessive/.test(skillText)) return possessiveReason(choice, correctChoice, question, isCorrect);
  if (/punctuation|comma|period|quotation|colon|semicolon|abbreviation/.test(skillText) || domain === 'punctuation') {
    return punctuationReason(choice, correctChoice, question, isCorrect);
  }
  if (/capital/.test(skillText) || domain === 'capitalization') return capitalizationDiffReason(choice, correctChoice, isCorrect);
  if (domain === 'reading-comprehension') return readingReason(choice, correctChoice, question, isCorrect);
  if (domain === 'vocabulary') return vocabularyReason(choice, correctChoice, question, isCorrect);
  if (domain === 'reference-skills') return referenceReason(choice, correctChoice, question, isCorrect);
  return grammarReason(choice, correctChoice, question, isCorrect);
}

function buildCorrectExplanation(question, domain) {
  const correctChoice = question.choices[question.correct];
  const rule = getRule(question);
  const reason = domainReason(correctChoice, correctChoice, question, domain, true);
  return `${labelChoice('Answer', correctChoice)} Rule or clue: ${ensurePeriod(rule)} ${ensurePeriod(reason)}`;
}

function buildWrongExplanation(question, domain, index) {
  if (index === question.correct) return '';
  const choice = question.choices[index];
  const correctChoice = question.choices[question.correct];
  const generated = domainReason(choice, correctChoice, question, domain, false);
  return `${labelChoice('Not', choice)} ${ensurePeriod(generated)}`;
}

function rewriteQuestion(question, domain) {
  if (!question || !Array.isArray(question.choices)) return false;
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.choices.length) return false;
  const before = JSON.stringify(question.explanation || {});
  const explanation = {
    correct: buildCorrectExplanation(question, domain),
    incorrect: question.choices.map((_, index) => buildWrongExplanation(question, domain, index))
  };
  question.explanation = explanation;
  const after = JSON.stringify(explanation);
  if (before === after) return false;
  question.version = Number.isInteger(Number(question.version)) ? Number(question.version) + 1 : 2;
  question.contentHash = computeContentHash(question);
  return true;
}

function rewriteSources(options = {}) {
  const records = options.records || loadJsonSources(options);
  const write = options.write === true;
  const summary = {
    filesChecked: records.length,
    filesChanged: 0,
    questionsChanged: 0,
    totalQuestions: 0,
    changedFiles: []
  };

  records.forEach(record => {
    const before = serializeJsonSource(record.source);
    const domain = record.domain || record.source.domain || path.basename(record.file, '.json');
    Object.values(record.source.sets || {}).forEach(set => {
      (set.questions || []).forEach(question => {
        summary.totalQuestions += 1;
        if (rewriteQuestion(question, domain)) summary.questionsChanged += 1;
      });
    });
    const after = serializeJsonSource(record.source);
    if (before !== after) {
      summary.filesChanged += 1;
      summary.changedFiles.push(record.relativeFile || record.file);
      if (write) writeJsonSource(record);
    }
  });

  return summary;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const summary = rewriteSources({ write });
  const action = write ? 'Updated' : 'Would update';
  console.log(`Reviewed ${summary.totalQuestions} questions across ${summary.filesChecked} source file(s).`);
  console.log(`${action} explanations for ${summary.questionsChanged} question(s) in ${summary.filesChanged} file(s).`);
  if (!write && summary.questionsChanged > 0) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  rewriteQuestion,
  rewriteSources
};
