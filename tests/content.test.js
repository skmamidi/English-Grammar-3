const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const { validateContent, validateLoadedContent } = require('../scripts/qa/content-qa');
const { loadQuestionBanks, getBankSizeSummary } = require('../scripts/qa/bank-loader');
const { normalizeQuestion } = require('../scripts/assign-question-ids');
const { computeContentHash } = require('../scripts/qa/question-metadata');

const repoRoot = path.resolve(__dirname, '..');
let quizEngineTestApi;

test('all question banks load and satisfy the content contract', () => {
  const result = validateContent();
  assert.equal(result.errors.length, 0, result.errors.map(issue => `${issue.relativeFile} ${issue.setId} ${issue.location}: ${issue.message}`).join('\n'));
  assert.ok(result.questions.length >= 10000, 'expected current question bank scale to be covered');
  assert.ok(result.sets.length > 50, 'expected many subtopic sets to be loaded');
});

test('content QA reports invalid correct indexes with actionable locations', () => {
  const result = validateContent();
  const first = result.questions[0];
  first.question.correct = first.question.choices.length + 10;

  const rerun = validateLoadedContent(result.bankLoad);
  const issue = rerun.errors.find(item => item.message.includes('Correct index'));
  assert.ok(issue, 'expected invalid correct index to fail');
  assert.ok(issue.relativeFile);
  assert.ok(issue.setId);
  assert.ok(issue.location);
});

test('live question banks do not repeat answer choice text within a question', () => {
  const result = validateContent();
  const duplicateChoiceErrors = result.errors.filter(issue =>
    issue.ruleId === 'duplicate-choice' ||
    issue.ruleId === 'duplicate-correct-answer-text'
  );

  assert.equal(
    duplicateChoiceErrors.length,
    0,
    duplicateChoiceErrors.map(issue => `${issue.relativeFile} ${issue.setId} ${issue.location}: ${issue.message}`).join('\n')
  );
});

test('underlined-word prompts expose renderable underline targets', () => {
  const result = validateContent();
  const reported = result.questions.find(item => item.question.id === 'vocabulary-comparatives-superlatives-q0017');
  assert.ok(reported, 'expected reported underlined-word question in live bank');

  const html = renderQuizPromptForTest(reported.question);

  assert.match(html, /<u>I<\/u>/);
  assert.match(html, /<u>After<\/u>/);
  assert.match(html, /<u>several<\/u>/);
  assert.match(html, /<u>the<\/u>/);

  const antonym = result.questions.find(item => item.question.id === 'vocabulary-synonyms-antonyms-q0084');
  assert.ok(antonym, 'expected antonym underlined-word question in live bank');
  assert.match(renderQuizPromptForTest(antonym.question), /<u>devastated<\/u>/);
  assert.match(renderVisualQuizPromptForTest(antonym.question), /<u>devastated<\/u>/);
});

test('all live underlined prompts render an underline in the prompt or choices', () => {
  const result = validateContent();
  const missing = result.questions
    .filter(record => /\bunderlined\b/i.test(record.question.question || ''))
    .map(record => {
      const promptHtml = renderQuizPromptForTest(record.question);
      const visualHtml = renderVisualQuizPromptForTest(record.question);
      const choiceHtml = (record.question.choices || [])
        .map((choice, index) => renderQuizChoiceForTest(record.question, choice, index))
        .join(' ');
      return {
        record,
        html: [promptHtml, visualHtml, choiceHtml].join(' ')
      };
    })
    .filter(item => !/<u>/.test(item.html));

  assert.equal(
    missing.length,
    0,
    missing.map(item => `${item.record.relativeFile} ${item.record.setId} ${item.record.location || questionLabel(item.record)}: "${item.record.question.question}"`).join('\n')
  );
});

test('live question banks do not render strategy hints that reveal the correct answer', () => {
  const result = validateContent();
  const leaks = result.questions
    .map(record => {
      const clue = getStrategyClueForTest(record.question);
      return {
        record,
        clue,
        leak: getStrategyHintAnswerLeak(record.question, clue)
      };
    })
    .filter(item => item.leak);

  assert.equal(
    leaks.length,
    0,
    leaks.map(item => `${item.record.relativeFile} ${item.record.setId} ${item.record.location || questionLabel(item.record)}: hint "${item.clue}" reveals "${item.record.question.choices[item.record.question.correct]}"`).join('\n')
  );
});

