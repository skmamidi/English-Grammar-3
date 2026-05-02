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
const {
  loadSkillTaxonomy,
  validateQuestionSkillTags
} = require('./question-skill-taxonomy');
const {
  buildSourceAttributionReport
} = require('../reports/source-attribution');
const {
  evaluateSourceLicenses
} = require('./source-license-qa');

function validateContent(options = {}) {
  const bankLoad = loadQuestionBanks(options);
  return validateLoadedContent(bankLoad, options);
}

function validateLoadedContent(bankLoad, options = {}) {
  const issues = [];
  const taxonomy = options.taxonomy || loadSkillTaxonomy();
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
  questions.forEach(record => validateQuestion(record, issues, taxonomy));
  validateUniqueQuestionKeys(sets, issues);
  validateStableQuestionIdentity(sets, issues);
  runContentQualityRules(sets, questions, issues, options);
  if (options.sourceGovernance) runSourceGovernanceChecks(bankLoad, issues, options);

  return {
    bankLoad,
    sets,
    questions,
    issues,
    errors: issues.filter(issue => issue.level === 'error'),
    warnings: issues.filter(issue => issue.level === 'warning'),
    explanationReviewCandidates: options.explanationReviewCandidates ? buildExplanationReviewCandidates(questions, issues) : undefined,
    sizeSummary: getBankSizeSummary(bankLoad)
  };
}

function runSourceGovernanceChecks(bankLoad, issues, options = {}) {
  const attribution = buildSourceAttributionReport({ bankLoad });
  attribution.warnings.forEach(warning => {
    addIssue(
      issues,
      'warning',
      '',
      warning.setId,
      warning.questionId,
      `Source attribution metadata is missing ${warning.field}.`,
      warning.ruleId,
      warning.questionId
    );
  });
  const license = evaluateSourceLicenses({
    bankLoad,
    policy: options.sourceLicensePolicy
  });
  license.warnings.forEach(warning => {
    addIssue(
      issues,
      'warning',
      '',
      warning.setId,
      warning.questionId,
      `Source license metadata needs review for "${warning.sourceFile || 'missing source'}".`,
      warning.ruleId,
      warning.questionId
    );
  });
  license.errors.forEach(error => {
    addIssue(
      issues,
      'error',
      '',
      error.setId,
      error.questionId,
      `Source license blocks publication for "${error.sourceFile}".`,
      error.ruleId,
      error.questionId
    );
  });
}

