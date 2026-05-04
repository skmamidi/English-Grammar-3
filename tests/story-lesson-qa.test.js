const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const questionManifest = require('../assets/question-manifest.json');
const validLesson = require('./fixtures/story-lessons/valid-sentence-types.json');
const { buildLessonRouteDescriptor } = require('../assets/story-lesson-domain');
const {
  runStoryLessonQa,
  validateStoryLessonPedagogy,
  validateStoryLessonCoverage,
  validateStoryLessonFreshness,
  validateStoryLessonAuthoringEvidence,
  validateStoryLessonReviewEvidence
} = require('../scripts/qa/story-lesson-qa');
const {
  buildStoryLessonManifestScript,
  generateStoryLessonArtifacts,
  loadStoryLessonSources,
  writeStoryLessonArtifacts
} = require('../scripts/generate-story-lessons');

const repoRoot = path.resolve(__dirname, '..');
const PR200_DOMAINS = new Set(['capitalization', 'punctuation']);
const PR201_GRAMMAR_FOUNDATION_SET_IDS = [
  'grammar-correct-article',
  'grammar-double-negatives',
  'grammar-pronouns',
  'grammar-singular-plural-nouns',
  'grammar-irregular-nouns-plurals',
  'grammar-verb-forms',
  'grammar-tenses',
  'grammar-parts-of-speech-verbs',
  'grammar-parts-of-speech-nouns',
  'grammar-parts-of-speech-adjectives',
  'grammar-parts-of-speech-adverbs',
  'grammar-subject-predicate',
  'grammar-subject-verb-agreement',
  'grammar-sentence-types',
  'grammar-identify-sentence',
  'grammar-sentence-correction',
  'grammar-run-on-sentences'
].sort();
const PR202_GRAMMAR_COMPOSITION_SET_IDS = [
  'grammar-conjunctions',
  'grammar-sentence-combinations',
  'grammar-friendly-letter',
  'grammar-indentation-rules',
  'grammar-point-of-view',
  'grammar-paragraph-structure',
  'grammar-opinion-persuasive-writing',
  'grammar-informative-explanatory-writing',
  'grammar-narrative-writing',
  'grammar-revising-editing-strategy',
  'grammar-prepositions-prepositional-phrases',
  'grammar-clauses-complex-sentences',
  'grammar-pronoun-agreement-case',
  'grammar-verb-tense-consistency',
  'grammar-sentence-variety',
  'grammar-appositives-phrases',
  'grammar-formal-informal-language'
].sort();
const PR203_READING_SET_IDS = [
  'reading-comprehension-analogies',
  'reading-comprehension-categorizing',
  'reading-comprehension-cause-effect',
  'reading-comprehension-fact-fantasy',
  'reading-comprehension-fact-opinion',
  'reading-comprehension-inference',
  'reading-comprehension-main-idea-supporting-details',
  'reading-comprehension-summarizing',
  'reading-comprehension-text-evidence',
  'reading-comprehension-story-elements',
  'reading-comprehension-theme-lesson-moral',
  'reading-comprehension-authors-purpose',
  'reading-comprehension-text-structure',
  'reading-comprehension-compare-contrast',
  'reading-comprehension-poetry-skills',
  'reading-comprehension-book-genres',
  'reading-comprehension-point-of-view-literature',
  'reading-comprehension-tone-mood',
  'reading-comprehension-test-taking-reading-skills'
].sort();
const PR204_VOCAB_REFERENCE_SET_IDS = [
  'reference-skills-sub-heading',
  'reference-skills-subject-object',
  'reference-skills-italicize',
  'reference-skills-alphabetical-order',
  'reference-skills-dictionary-guide-words',
  'reference-skills-research-skills',
  'reference-skills-media-literacy',
  'reference-skills-nonfiction-text-features',
  'vocabulary-base-words',
  'vocabulary-vowel-sounds',
  'vocabulary-contractions',
  'vocabulary-homophones',
  'vocabulary-rhyming',
  'vocabulary-synonyms-antonyms',
  'vocabulary-comparatives-superlatives',
  'vocabulary-word-meaning-context',
  'vocabulary-spelling',
  'vocabulary-modifier-words',
  'vocabulary-figurative-language',
  'vocabulary-roots-word-origins',
  'vocabulary-multiple-meaning-words',
  'vocabulary-shades-of-meaning',
  'vocabulary-syllables-decoding',
  'vocabulary-spelling-patterns'
].sort();