test('generated visual scene clues do not reveal the correct answer', () => {
  const result = validateContent();
  runVisualSceneEnhancer(result.bankLoad.bank);

  const leaks = result.questions
    .map(record => {
      const scene = record.question.visualScene || record.question.generatedVisualScene;
      return {
        record,
        clue: scene && scene.clue || '',
        leak: scene && getStrategyHintAnswerLeak(record.question, scene.clue)
      };
    })
    .filter(item => item.leak);

  assert.equal(
    leaks.length,
    0,
    leaks.map(item => `${item.record.relativeFile} ${item.record.setId} ${item.record.location || questionLabel(item.record)}: scene clue "${item.clue}" reveals "${item.record.question.choices[item.record.question.correct]}"`).join('\n')
  );

  const cloud = result.questions.find(record => record.question.id === 'vocabulary-vowel-sounds-q0006');
  assert.ok(cloud, 'expected cloud vowel-sound fixture');
  assert.equal(cloud.question.generatedVisualScene.clue, "'ou' and 'ow' both make the /ow/ sound");
});

test('strategy hints ignore authored examples and scene clues that reveal the answer', () => {
  const question = makeQaQuestion(1, {
    question: 'Which word best completes the sentence: They ___ playing soccer.',
    choices: ['is', 'are', 'was'],
    correct: 1,
    studyAid: {
      definition: 'Use subject-verb agreement.',
      example: 'They are playing. She is playing.'
    }
  });
  const scene = makeScene('Characters discuss subject-verb agreement.');
  scene.clue = 'The answer is are.';

  const clue = getStrategyClueForTest(question, scene);

  assert.equal(getStrategyHintAnswerLeak(question, clue), false);
  assert.doesNotMatch(normalizeStrategyHintText(clue), /(^|\s)are(?=\s|$)/);
});

test('syllable count strategy hints do not include the final count or printed division', () => {
  const question = makeQaQuestion(1, {
    question: 'How many syllables are in "computer"?',
    choices: ['1', '2', '3', '4'],
    correct: 2,
    studyAid: {
      definition: 'Each syllable has a vowel sound.',
      example: 'computer has three syllables: com-pu-ter.'
    }
  });

  const clue = getStrategyClueForTest(question);

  assert.equal(getStrategyHintAnswerLeak(question, clue), false);
  assert.doesNotMatch(clue, /\b3\b|\bthree\b|com-pu-ter/i);
});

test('content QA fails underlined-word prompts when choices cannot be located in the sentence', () => {
  const question = makeQaQuestion(1, {
    question: 'Which underlined word is used incorrectly in the sentence? The bright comet crossed the sky.',
    choices: ['river', 'garden', 'music', 'window'],
    correct: 0,
    explanation: {
      correct: 'The intended underlined word must appear in the sentence.',
      incorrect: [
        '',
        'This choice is not present in the sentence.',
        'This choice is not present in the sentence.',
        'This choice is not present in the sentence.'
      ]
    }
  });

  const result = validateLoadedContent(makeLoadedBank('content-qa-fixture', [question]));

  assertIssue(result.errors, 'missing-underlined-choice-target');
});

test('claim opinion questions require option-specific feedback', () => {
  const question = makeQaQuestion(1, {
    question: 'Which claim is clear for an opinion paragraph?',
    choices: [
      'Many things happen at school.',
      'Trees are outside.',
      'Our school should plant more shade trees.',
      'Some people like green.'
    ],
    correct: 2,
    studyAid: {
      definition: 'Strong writing is clear and supported with details.',
      example: 'A claim states a clear opinion or position.'
    },
    explanation: {
      correct: 'Answer: Our school should plant more shade trees.. A claim states a clear opinion or position.',
      incorrect: [
        'Not: Many things happen at school.. A claim states a clear opinion or position.',
        'Not: Trees are outside.. A claim states a clear opinion or position.',
        '',
        'Not: Some people like green.. A claim states a clear opinion or position.'
      ]
    }
  });

  const result = validateLoadedContent(makeLoadedBank('content-qa-fixture', [question]));

  assertIssue(result.errors, 'claim-explanation-specificity');
});