const QUALITY_RULES = [{
  id: 'duplicate-prompt-in-set',
  defaultSeverity: 'warning',
  scope: 'set',
  run(record, issues) {
    const seen = new Map();
    getQuestions(record).forEach((question, index) => {
      const prompt = normalizeText(question && question.question);
      if (!prompt) return;
      if (seen.has(prompt)) {
        addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, index), `Prompt duplicates question ${seen.get(prompt)} in this set.`, this.id, getQuestionId(question));
      } else {
        seen.set(prompt, index + 1);
      }
    });
  }
}, {
  id: 'duplicate-prompt-and-choices-in-domain',
  defaultSeverity: 'warning',
  scope: 'domain',
  run(sets, issues) {
    const seen = new Map();
    sets.forEach(record => {
      getQuestions(record).forEach((question, index) => {
        const choicesKey = Array.isArray(question && question.choices)
          ? question.choices.map(normalizeText).join('|')
          : '';
        const key = `${record.domain}::${normalizeText(question && question.question)}::${choicesKey}`;
        if (!choicesKey || key.includes('::::')) return;
        const location = `${record.relativeFile} | ${record.setId} | ${questionLocation(question, index)}`;
        if (seen.has(key)) {
          addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, index), `Prompt and choices duplicate ${seen.get(key)}.`, this.id, getQuestionId(question));
        } else {
          seen.set(key, location);
        }
      });
    });
  }
}, {
  id: 'empty-choice',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    if (!Array.isArray(question.choices)) return;
    question.choices.forEach((choice, index) => {
      if (typeof choice === 'string' && !choice.trim()) {
        addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), `Choice ${index + 1} is empty.`, this.id, getQuestionId(question));
      }
    });
  }
}, {
  id: 'duplicate-choice',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    if (!Array.isArray(question.choices)) return;
    const seen = new Map();
    question.choices.forEach((choice, index) => {
      const normalized = normalizeChoiceText(choice);
      if (!normalized) return;
      if (seen.has(normalized)) {
        addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), `Choice ${index + 1} repeats choice ${seen.get(normalized)}.`, this.id, getQuestionId(question));
      } else {
        seen.set(normalized, index + 1);
      }
    });
  }
}, {
  id: 'duplicate-correct-answer-text',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    if (!Array.isArray(question.choices) || !Number.isInteger(question.correct)) return;
    const correctText = normalizeChoiceText(question.choices[question.correct]);
    if (!correctText) return;
    const duplicateIndexes = question.choices
      .map((choice, index) => ({ choice, index }))
      .filter(item => item.index !== question.correct && normalizeChoiceText(item.choice) === correctText)
      .map(item => item.index + 1);
    if (duplicateIndexes.length) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), `Correct answer text is duplicated at choice ${duplicateIndexes.join(', ')}.`, this.id, getQuestionId(question));
    }
  }
}, {
  id: 'split-possessive-owner-name',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    if (!Array.isArray(question.choices) || !Number.isInteger(question.correct)) return;
    const ownerName = getBelongsToOwnerName(question.question);
    if (!ownerName) return;
    const correctText = String(question.choices[question.correct] || '');
    if (buildPossessiveOwnerRegExp(ownerName).test(correctText)) return;
    addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), `Correct choice should keep the single-word owner name "${ownerName}" contiguous before the possessive apostrophe.`, this.id, getQuestionId(question));
  }
}, {
  id: 'isolated-word-pattern-cue',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    if (!Array.isArray(question.choices) || !Number.isInteger(question.correct)) return;
    const cue = getWordPatternCue(question.question);
    if (!cue) return;
    const matchingIndexes = question.choices
      .map((choice, index) => cue.choiceHasCue(choice) ? index : -1)
      .filter(index => index >= 0);
    if (matchingIndexes.length === 1 && matchingIndexes[0] === question.correct) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), `Only the correct answer contains the visible cue "${cue.label}", making the word-pattern item too easy to eliminate.`, this.id, getQuestionId(question));
    }
  }
}, {
  id: 'missing-underlined-choice-target',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    const prompt = String(question.question || '');
    if (!isChoiceBasedUnderlinedPrompt(prompt)) return;
    if (getUnderlineChoiceTargets(prompt, question.choices).length) return;
    addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), 'Prompt refers to underlined word choices, but none of the answer choices can be found in the sentence for underlining.', this.id, getQuestionId(question));
  }
}, {
  id: 'claim-explanation-specificity',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    if (!/which claim is clear for an opinion paragraph\?/i.test(String(question.question || ''))) return;
    const explanation = question.explanation || {};
    const correctText = normalizeText(explanation.correct);
    const incorrect = Array.isArray(explanation.incorrect) ? explanation.incorrect.map(normalizeText) : [];
    const wrongExplanations = incorrect.filter(Boolean);
    const hasSpecificCorrect = /\b(takes? a position|states? what.+should|opinion that can be supported|can be supported with reasons)\b/i.test(correctText);
    const genericWrong = wrongExplanations.some(text =>
      /^not\b.*\ba claim states a clear opinion or position\.?$/i.test(text) ||
      !/\b(fact|topic|reports?|does not take|not a position|not an opinion|support with reasons)\b/i.test(text)
    );
    if (!hasSpecificCorrect || genericWrong) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), 'Claim/opinion explanations must explain why the correct answer takes a position and why each wrong choice is a fact, broad topic, report, or otherwise not a supportable position.', this.id, getQuestionId(question));
    }
  }
}, {
  id: 'placeholder-text',
  defaultSeverity: 'warning',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    const fields = [
      question.question,
      ...(Array.isArray(question.choices) ? question.choices : []),
      question.explanation && question.explanation.correct,
      ...(question.explanation && Array.isArray(question.explanation.incorrect) ? question.explanation.incorrect : [])
    ];
    if (fields.some(value => /\b(todo|tbd|lorem|insert)\b/i.test(String(value || '')))) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), 'Question contains placeholder text.', this.id, getQuestionId(question));
    }
  }
}, {
  id: 'excessive-whitespace',
  defaultSeverity: 'warning',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    const fields = [question.question, ...(Array.isArray(question.choices) ? question.choices : [])];
    if (fields.some(value => /\s{3,}|\n\s*\n/.test(String(value || '')))) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), 'Question text contains excessive whitespace.', this.id, getQuestionId(question));
    }
  }
}, {
  id: 'weak-explanation-rationale',
  defaultSeverity: 'warning',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    const explanation = question.explanation || {};
    const correct = normalizeText(explanation.correct);
    const incorrect = Array.isArray(explanation.incorrect) ? explanation.incorrect.map(normalizeText) : [];
    const weakCorrect = correct.length < 24 || /^(correct|yes|right|good job|that's correct)\.?$/.test(correct);
    const repeatedIncorrect = incorrect.some(item => item && item === correct);
    const weakIncorrect = incorrect.some(item => item && item.length < 16);
    if (weakCorrect || repeatedIncorrect || weakIncorrect) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), 'Explanation should give answer-specific rationale for correct and incorrect choices.', this.id, getQuestionId(question));
    }
  }
}, {
  id: 'generic-explanation-rationale',
  defaultSeverity: 'error',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    const explanation = question.explanation || {};
    const explanationTexts = [
      explanation.correct,
      ...(Array.isArray(explanation.incorrect) ? explanation.incorrect : [])
    ].filter(Boolean);
    const generic = explanationTexts.find(text =>
      /\bIt does not match the context clue\.?$/i.test(String(text || '')) ||
      /\bIt does not share the target ending sound\.?$/i.test(String(text || ''))
    );
    if (generic) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), 'Explanation uses a generic rationale; name the sentence clue, sound, or rule that makes this specific choice right or wrong.', this.id, getQuestionId(question));
    }
  }
}, {
  id: 'overlong-choice',
  defaultSeverity: 'warning',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    if (!Array.isArray(question.choices)) return;
    const longChoice = question.choices.find(choice => String(choice || '').length > 180);
    if (longChoice) {
      addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), 'Choice text is very long and may be hard to scan on mobile.', this.id, getQuestionId(question));
    }
  }
}, {
  id: 'unsupported-visual-metadata',
  defaultSeverity: 'warning',
  scope: 'question',
  run(record, issues) {
    const question = record.question || {};
    ['visual', 'visualMetadata', 'media'].forEach(field => {
      if (Object.hasOwn(question, field)) {
        addIssue(issues, this.defaultSeverity, record.file, record.setId, questionLocation(question, record.questionNumber - 1), `Unsupported visual metadata field "${field}" should use visualScene or generatedVisualScene.`, this.id, getQuestionId(question));
      }
    });
  }
}];