test('story lesson QA passes current generated artifacts and coverage policy', () => {
  const result = runStoryLessonQa({ root: repoRoot });

  assert.deepEqual(result.errors, []);
  assert.equal(result.coverage.coveredSetCount, 95);
  assert.equal(result.coverage.totalQuestionManifestSets, questionManifest.sets.length);
  assert.equal(result.coverage.excludedSetCount, 0);
  assert.equal(result.pedagogy.checkedLessonCount, 95);
  assert.equal(result.reviewEvidence.acceptedLessonCount, 95);
  assert.equal(result.authoringEvidence.authoringRecordCount, 1);
  assert.equal(result.authoringEvidence.validAuthoringRecordCount, 1);
});

test('story lesson QA covers every capitalization and punctuation mechanics set for PR200', () => {
  const expectedSetIds = questionManifest.sets
    .filter(set => PR200_DOMAINS.has(set.domain))
    .map(set => set.id)
    .sort();
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const coveredSetIds = lessons
    .filter(lesson => PR200_DOMAINS.has(lesson.domain))
    .map(lesson => lesson.setId)
    .sort();

  assert.deepEqual(coveredSetIds, expectedSetIds);
  assert.equal(coveredSetIds.length, 18);
});

test('story lesson QA keeps PR200 mechanics lessons example-rich and linked across related skills', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const lessonsById = new Map(lessons.map(lesson => [lesson.setId, lesson]));

  [
    'capitalization-sentence-beginning',
    'capitalization-proper-names-titles',
    'punctuation-quotation-marks',
    'punctuation-apostrophes-possessives',
    'punctuation-abbreviations-acronyms'
  ].forEach(setId => {
    const lesson = lessonsById.get(setId);
    assert.ok(lesson, `${setId} lesson should exist`);
    assert.ok(Array.isArray(lesson.relatedSubtopics) && lesson.relatedSubtopics.length > 0, `${setId} should link to related mechanics`);
    ['2', '4', '6'].forEach(grade => {
      const variant = lesson.gradeVariants[grade];
      assert.equal(variant.readingLevel, `grade-${grade}`);
      assert.ok(variant.storyBeats.length > 0, `${setId} grade ${grade} needs a story beat`);
      assert.ok(variant.conceptRules.length > 0, `${setId} grade ${grade} needs a concept rule`);
      assert.ok(variant.examples.length >= 3, `${setId} grade ${grade} needs at least three examples`);
      assert.ok(variant.guidedChecks.length > 0, `${setId} grade ${grade} needs a guided check`);
      assert.ok(variant.commonMistakes.length > 0, `${setId} grade ${grade} needs a common mistake`);
      assert.equal(variant.quizHandoff.targetSetId, setId);
    });
  });
});

test('story lesson QA wires PR200 subtopic routes to lesson chunks before quiz practice', () => {
  questionManifest.sets
    .filter(set => PR200_DOMAINS.has(set.domain))
    .forEach(set => {
      const route = buildLessonRouteDescriptor({ setId: set.id, domain: set.domain }, { manifest: questionManifest });
      const routePath = path.join(repoRoot, route.webPath.split('?')[0]);
      const source = fs.readFileSync(routePath, 'utf8');
      const lessonManifestIndex = source.indexOf('assets/story-lesson-manifest.js');
      const lessonChunkIndex = source.indexOf(`assets/story-lesson-chunks/${set.domain}/${set.id}.js`);
      const viewerIndex = source.indexOf('assets/story-lesson-viewer.js');
      const quizIndex = source.indexOf('assets/quiz-engine.js');

      assert.ok(lessonManifestIndex > 0, `${set.id} should load the story lesson manifest`);
      assert.ok(lessonChunkIndex > lessonManifestIndex, `${set.id} should load its lesson chunk`);
      assert.ok(viewerIndex > lessonChunkIndex, `${set.id} should load the story lesson viewer after the chunk`);
      assert.ok(quizIndex > viewerIndex, `${set.id} should load quiz practice after the lesson viewer`);
    });
});

test('story lesson QA covers every PR201 grammar foundation set', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const coveredSetIds = lessons
    .filter(lesson => PR201_GRAMMAR_FOUNDATION_SET_IDS.includes(lesson.setId))
    .map(lesson => lesson.setId)
    .sort();

  assert.deepEqual(coveredSetIds, PR201_GRAMMAR_FOUNDATION_SET_IDS);
});