test('live claim opinion questions explain what each wrong choice is', () => {
  const result = validateContent();
  const claimErrors = result.errors.filter(issue => issue.ruleId === 'claim-explanation-specificity');

  assert.equal(
    claimErrors.length,
    0,
    claimErrors.map(issue => `${issue.relativeFile} ${issue.setId} ${issue.location}: ${issue.message}`).join('\n')
  );
});

test('content QA fails malformed explanation arrays', () => {
  const result = validateContent();
  const first = result.questions.find(item => item.question.explanation && Array.isArray(item.question.explanation.incorrect));
  assert.ok(first, 'expected at least one explanation array fixture');
  first.question.explanation.incorrect = ['too short'];

  const rerun = validateLoadedContent(result.bankLoad);
  const issue = rerun.errors.find(item => item.message.includes('Incorrect explanation count'));
  assert.ok(issue, 'expected malformed explanation array to fail');
});

test('content QA enforces stable question identity metadata', () => {
  const result = validateContent();
  const first = result.questions[0];
  assert.ok(first.question.id, 'fixture should start with a stable id');

  first.question.id = '';
  const missingId = validateLoadedContent(result.bankLoad);
  assert.ok(missingId.errors.find(item => item.message.includes('Missing stable question id')), 'expected missing id to fail');

  first.question.id = 'bad-id';
  const invalidPrefix = validateLoadedContent(result.bankLoad);
  assert.ok(invalidPrefix.errors.find(item => item.message.includes('must start with')), 'expected invalid id prefix to fail');
});

test('content QA fails duplicate question ids', () => {
  const result = validateContent();
  const setRecord = result.sets.find(record => Array.isArray(record.set.questions) && record.set.questions.length > 1);
  assert.ok(setRecord, 'expected at least one multi-question set');
  setRecord.set.questions[1].id = setRecord.set.questions[0].id;

  const rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('Duplicate stable question id')), 'expected duplicate id to fail');
});

test('content QA fails invalid version, missing contentHash, and sourceSet drift', () => {
  const result = validateContent();
  const first = result.questions[0];

  first.question.version = 0;
  let rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('version must be an integer')), 'expected invalid version to fail');

  first.question.version = 1;
  first.question.contentHash = '';
  rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('Missing contentHash')), 'expected missing contentHash to fail');

  first.question.contentHash = 'sha256:0'.padEnd(71, '0');
  first.question.metadata.sourceSet = 'wrong-set';
  rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('metadata.sourceSet must match')), 'expected sourceSet mismatch to fail');
});

test('authored visualScene participates in contentHash', () => {
  const question = makeQuestion('visual-contract-q0001', 'visual-contract', 1, {
    visualScene: makeScene('Original scene line')
  });
  const before = computeContentHash(question);

  question.visualScene.dialogue[0].text = 'Changed scene line';

  assert.notEqual(computeContentHash(question), before);
});

test('generated visual scene is excluded from contentHash validation', () => {
  const question = makeQuestion('visual-contract-q0001', 'visual-contract', 1);
  const contentHash = computeContentHash(question);
  question.contentHash = contentHash;
  question.generatedVisualScene = makeScene('Runtime-only scene line');

  const rerun = validateLoadedContent(makeLoadedBank('visual-contract', [question]));

  assert.equal(computeContentHash(question), contentHash);
  assert.equal(rerun.errors.length, 0, rerun.errors.map(issue => issue.message).join('\n'));
});