function runContentQualityRules(sets, questions, issues, options = {}) {
  const severityByRule = options.ruleSeverity || {};
  QUALITY_RULES.forEach(rule => {
    const activeRule = Object.assign({}, rule, {
      defaultSeverity: severityByRule[rule.id] || rule.defaultSeverity
    });
    if (rule.scope === 'set') {
      sets.forEach(record => activeRule.run(record, issues));
    } else if (rule.scope === 'question') {
      questions.forEach(record => activeRule.run(record, issues));
    } else if (rule.scope === 'domain') {
      activeRule.run(sets, issues);
    }
  });
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

function validateQuestion(record, issues, taxonomy) {
  const question = record.question || {};
  const location = questionLocation(question, record.questionNumber - 1);
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
  const taxonomyResult = validateQuestionSkillTags({
    question,
    domain: record.domain,
    setId: record.setId,
    taxonomy
  });
  taxonomyResult.errors.forEach(error => {
    addIssue(issues, 'error', record.file, record.setId, location, error, 'question-skill-taxonomy', getQuestionId(question));
  });
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

function getQuestions(record) {
  return Array.isArray(record.set && record.set.questions) ? record.set.questions : [];
}

function getQuestionId(question) {
  return question && typeof question.id === 'string' ? question.id : '';
}

function questionLocation(question, zeroBasedIndex) {
  const id = getQuestionId(question);
  const base = `question ${zeroBasedIndex + 1}`;
  return id ? `${base} (${id})` : base;
}

function questionSupportsGrade(question, grade) {
  const levels = question.metadata && question.metadata.gradeLevels;
  return !levels || levels.map(String).includes(String(grade));
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeChoiceText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getBelongsToOwnerName(prompt) {
  const match = String(prompt || '').match(/\bbelongs to ([A-Z][A-Za-z'-]+)\?/);
  return match ? match[1] : '';
}

function buildPossessiveOwnerRegExp(ownerName) {
  return new RegExp(`^${escapeRegExp(ownerName)}[’']s(?=\\b|\\s|$)`);
}

function getWordPatternCue(prompt) {
  const text = String(prompt || '');
  if (!/\bwhich\s+word\b/i.test(text)) return null;
  if (/\br-controlled\s+vowel\b/i.test(text)) {
    return {
      label: 'r',
      choiceHasCue: choice => /r/i.test(String(choice || ''))
    };
  }
  const vowelTeam = text.match(/\bvowel\s+team\s+([a-z]{2,})\b/i);
  if (vowelTeam) {
    const pattern = vowelTeam[1].toLowerCase();
    return {
      label: pattern,
      choiceHasCue: choice => String(choice || '').toLowerCase().includes(pattern)
    };
  }
  const soundSpelling = text.match(/\buses?\s+([a-z]{2,})\s+to\s+spell\b/i);
  if (soundSpelling) {
    const pattern = soundSpelling[1].toLowerCase();
    return {
      label: pattern,
      choiceHasCue: choice => String(choice || '').toLowerCase().includes(pattern)
    };
  }
  return null;
}

function isChoiceBasedUnderlinedPrompt(prompt) {
  const text = String(prompt || '');
  if (!/\bwhich\b[\s\S]{0,80}\bunderlined\s+wo\s*rds?\b/i.test(text)) return false;
  if (/\b(used in place|replace|same meaning|means?|meaning|definition|synonym|antonym)\b/i.test(text)) return false;
  const searchText = getUnderlineSearchText(text);
  return /\w/.test(searchText);
}

function getUnderlineChoiceTargets(prompt, choices) {
  const body = getUnderlineSearchText(prompt);
  const seen = new Set();
  return (Array.isArray(choices) ? choices : [])
    .flatMap(getUnderlineChoiceCandidates)
    .filter(choice => choice && !/^correct as is\.?$/i.test(choice) && choice.length <= 80)
    .filter(choice => {
      const key = normalizeChoiceText(choice).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return buildFlexibleWordRegExp(choice).test(body);
    });
}

function getUnderlineSearchText(prompt) {
  const text = String(prompt || '');
  const questionIndex = text.indexOf('?');
  return questionIndex >= 0 ? text.slice(questionIndex + 1) : text;
}

function getUnderlineChoiceCandidates(choice) {
  const text = normalizeChoiceText(choice);
  if (!text) return [];
  const parts = text.split(/\s*,\s*/).map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.concat(text) : [text];
}

function buildFlexibleWordRegExp(value) {
  const pattern = normalizeChoiceText(value)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(`(^|(?<=\\W))${pattern}(?=$|\\W)`, 'i');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addIssue(issues, level, file, setId, location, message, ruleId = '', questionId = '') {
  issues.push({
    level,
    ruleId,
    file,
    relativeFile: file ? path.relative(repoRoot, file) : '',
    setId,
    questionId,
    location,
    message
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function runCli() {
  const wantsJson = process.argv.includes('--json');
  const result = validateContent({ explanationReviewCandidates: wantsJson });
  if (wantsJson) {
    console.log(JSON.stringify({
      errors: result.errors,
      warnings: result.warnings,
      explanationReviewCandidates: result.explanationReviewCandidates
    }, null, 2));
    if (result.errors.length) process.exitCode = 1;
    return;
  }
  const warningLimit = Number(process.env.CONTENT_QA_WARNING_LIMIT || 80);
  const shouldPrintAllWarnings = process.env.CONTENT_QA_ALL_WARNINGS === '1';
  const printableIssues = result.issues.filter(issue => issue.level === 'error');
  const warningsToPrint = shouldPrintAllWarnings
    ? result.warnings
    : result.warnings.slice(0, warningLimit);

  printableIssues.concat(warningsToPrint).forEach(issue => {
    const location = [issue.relativeFile, issue.setId, issue.location].filter(Boolean).join(' | ');
    console.log(`${issue.level.toUpperCase()}: ${location}`);
    console.log(`  ${issue.message}`);
  });
  if (!shouldPrintAllWarnings && result.warnings.length > warningsToPrint.length) {
    console.log(`WARNING: ${result.warnings.length - warningsToPrint.length} additional warning(s) hidden. Set CONTENT_QA_ALL_WARNINGS=1 to print every warning.`);
  }

  const warningSummary = summarizeIssuesByRule(result.warnings);
  if (Object.keys(warningSummary).length) {
    console.log('Warning summary by rule:');
    Object.entries(warningSummary).forEach(([ruleId, count]) => {
      console.log(`  ${ruleId}: ${count}`);
    });
  }

  const sizes = result.sizeSummary;
  console.log(`Checked ${result.sets.length} sets and ${result.questions.length} questions.`);
  console.log(`Question-bank payload: ${formatBytes(sizes.totalBytes)} total, ${formatBytes(sizes.largest.bytes)} largest (${sizes.largest.file}).`);
  sizes.files.forEach(item => {
    console.log(`  ${item.file}: ${formatBytes(item.bytes)}`);
  });
  console.log(`${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
  if (result.errors.length) process.exitCode = 1;
}

function summarizeIssuesByRule(issues) {
  return issues.reduce((summary, issue) => {
    const key = issue.ruleId || 'coverage';
    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, {});
}

function buildExplanationReviewCandidates(questions, issues) {
  const weakIssues = issues.filter(issue => issue.ruleId === 'weak-explanation-rationale');
  return weakIssues.map(issue => {
    const record = questions.find(item => item.question && item.question.id === issue.questionId);
    const question = record && record.question || {};
    const metadata = question.metadata || {};
    return {
      id: `explanation-review-${issue.questionId}`,
      questionIdentity: {
        questionId: issue.questionId,
        version: Number(question.version) || 0,
        contentHash: question.contentHash || '',
        sourceSet: metadata.sourceSet || issue.setId,
        sequence: Number(metadata.sequence) || 0
      },
      sourceLocation: {
        file: issue.relativeFile || '',
        jsonPointer: `/sets/${issue.setId}/questions/${Math.max(0, (record && record.questionNumber || 1) - 1)}/explanation`
      },
      signals: [{
        type: issue.ruleId,
        severity: issue.level,
        message: issue.message,
        source: 'content-qa'
      }],
      status: 'candidate'
    };
  });
}

if (require.main === module) runCli();

module.exports = {
  validateContent,
  validateLoadedContent,
  QUALITY_RULES,
  buildExplanationReviewCandidates,
  summarizeIssuesByRule,
  formatBytes
};