test('story lesson QA keeps PR201 grammar lessons grade-distinct with direct near-miss and transfer examples', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const lessonsById = new Map(lessons.map(lesson => [lesson.setId, lesson]));

  PR201_GRAMMAR_FOUNDATION_SET_IDS.forEach(setId => {
    const lesson = lessonsById.get(setId);
    assert.ok(lesson, `${setId} lesson should exist`);
    ['2', '4', '6'].forEach(grade => {
      const variant = lesson.gradeVariants[grade];
      assert.equal(variant.readingLevel, `grade-${grade}`);
      assert.deepEqual(variant.examples.map(example => example.type).sort(), ['direct', 'near_miss', 'transfer']);
      assert.ok(variant.guidedChecks.length > 0, `${setId} grade ${grade} needs a guided check`);
      assert.ok(variant.commonMistakes.length > 0, `${setId} grade ${grade} needs a common mistake`);
      assert.equal(variant.quizHandoff.targetSetId, setId);
    });
    assert.notEqual(lesson.gradeVariants['2'].conceptRules[0], lesson.gradeVariants['6'].conceptRules[0], `${setId} should vary grade 2 and grade 6 rules`);
  });
});

test('story lesson QA links grammar correction and run-on lessons to bounded foundation review paths', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const lessonsById = new Map(lessons.map(lesson => [lesson.setId, lesson]));

  assert.deepEqual(
    lessonsById.get('grammar-sentence-correction').relatedSubtopics.map(item => item.setId).sort(),
    ['grammar-sentence-types', 'grammar-subject-verb-agreement', 'grammar-verb-forms'].sort()
  );
  assert.deepEqual(
    lessonsById.get('grammar-run-on-sentences').relatedSubtopics.map(item => item.setId).sort(),
    ['grammar-sentence-correction', 'grammar-sentence-types', 'grammar-subject-predicate'].sort()
  );
});

test('story lesson QA wires PR201 grammar foundation routes to lesson chunks before quiz practice', () => {
  PR201_GRAMMAR_FOUNDATION_SET_IDS.forEach(setId => {
    const set = questionManifest.sets.find(item => item.id === setId);
    const route = buildLessonRouteDescriptor({ setId: set.id, domain: set.domain }, { manifest: questionManifest });
    const routePath = path.join(repoRoot, route.webPath.split('?')[0]);
    const source = fs.readFileSync(routePath, 'utf8');
    const lessonManifestIndex = source.indexOf('assets/story-lesson-manifest.js');
    const lessonChunkIndex = source.indexOf(`assets/story-lesson-chunks/${set.domain}/${set.id}.js`);
    const viewerIndex = source.indexOf('assets/story-lesson-viewer.js');
    const quizIndex = source.indexOf('assets/quiz-engine.js');

    assert.ok(lessonManifestIndex > 0, `${set.id} should load the story lesson manifest`);
    assert.ok(lessonChunkIndex > lessonManifestIndex, `${set.id} should load its lesson chunk`);
    assert.ok(viewerIndex > lessonChunkIndex, `${set.id} should load the story lesson viewer after the chunk`);
    assert.ok(quizIndex > viewerIndex, `${set.id} should load quiz practice after the lesson viewer`);
  });
});

test('story lesson QA covers every PR202 grammar composition and advanced language set', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const coveredSetIds = lessons
    .filter(lesson => PR202_GRAMMAR_COMPOSITION_SET_IDS.includes(lesson.setId))
    .map(lesson => lesson.setId)
    .sort();

  assert.deepEqual(coveredSetIds, PR202_GRAMMAR_COMPOSITION_SET_IDS);
});

test('story lesson QA keeps PR202 writing-strategy lessons structured around plan try revise and transfer', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const lessonsById = new Map(lessons.map(lesson => [lesson.setId, lesson]));

  [
    'grammar-clauses-complex-sentences',
    'grammar-opinion-persuasive-writing',
    'grammar-formal-informal-language'
  ].forEach(setId => {
    const lesson = lessonsById.get(setId);
    assert.ok(lesson, `${setId} lesson should exist`);
    ['2', '4', '6'].forEach(grade => {
      const variant = lesson.gradeVariants[grade];
      const strategyText = variant.guidedChecks.map(check => check.prompt).join(' ').toLowerCase();
      ['plan', 'try', 'revise', 'transfer'].forEach(move => {
        assert.match(strategyText, new RegExp(move), `${setId} grade ${grade} should include ${move}`);
      });
      assert.deepEqual(variant.examples.map(example => example.type).sort(), ['direct', 'near_miss', 'transfer']);
    });
  });
});