test('visual scene enhancer writes generatedVisualScene without overwriting authored visualScene', () => {
  const authored = makeQuestion('grammar-sentence-types-q0001', 'grammar-sentence-types', 1, {
    visualScene: makeScene('Authored bank scene line')
  });
  const runtimeOnly = makeQuestion('grammar-sentence-types-q0002', 'grammar-sentence-types', 2);
  authored.contentHash = computeContentHash(authored);
  runtimeOnly.contentHash = computeContentHash(runtimeOnly);

  const bank = {
    'grammar-sentence-types': {
      title: 'Sentence Types',
      topic: 'Grammar',
      questions: [authored, runtimeOnly]
    }
  };
  runVisualSceneEnhancer(bank);

  assert.equal(authored.visualScene.dialogue[0].text, 'Authored bank scene line');
  assert.equal(authored.generatedVisualScene, undefined);
  assert.equal(runtimeOnly.visualScene, undefined);
  assert.equal(runtimeOnly.generatedVisualScene.type, 'dialogue-scene');
  assert.equal(computeContentHash(runtimeOnly), runtimeOnly.contentHash);
});

test('assign-question-ids keeps hashes stable when runtime generated scenes are present', () => {
  const question = makeQuestion('visual-contract-q0001', 'visual-contract', 1, {
    generatedVisualScene: makeScene('Runtime-only scene line')
  });
  const contentHash = computeContentHash(question);

  const normalized = normalizeQuestion(question, question.id, contentHash, 'visual-contract', 1, false);

  assert.equal(normalized.contentHash, contentHash);
  assert.equal(normalized.generatedVisualScene.dialogue[0].text, 'Runtime-only scene line');
  assert.equal(normalized.visualScene, undefined);
});

test('question-bank size snapshot is available for performance budget tracking', () => {
  const bankLoad = loadQuestionBanks();
  const summary = getBankSizeSummary(bankLoad);
  assert.ok(summary.totalBytes > 0);
  assert.ok(summary.largest);
  assert.ok(summary.files.length >= 1);
});

test('content QA warns for duplicate prompts within a set', () => {
  const questions = [
    makeQaQuestion(1, { question: 'Which sentence is a command?' }),
    makeQaQuestion(2, { question: ' Which   sentence is a command? ' })
  ];

  const result = validateLoadedContent(makeLoadedBank('content-qa-fixture', questions));

  assertIssue(result.warnings, 'duplicate-prompt-in-set', {
    setId: 'content-qa-fixture',
    questionId: 'content-qa-fixture-q0002'
  });
});

test('content QA errors for empty or repeated choices', () => {
  const questions = [
    makeQaQuestion(1, { choices: ['Close the door.', '  ', 'Close the door.'], correct: 0 })
  ];

  const result = validateLoadedContent(makeLoadedBank('content-qa-fixture', questions), {
    ruleSeverity: {
      'duplicate-choice': 'error',
      'duplicate-correct-answer-text': 'error'
    }
  });

  assertIssue(result.errors, 'empty-choice');
  assertIssue(result.errors, 'duplicate-choice');
  assertIssue(result.errors, 'duplicate-correct-answer-text');
});

test('content QA rejects word-pattern prompts where only the answer shows the visual cue', () => {
  const questions = [
    makeQaQuestion(1, {
      question: 'Which word has an r-controlled vowel?',
      choices: ['bird', 'bad', 'bead', 'bend'],
      correct: 0,
      explanation: {
        correct: 'Answer: bird. In bird, the vowel is controlled by r.',
        incorrect: [
          '',
          'Not: bad. This word does not include the r-controlled vowel pattern.',
          'Not: bead. This word does not include the r-controlled vowel pattern.',
          'Not: bend. This word does not include the r-controlled vowel pattern.'
        ]
      }
    }),
    makeQaQuestion(2, {
      question: 'Which word uses ai to spell the long a sound?',
      choices: ['ran', 'rain', 'rake', 'ring'],
      correct: 1,
      explanation: {
        correct: 'Answer: rain. In rain, ai spells the long a sound.',
        incorrect: [
          'Not: ran. This word does not include ai.',
          '',
          'Not: rake. This word does not include ai.',
          'Not: ring. This word does not include ai.'
        ]
      }
    })
  ];

  const result = validateLoadedContent(makeLoadedBank('content-qa-fixture', questions));

  assertIssue(result.errors, 'isolated-word-pattern-cue', { questionId: 'content-qa-fixture-q0001' });
  assertIssue(result.errors, 'isolated-word-pattern-cue', { questionId: 'content-qa-fixture-q0002' });
});

test('content QA warns for placeholders, whitespace, weak explanations, and long choices', () => {
  const longChoice = `${'A very long answer choice '.repeat(12)}that will be hard to scan on a phone.`;
  const questions = [
    makeQaQuestion(1, {
      question: 'TODO: Which sentence uses a noun?',
      choices: [longChoice, 'The dog ran.'],
      correct: 1,
      explanation: {
        correct: 'Correct.',
        incorrect: ['Incorrect.', 'Correct.']
      },
      studyAid: {
        definition: 'A noun names a person, place, thing, or idea.',
        example: 'dog'
      }
    }),
    makeQaQuestion(2, {
      question: 'Which   sentence\n\nuses  a verb?'
    })
  ];

  const result = validateLoadedContent(makeLoadedBank('content-qa-fixture', questions));

  assertIssue(result.warnings, 'placeholder-text');
  assertIssue(result.warnings, 'excessive-whitespace');
  assertIssue(result.warnings, 'weak-explanation-rationale');
  assertIssue(result.warnings, 'overlong-choice');
});

test('content QA rejects generic explanation rationales', () => {
  const questions = [
    makeQaQuestion(1, {
      question: 'After borrowing money, she was indebted.',
      choices: ['paid', 'spent', 'lent', 'owed'],
      correct: 3,
      explanation: {
        correct: 'Answer: owed. Context clues are hints in the sentence that help you figure out the meaning of an unknown word.',
        incorrect: [
          'Not: paid. It does not match the context clue.',
          'Not: spent. It does not match the context clue.',
          'Not: lent. It does not match the context clue.',
          ''
        ]
      }
    }),
    makeQaQuestion(2, {
      question: "Which word rhymes with 'enough'?",
      choices: ['cough', 'tough', 'bough', 'though'],
      correct: 1,
      explanation: {
        correct: "Answer: tough. The letter group '-ough' can make many sounds.",
        incorrect: [
          'Not: cough. It does not share the target ending sound.',
          '',
          'Not: bough. It does not share the target ending sound.',
          'Not: though. It does not share the target ending sound.'
        ]
      }
    })
  ];

  const result = validateLoadedContent(makeLoadedBank('content-qa-fixture', questions));

  assertIssue(result.errors, 'generic-explanation-rationale', { questionId: 'content-qa-fixture-q0001' });
  assertIssue(result.errors, 'generic-explanation-rationale', { questionId: 'content-qa-fixture-q0002' });
});

test('content QA can emit deterministic explanation review candidates', () => {
  const result = validateContent();
  const candidate = validateLoadedContent(result.bankLoad, { explanationReviewCandidates: true })
    .explanationReviewCandidates
    .find(item => item.signals.some(signal => signal.type === 'weak-explanation-rationale'));

  assert.ok(candidate, 'expected weak explanation QA candidate');
  assert.ok(candidate.questionIdentity.questionId);
  assert.match(candidate.sourceLocation.file, /^assets\/question-bank-source\//);
  assert.match(candidate.sourceLocation.jsonPointer, /^\/sets\/.+\/questions\/\d+\/explanation$/);
  assert.equal(JSON.stringify(candidate).includes('"question"'), false);
});

function makeQuestion(id, sourceSet, sequence, overrides = {}) {
  return Object.assign({
    id,
    version: 1,
    contentHash: '',
    question: 'Which sentence is a command?',
    choices: ['Close the door.', 'The door is closed.'],
    correct: 0,
    explanation: {
      correct: 'A command tells someone what to do.',
      incorrect: [
        'This choice gives a command.',
        'This choice states information.'
      ]
    },
    studyAid: {
      definition: 'A command tells someone to do something.',
      example: 'Close the door.'
    },
    metadata: {
      sourceSet,
      sequence
    }
  }, overrides);
}

function makeQaQuestion(sequence, overrides = {}) {
  const sourceSet = 'content-qa-fixture';
  const question = Object.assign(makeQuestion(`${sourceSet}-q${String(sequence).padStart(4, '0')}`, sourceSet, sequence, {
    metadata: {
      sourceSet,
      sequence,
      gradeLevels: [4],
      difficultyByGrade: { 4: 'medium' },
      skills: ['content QA']
    }
  }), overrides);
  question.contentHash = computeContentHash(question);
  return question;
}

function assertIssue(issues, ruleId, expected = {}) {
  const issue = issues.find(item => item.ruleId === ruleId &&
    (!expected.setId || item.setId === expected.setId) &&
    (!expected.questionId || item.questionId === expected.questionId));
  assert.ok(issue, `expected ${ruleId}; got ${issues.map(item => item.ruleId || item.message).join(', ')}`);
  assert.ok(issue.relativeFile, 'expected source file in diagnostic');
  assert.ok(issue.setId, 'expected set id in diagnostic');
}

function makeScene(text) {
  return {
    type: 'dialogue-scene',
    title: 'Scene Contract',
    setting: 'classroom',
    board: 'Board',
    narration: 'Characters discuss the question.',
    prompt: 'Which sentence is a command?',
    clue: 'A command tells someone to do something.',
    dialogue: [{
      characterId: 'mina-mapwise',
      mood: 'curious',
      text
    }]
  };
}

function makeLoadedBank(setId, questions) {
  const file = path.join(repoRoot, 'tests', `${setId}.fixture.js`);
  return {
    files: [{
      file,
      relativeFile: path.relative(repoRoot, file),
      bytes: 1,
      bank: {
        [setId]: {
          title: 'Visual Contract',
          topic: 'Grammar',
          questions
        }
      }
    }],
    bank: {
      [setId]: {
        title: 'Visual Contract',
        topic: 'Grammar',
        questions
      }
    }
  };
}

function runVisualSceneEnhancer(bank) {
  const code = fs.readFileSync(path.join(repoRoot, 'assets', 'visual-question-scenes.js'), 'utf8');
  const context = {
    window: {
      QUESTION_BANK: bank
    }
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'assets/visual-question-scenes.js' });
}