test('story lesson QA wires PR202 grammar composition routes to lesson chunks before quiz practice', () => {
  PR202_GRAMMAR_COMPOSITION_SET_IDS.forEach(setId => {
    const set = questionManifest.sets.find(item => item.id === setId);
    const route = buildLessonRouteDescriptor({ setId: set.id, domain: set.domain }, { manifest: questionManifest });
    const routePath = path.join(repoRoot, route.webPath.split('?')[0]);
    const source = fs.readFileSync(routePath, 'utf8');
    const lessonManifestIndex = source.indexOf('assets/story-lesson-manifest.js');
    const lessonChunkIndex = source.indexOf(`assets/story-lesson-chunks/${set.domain}/${set.id}.js`);
    const viewerIndex = source.indexOf('assets/story-lesson-viewer.js');
    const quizIndex = source.indexOf('assets/quiz-engine.js');

    assert.ok(lessonManifestIndex > 0, `${set.id} should load the story lesson manifest`);
    assert.ok(lessonChunkIndex > lessonManifestIndex, `${set.id} should load its lesson chunk`);
    assert.ok(viewerIndex > lessonChunkIndex, `${set.id} should load the story lesson viewer after the chunk`);
    assert.ok(quizIndex > viewerIndex, `${set.id} should load quiz practice after the lesson viewer`);
  });
});

test('story lesson QA covers every PR203 reading comprehension set', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const coveredSetIds = lessons
    .filter(lesson => PR203_READING_SET_IDS.includes(lesson.setId))
    .map(lesson => lesson.setId)
    .sort();

  assert.deepEqual(coveredSetIds, PR203_READING_SET_IDS);
});

test('story lesson QA keeps PR203 reading lessons grounded in original scenarios and evidence steps', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const lessonsById = new Map(lessons.map(lesson => [lesson.setId, lesson]));

  [
    'reading-comprehension-inference',
    'reading-comprehension-text-evidence',
    'reading-comprehension-theme-lesson-moral'
  ].forEach(setId => {
    const lesson = lessonsById.get(setId);
    assert.ok(lesson, `${setId} lesson should exist`);
    ['2', '4', '6'].forEach(grade => {
      const variant = lesson.gradeVariants[grade];
      const exampleText = variant.examples.map(example => example.text).join(' ');
      const guidedText = variant.guidedChecks.map(check => `${check.prompt} ${check.answer}`).join(' ').toLowerCase();
      assert.match(exampleText, /Mina|Jo/, `${setId} grade ${grade} should use an original mini-scenario`);
      assert.match(guidedText, /evidence|clue|because/, `${setId} grade ${grade} should make evidence thinking explicit`);
      assert.deepEqual(variant.examples.map(example => example.type).sort(), ['direct', 'near_miss', 'transfer']);
    });
  });
});

test('story lesson QA wires PR203 reading routes to lesson chunks before quiz practice', () => {
  PR203_READING_SET_IDS.forEach(setId => {
    const set = questionManifest.sets.find(item => item.id === setId);
    const route = buildLessonRouteDescriptor({ setId: set.id, domain: set.domain }, { manifest: questionManifest });
    const routePath = path.join(repoRoot, route.webPath.split('?')[0]);
    const source = fs.readFileSync(routePath, 'utf8');
    const lessonManifestIndex = source.indexOf('assets/story-lesson-manifest.js');
    const lessonChunkIndex = source.indexOf(`assets/story-lesson-chunks/${set.domain}/${set.id}.js`);
    const viewerIndex = source.indexOf('assets/story-lesson-viewer.js');
    const quizIndex = source.indexOf('assets/quiz-engine.js');

    assert.ok(lessonManifestIndex > 0, `${set.id} should load the story lesson manifest`);
    assert.ok(lessonChunkIndex > lessonManifestIndex, `${set.id} should load its lesson chunk`);
    assert.ok(viewerIndex > lessonChunkIndex, `${set.id} should load the story lesson viewer after the chunk`);
    assert.ok(quizIndex > viewerIndex, `${set.id} should load quiz practice after the lesson viewer`);
  });
});