function renderQuizPromptForTest(question) {
  return loadQuizEngineTestApi().renderQuestionPromptForTest(question);
}

function renderVisualQuizPromptForTest(question) {
  return loadQuizEngineTestApi().renderVisualQuestionPromptForTest(question);
}

function renderQuizChoiceForTest(question, choice, index) {
  return loadQuizEngineTestApi().renderAnswerChoiceForTest(question, choice, index);
}

function getStrategyClueForTest(question, scene) {
  return loadQuizEngineTestApi().getQuestionStrategyClueForTest(question, scene);
}

function loadQuizEngineTestApi() {
  if (quizEngineTestApi) return quizEngineTestApi;
  const context = {
    console,
    window: {
      addEventListener() {}
    },
    document: {
      readyState: 'loading',
      addEventListener() {},
      getElementById() { return null; },
      createElement() {
        return {
          _text: '',
          set textContent(value) {
            this._text = String(value == null ? '' : value);
            this.innerHTML = this._text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
          },
          get textContent() {
            return this._text;
          },
          innerHTML: ''
        };
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'assets', 'quiz-engine.js'), 'utf8'), context, { filename: 'assets/quiz-engine.js' });
  quizEngineTestApi = context.window.GrammarQuestPromptFormatting;
  return quizEngineTestApi;
}

function getStrategyHintAnswerLeak(question, clue) {
  if (!question || !Array.isArray(question.choices) || !Number.isInteger(question.correct)) return false;
  const correct = normalizeStrategyHintText(question.choices[question.correct]);
  const clueText = normalizeStrategyHintText(clue);
  if (!correct || !clueText) return false;
  if (isGenericHintAnswerText(correct)) return false;
  if (clueText === correct) return true;
  if (correct.length < 2) return false;
  return buildStrategyHintLeakRegExp(correct).test(clueText);
}

function isGenericHintAnswerText(value) {
  return new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'has', 'have', 'had',
    'how', 'why', 'when', 'where', 'who', 'what', 'sentence', 'question',
    'statement', 'command'
  ]).has(String(value || ''));
}

function normalizeStrategyHintText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^a-z0-9'-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildStrategyHintLeakRegExp(value) {
  const escaped = String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`);
}

function questionLabel(record) {
  const sequence = record && record.question && record.question.metadata && record.question.metadata.sequence;
  return sequence ? `question ${sequence}` : '';
}