test('story lesson QA covers every PR204 vocabulary and reference-skills set', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const coveredSetIds = lessons
    .filter(lesson => PR204_VOCAB_REFERENCE_SET_IDS.includes(lesson.setId))
    .map(lesson => lesson.setId)
    .sort();

  assert.deepEqual(coveredSetIds, PR204_VOCAB_REFERENCE_SET_IDS);
});

test('story lesson QA keeps PR204 vocabulary lessons focused on word-analysis strategy steps', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const lessonsById = new Map(lessons.map(lesson => [lesson.setId, lesson]));

  ['vocabulary-base-words', 'vocabulary-word-meaning-context', 'vocabulary-roots-word-origins'].forEach(setId => {
    const lesson = lessonsById.get(setId);
    assert.ok(lesson, `${setId} lesson should exist`);
    ['2', '4', '6'].forEach(grade => {
      const variant = lesson.gradeVariants[grade];
      const guidedText = variant.guidedChecks.map(check => `${check.prompt} ${check.answer}`).join(' ').toLowerCase();
      assert.match(guidedText, /word|meaning|part|context|clue/, `${setId} grade ${grade} should teach word analysis`);
      assert.deepEqual(variant.examples.map(example => example.type).sort(), ['direct', 'near_miss', 'transfer']);
    });
  });
});

test('story lesson QA keeps PR204 reference lessons focused on tool-use and text-feature steps', () => {
  const { lessons } = loadStoryLessonSources({ root: repoRoot });
  const lessonsById = new Map(lessons.map(lesson => [lesson.setId, lesson]));

  ['reference-skills-dictionary-guide-words', 'reference-skills-nonfiction-text-features'].forEach(setId => {
    const lesson = lessonsById.get(setId);
    assert.ok(lesson, `${setId} lesson should exist`);
    ['2', '4', '6'].forEach(grade => {
      const variant = lesson.gradeVariants[grade];
      const guidedText = variant.guidedChecks.map(check => `${check.prompt} ${check.answer}`).join(' ').toLowerCase();
      assert.match(guidedText, /tool|source|feature|guide|text/, `${setId} grade ${grade} should teach tool or feature use`);
      assert.ok(variant.commonMistakes.length > 0, `${setId} grade ${grade} needs a common mistake`);
    });
  });
});

test('story lesson QA wires PR204 vocabulary and reference routes to lesson chunks before quiz practice', () => {
  PR204_VOCAB_REFERENCE_SET_IDS.forEach(setId => {
    const set = questionManifest.sets.find(item => item.id === setId);
    const route = buildLessonRouteDescriptor({ setId: set.id, domain: set.domain }, { manifest: questionManifest });
    const routePath = path.join(repoRoot, route.webPath.split('?')[0]);
    const source = fs.readFileSync(routePath, 'utf8');
    const lessonManifestIndex = source.indexOf('assets/story-lesson-manifest.js');
    const lessonChunkIndex = source.indexOf(`assets/story-lesson-chunks/${set.domain}/${set.id}.js`);
    const viewerIndex = source.indexOf('assets/story-lesson-viewer.js');
    const quizIndex = source.indexOf('assets/quiz-engine.js');

    assert.ok(lessonManifestIndex > 0, `${set.id} should load the story lesson manifest`);
    assert.ok(lessonChunkIndex > lessonManifestIndex, `${set.id} should load its lesson chunk`);
    assert.ok(viewerIndex > lessonChunkIndex, `${set.id} should load the story lesson viewer after the chunk`);
    assert.ok(quizIndex > viewerIndex, `${set.id} should load quiz practice after the lesson viewer`);
  });
});

test('story lesson QA fails when a manifest set lacks coverage or explicit fixture-only exclusion', () => {
  const coverage = validateStoryLessonCoverage({
    questionManifest: {
      sets: [
        { id: 'grammar-sentence-types', domain: 'grammar' },
        { id: 'grammar-missing-lesson', domain: 'grammar' }
      ]
    },
    lessons: [validLesson],
    coveragePolicy: {
      mode: 'fixture_only_until_content_prs',
      domainDeferrals: {}
    }
  });

  assert.ok(coverage.errors.some(error => error.code === 'missing_lesson_coverage' && /grammar-missing-lesson/.test(error.message)));
});

test('story lesson pedagogy QA rejects missing examples generic story beats and empty guided checks', () => {
  const weakLesson = JSON.parse(JSON.stringify(validLesson));
  weakLesson.gradeVariants['4'].storyBeats = [{ id: 'generic', characterRoleId: 'guide', narrative: 'Students learn the topic.' }];
  weakLesson.gradeVariants['4'].examples = [{ type: 'direct', text: 'A sentence.', explanation: 'One example.' }];
  weakLesson.gradeVariants['4'].guidedChecks = [{ prompt: '', answer: '' }];
  weakLesson.gradeVariants['4'].commonMistakes = [];
  weakLesson.gradeVariants['4'].quizHandoff = {};

  const errors = validateStoryLessonPedagogy([weakLesson]).errors;

  assert.ok(errors.some(error => error.code === 'missing_required_example_types'));
  assert.ok(errors.some(error => error.code === 'generic_story_beat'));
  assert.ok(errors.some(error => error.code === 'empty_guided_check'));
  assert.ok(errors.some(error => error.code === 'missing_common_mistake'));
  assert.ok(errors.some(error => error.code === 'missing_quiz_handoff'));
});

test('story lesson pedagogy QA flags grade-inappropriate variants with actionable diagnostics', () => {
  const complexGradeTwo = JSON.parse(JSON.stringify(validLesson));
  complexGradeTwo.gradeVariants['2'].storyBeats[0].narrative = 'Mina evaluates subordinate clause relationships, predicate nominatives, and multisyllabic terminology while comparing syntactic classifications across extended dependent structures that require abstract grammatical analysis before learners can decide what each part does.';
  complexGradeTwo.gradeVariants['2'].conceptRules = ['A subordinate clause modifies the independent clause through syntactic subordination.'];
  const missingFormalLanguage = JSON.parse(JSON.stringify(validLesson));
  missingFormalLanguage.gradeVariants['6'].conceptRules = ['Look carefully and pick what sounds right.'];
  missingFormalLanguage.gradeVariants['6'].guidedChecks = [{ prompt: 'What sounds right?', answer: 'Pick the best one.' }];
  missingFormalLanguage.gradeVariants['6'].examples = [
    { type: 'direct', text: 'This one fits.', explanation: 'It sounds right.' },
    { type: 'near_miss', text: 'This one does not fit.', explanation: 'It sounds off.' },
    { type: 'transfer', text: 'Try another one.', explanation: 'Choose carefully.' }
  ];
  missingFormalLanguage.gradeVariants['6'].storyBeats = [{ id: 'generic-but-concrete', characterRoleId: 'guide', narrative: 'Mina sorts cards and asks Jo to choose carefully.' }];
  missingFormalLanguage.gradeVariants['6'].commonMistakes = ['Do not rush.'];

  const errors = validateStoryLessonPedagogy([complexGradeTwo, missingFormalLanguage]).errors;

  assert.ok(errors.some(error => error.code === 'grade_variant_too_complex' && /grade 2/.test(error.message)));
  assert.ok(errors.some(error => error.code === 'advanced_variant_missing_formal_language' && /grade 6/.test(error.message)));
});

test('story lesson review evidence requires accepted human curriculum review for every lesson', () => {
  const accepted = validateStoryLessonReviewEvidence({
    lessons: [validLesson],
    reviewRecords: [{
      id: 'review-accepted',
      status: 'accepted',
      reviewerId: 'curriculum-reviewer-1',
      reviewedAt: '2030-04-29T12:00:00.000Z',
      rubricVersion: 'story-lesson-pedagogy-v1',
      lessonSetIds: [validLesson.setId],
      checks: {
        pedagogyChecked: true,
        gradeAppropriatenessChecked: true,
        sourceGovernanceChecked: true,
        standardsAlignmentChecked: true,
        biasSafetyChecked: true
      }
    }]
  });
  const rejected = validateStoryLessonReviewEvidence({
    lessons: [validLesson],
    reviewRecords: [{
      id: 'review-rejected',
      status: 'needs_revision',
      reviewerId: 'curriculum-reviewer-1',
      reviewedAt: '2030-04-29T12:00:00.000Z',
      rubricVersion: 'story-lesson-pedagogy-v1',
      lessonSetIds: [validLesson.setId],
      checks: {
        pedagogyChecked: true,
        gradeAppropriatenessChecked: true,
        sourceGovernanceChecked: true,
        standardsAlignmentChecked: true,
        biasSafetyChecked: true
      }
    }]
  });

  assert.deepEqual(accepted.errors, []);
  assert.equal(accepted.summary.acceptedLessonCount, 1);
  assert.ok(rejected.errors.some(error => error.code === 'missing_accepted_lesson_review'));
});

test('story lesson authoring evidence accepts sanitized provider draft tags', () => {
  const result = validateStoryLessonAuthoringEvidence({
    lessons: [validLesson],
    authoringRecords: [buildValidStoryLessonAuthoringRecord()]
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.authoringRecordCount, 1);
  assert.equal(result.summary.validAuthoringRecordCount, 1);
});

test('story lesson authoring evidence rejects missing hashes unsafe prompts and provider responses', () => {
  const missingHash = buildValidStoryLessonAuthoringRecord({
    sourceContextHash: '',
    generatedDraftHash: ''
  });
  const unsafe = buildValidStoryLessonAuthoringRecord({
    rawPrompt: 'Write a lesson from this private source text.',
    providerResponse: { text: 'raw model response' },
    reviewerNotes: 'private curriculum review notes'
  });

  const result = validateStoryLessonAuthoringEvidence({
    lessons: [validLesson],
    authoringRecords: [missingHash, unsafe]
  });

  assert.ok(result.errors.some(error => error.code === 'invalid_story_lesson_authoring_record'));
  assert.ok(result.errors.some(error => error.code === 'unsafe_story_lesson_authoring_record'));
});

test('story lesson QA fails on stale generated manifest or chunk artifacts', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'story-lesson-qa-'));
  copyDir(path.join(repoRoot, 'assets', 'story-lesson-source'), path.join(tmpRoot, 'assets', 'story-lesson-source'));
  const generated = generateStoryLessonArtifacts({ root: tmpRoot, questionManifest });
  writeStoryLessonArtifacts(generated, { root: tmpRoot });

  const staleManifestPath = path.join(tmpRoot, 'assets', 'story-lesson-manifest.js');
  fs.writeFileSync(staleManifestPath, buildStoryLessonManifestScript(Object.assign({}, generated.manifest, {
    generatedAt: '1999-01-01T00:00:00.000Z'
  })));

  const freshness = validateStoryLessonFreshness({ root: tmpRoot, expected: generated });
  assert.ok(freshness.errors.some(error => error.code === 'stale_story_lesson_manifest_script'));
});

test('story lesson QA fails on unsafe routes unknown characters and duplicate generated lesson routes', () => {
  const unsafeLesson = JSON.parse(JSON.stringify(validLesson));
  unsafeLesson.characterRoles[0].characterId = 'missing-character';
  unsafeLesson.relatedSubtopics = [{ setId: 'https://evil.example/lesson', relationship: 'external' }];
  const duplicate = JSON.parse(JSON.stringify(validLesson));

  const coverage = validateStoryLessonCoverage({
    questionManifest: { sets: [{ id: 'grammar-sentence-types', domain: 'grammar' }] },
    lessons: [unsafeLesson, duplicate],
    coveragePolicy: { mode: 'strict', domainDeferrals: {} }
  });

  assert.ok(coverage.errors.some(error => error.code === 'invalid_story_lesson_source'));
  assert.ok(coverage.errors.some(error => error.code === 'duplicate_story_lesson_route'));
});

function buildValidStoryLessonAuthoringRecord(overrides = {}) {
  return Object.assign({
    id: 'story-draft-grammar-sentence-types-g4-fixture',
    lessonSetId: validLesson.setId,
    gradeBand: '4',
    provider: 'openai',
    modelFamily: 'gpt-test-fixture',
    promptRecordId: 'story-prompt-grammar-sentence-types-g4-fixture',
    draftRecordId: 'story-draft-grammar-sentence-types-g4-fixture',
    sourceContextHash: `sha256:${'a'.repeat(64)}`,
    generatedDraftHash: `sha256:${'b'.repeat(64)}`,
    qaStatus: 'pending_review',
    reviewerId: '',
    reviewedAt: '',
    reviewStatus: 'draft',
    tags: {
      conceptIds: ['sentence-types'],
      skillIds: ['grammar.foundations'],
      standardIds: ['L.2-6.1'],
      pedagogyMoves: ['model', 'guided_check', 'editing_transfer'],
      commonMistakeIds: ['grammar-sentence-types-common-mistake'],
      exampleTypes: ['direct', 'near_miss', 'transfer'],
      characterRoleIds: ['guide'],
      relatedSubtopicIds: ['grammar-subject-predicate']
    }
  }, overrides);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from, { withFileTypes: true }).forEach(entry => {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  });
}
