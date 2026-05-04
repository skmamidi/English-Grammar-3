#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const {
  buildLessonRouteDescriptor,
  validateStoryLessonRecord
} = require('../../assets/story-lesson-domain');
const {
  generateStoryLessonArtifacts,
  loadStoryLessonSources
} = require('../generate-story-lessons');

const repoRoot = path.resolve(__dirname, '..', '..');
const DEFAULT_REVIEW_RECORDS_PATH = path.join(repoRoot, 'content-review', 'story-lesson-review-records.json');
const DEFAULT_AUTHORING_RECORDS_PATH = path.join(repoRoot, 'content-review', 'story-lesson-authoring-records.json');
const DEFAULT_CHARACTER_CATALOG = {
  sets: [{
    id: 'clue-crew',
    characters: [
      { id: 'mina-mapwise' },
      { id: 'jo-pocket' }
    ]
  }]
};

function runStoryLessonQa(options = {}) {
  const root = options.root || repoRoot;
  const questionManifest = options.questionManifest || readJson(path.join(root, 'assets', 'question-manifest.json'));
  const { lessons, coveragePolicy } = loadStoryLessonSources({ root });
  const reviewRecords = Array.isArray(options.reviewRecords)
    ? options.reviewRecords
    : loadStoryLessonReviewRecords(options.reviewRecordsPath || path.join(root, 'content-review', 'story-lesson-review-records.json'));
  const authoringRecords = Array.isArray(options.authoringRecords)
    ? options.authoringRecords
    : loadStoryLessonAuthoringRecords(options.authoringRecordsPath || path.join(root, 'content-review', 'story-lesson-authoring-records.json'));
  const expected = generateStoryLessonArtifacts({ root, questionManifest });
  const coverage = validateStoryLessonCoverage({
    questionManifest,
    lessons,
    coveragePolicy,
    characterCatalog: options.characterCatalog || DEFAULT_CHARACTER_CATALOG
  });
  const pedagogy = validateStoryLessonPedagogy(lessons);
  const reviewEvidence = validateStoryLessonReviewEvidence({ lessons, reviewRecords });
  const authoringEvidence = validateStoryLessonAuthoringEvidence({ lessons, authoringRecords });
  const freshness = validateStoryLessonFreshness({ root, expected });
  return {
    errors: coverage.errors.concat(pedagogy.errors, reviewEvidence.errors, authoringEvidence.errors, freshness.errors),
    coverage: coverage.summary,
    pedagogy: pedagogy.summary,
    reviewEvidence: reviewEvidence.summary,
    authoringEvidence: authoringEvidence.summary,
    freshness
  };
}

function validateStoryLessonCoverage(options = {}) {
  const questionManifest = options.questionManifest || { sets: [] };
  const lessons = Array.isArray(options.lessons) ? options.lessons : [];
  const coveragePolicy = options.coveragePolicy || { mode: 'strict', domainDeferrals: {} };
  const characterCatalog = options.characterCatalog || DEFAULT_CHARACTER_CATALOG;
  const errors = [];
  const coveredSetIds = new Set();
  const seenRoutes = new Map();
  const sets = Array.isArray(questionManifest.sets) ? questionManifest.sets : [];

  lessons.forEach(lesson => {
    coveredSetIds.add(lesson.setId);
    const validationErrors = validateStoryLessonRecord(lesson, { manifest: questionManifest, characterCatalog });
    if (validationErrors.length) {
      errors.push(issue('invalid_story_lesson_source', `${lesson.setId || 'unknown lesson'}: ${validationErrors.join(', ')}`));
    }
    const route = buildLessonRouteDescriptor({ setId: lesson.setId, domain: lesson.domain }, { manifest: questionManifest });
    if (seenRoutes.has(route.webPath)) {
      errors.push(issue('duplicate_story_lesson_route', `${route.webPath} is used by ${seenRoutes.get(route.webPath)} and ${lesson.setId}.`));
    }
    seenRoutes.set(route.webPath, lesson.setId);
  });

  const excluded = [];
  sets.forEach(set => {
    if (coveredSetIds.has(set.id)) return;
    const deferral = getDomainDeferral(set.domain, coveragePolicy);
    if (deferral) {
      excluded.push(set.id);
      return;
    }
    errors.push(issue('missing_lesson_coverage', `${set.id} is missing story lesson coverage or an explicit fixture-only exclusion.`));
  });

  return {
    errors,
    summary: {
      totalQuestionManifestSets: sets.length,
      coveredSetCount: coveredSetIds.size,
      excludedSetCount: excluded.length
    }
  };
}

function validateStoryLessonPedagogy(lessons) {
  const errors = [];
  const normalizedLessons = Array.isArray(lessons) ? lessons : [];
  normalizedLessons.forEach(lesson => {
    const variants = lesson && lesson.gradeVariants || {};
    Object.keys(variants).forEach(grade => {
      const variant = variants[grade] || {};
      const prefix = `${lesson.setId || 'unknown lesson'} grade ${grade}`;
      const exampleTypes = new Set((Array.isArray(variant.examples) ? variant.examples : [])
        .map(example => String(example && example.type || '').trim()));
      ['direct', 'near_miss', 'transfer'].forEach(type => {
        if (!exampleTypes.has(type)) {
          errors.push(issue('missing_required_example_types', `${prefix} is missing a ${type} example.`));
        }
      });
      (Array.isArray(variant.storyBeats) ? variant.storyBeats : []).forEach((beat, index) => {
        const narrative = safeString(beat && beat.narrative);
        if (isGenericStoryBeat(narrative)) {
          errors.push(issue('generic_story_beat', `${prefix} story beat ${index + 1} is too generic to support pedagogy review.`));
        }
      });
      if (!Array.isArray(variant.storyBeats) || variant.storyBeats.length === 0) {
        errors.push(issue('generic_story_beat', `${prefix} needs at least one concrete character story beat.`));
      }
      (Array.isArray(variant.guidedChecks) ? variant.guidedChecks : []).forEach((check, index) => {
        if (!safeString(check && check.prompt) || !safeString(check && check.answer)) {
          errors.push(issue('empty_guided_check', `${prefix} guided check ${index + 1} needs both prompt and answer.`));
        }
      });
      if (!Array.isArray(variant.guidedChecks) || variant.guidedChecks.length === 0) {
        errors.push(issue('empty_guided_check', `${prefix} needs at least one guided check.`));
      }
      if (!Array.isArray(variant.commonMistakes) || variant.commonMistakes.map(safeString).filter(Boolean).length === 0) {
        errors.push(issue('missing_common_mistake', `${prefix} needs at least one common mistake.`));
      }
      if (!variant.quizHandoff || variant.quizHandoff.targetSetId !== lesson.setId) {
        errors.push(issue('missing_quiz_handoff', `${prefix} needs a quiz handoff back to ${lesson.setId}.`));
      }
      const variantText = collectVariantText(variant);
      if (String(grade) === '2' && isTooComplexForGradeTwo(variantText)) {
        errors.push(issue('grade_variant_too_complex', `${prefix} uses grade 2 text that is too complex; simplify vocabulary, sentence length, or formal terms.`));
      }
      if (['5', '6'].includes(String(grade)) && !hasFormalConceptLanguage(variantText)) {
        errors.push(issue('advanced_variant_missing_formal_language', `${prefix} should introduce formal concept language for upper-grade learners.`));
      }
    });
  });
  return {
    errors,
    summary: {
      checkedLessonCount: normalizedLessons.length,
      checkedVariantCount: normalizedLessons.reduce((count, lesson) => count + Object.keys(lesson.gradeVariants || {}).length, 0)
    }
  };
}

function validateStoryLessonReviewEvidence(options = {}) {
  const lessons = Array.isArray(options.lessons) ? options.lessons : [];
  const records = Array.isArray(options.reviewRecords) ? options.reviewRecords : [];
  const acceptedSetIds = new Set();
  const errors = [];

  records.forEach(record => {
    const setIds = normalizeStringArray(record.lessonSetIds || record.setIds);
    const checks = record.checks || {};
    const hasRequiredChecks = [
      'pedagogyChecked',
      'gradeAppropriatenessChecked',
      'sourceGovernanceChecked',
      'standardsAlignmentChecked',
      'biasSafetyChecked'
    ].every(field => checks[field] === true);
    if (record.status === 'accepted' && record.reviewerId && safeIso(record.reviewedAt) && record.rubricVersion && hasRequiredChecks) {
      setIds.forEach(setId => acceptedSetIds.add(setId));
    }
  });

  lessons.forEach(lesson => {
    if (!acceptedSetIds.has(lesson.setId)) {
      errors.push(issue('missing_accepted_lesson_review', `${lesson.setId} is missing accepted human curriculum review evidence.`));
    }
  });

  return {
    errors,
    summary: {
      reviewRecordCount: records.length,
      acceptedLessonCount: lessons.filter(lesson => acceptedSetIds.has(lesson.setId)).length
    }
  };
}

function validateStoryLessonAuthoringEvidence(options = {}) {
  const lessons = Array.isArray(options.lessons) ? options.lessons : [];
  const records = Array.isArray(options.authoringRecords) ? options.authoringRecords : [];
  const lessonIds = new Set(lessons.map(lesson => safeString(lesson && lesson.setId)).filter(Boolean));
  const acceptedProviders = new Set(['gemini', 'openai']);
  const acceptedStatuses = new Set(['pending_review', 'needs_revision', 'reviewed', 'accepted']);
  const acceptedReviewStatuses = new Set(['draft']);
  const errors = [];
  let validRecordCount = 0;

  records.forEach((record, index) => {
    const label = safeString(record && record.id) || `record ${index + 1}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push(issue('invalid_story_lesson_authoring_record', `${label} must be an object.`));
      return;
    }
    if (hasUnsafeAuthoringMetadata(record)) {
      errors.push(issue('unsafe_story_lesson_authoring_record', `${label} must not include raw prompts, provider responses, reviewer notes, learner data, source text, or API details.`));
      return;
    }
    const issues = [];
    const provider = safeString(record.provider).toLowerCase();
    const gradeBand = safeString(record.gradeBand);
    const qaStatus = safeString(record.qaStatus);
    const reviewStatus = safeString(record.reviewStatus);
    if (!safeString(record.id)) issues.push('id');
    if (!safeString(record.lessonSetId) || !lessonIds.has(safeString(record.lessonSetId))) issues.push('lessonSetId');
    if (!/^[2-6]$/.test(gradeBand)) issues.push('gradeBand');
    if (!acceptedProviders.has(provider)) issues.push('provider');
    if (!safeString(record.modelFamily)) issues.push('modelFamily');
    if (!safeString(record.promptRecordId)) issues.push('promptRecordId');
    if (!safeString(record.draftRecordId)) issues.push('draftRecordId');
    if (!/^sha256:[a-f0-9]{64}$/.test(safeString(record.sourceContextHash))) issues.push('sourceContextHash');
    if (!/^sha256:[a-f0-9]{64}$/.test(safeString(record.generatedDraftHash))) issues.push('generatedDraftHash');
    if (!acceptedStatuses.has(qaStatus)) issues.push('qaStatus');
    if (!acceptedReviewStatuses.has(reviewStatus)) issues.push('reviewStatus');
    const tags = record.tags && typeof record.tags === 'object' ? record.tags : {};
    [
      'conceptIds',
      'skillIds',
      'standardIds',
      'pedagogyMoves',
      'commonMistakeIds',
      'exampleTypes',
      'characterRoleIds',
      'relatedSubtopicIds'
    ].forEach(field => {
      if (!Array.isArray(tags[field]) || tags[field].map(safeString).filter(Boolean).length === 0) issues.push(`tags.${field}`);
    });
    const exampleTypes = new Set(normalizeStringArray(tags.exampleTypes));
    ['direct', 'near_miss', 'transfer'].forEach(type => {
      if (!exampleTypes.has(type)) issues.push(`tags.exampleTypes.${type}`);
    });
    if (issues.length) {
      errors.push(issue('invalid_story_lesson_authoring_record', `${label} has missing or invalid authoring evidence: ${Array.from(new Set(issues)).join(', ')}.`));
      return;
    }
    validRecordCount += 1;
  });

  return {
    errors,
    summary: {
      authoringRecordCount: records.length,
      validAuthoringRecordCount: validRecordCount
    }
  };
}

function loadStoryLessonReviewRecords(recordsPath = DEFAULT_REVIEW_RECORDS_PATH) {
  if (!fs.existsSync(recordsPath)) return [];
  const parsed = readJson(recordsPath);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.records)) return parsed.records;
  throw new Error('story_lesson_review_records_invalid');
}

function loadStoryLessonAuthoringRecords(recordsPath = DEFAULT_AUTHORING_RECORDS_PATH) {
  if (!fs.existsSync(recordsPath)) return [];
  const parsed = readJson(recordsPath);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.records)) return parsed.records;
  throw new Error('story_lesson_authoring_records_invalid');
}

function validateStoryLessonFreshness({ root = repoRoot, expected }) {
  const errors = [];
  (expected && expected.files || []).forEach(file => {
    const fullPath = path.join(root, file.relativePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(issue(freshnessCode(file.relativePath, 'missing'), `${file.relativePath} is missing.`));
      return;
    }
    const actual = fs.readFileSync(fullPath, 'utf8');
    if (actual !== file.contents) {
      errors.push(issue(freshnessCode(file.relativePath, 'stale'), `${file.relativePath} is stale. Run node scripts/generate-story-lessons.js --write.`));
    }
  });
  return { errors };
}

function freshnessCode(relativePath, prefix) {
  if (/story-lesson-manifest\.json$/.test(relativePath)) return `${prefix}_story_lesson_manifest_json`;
  if (/story-lesson-manifest\.js$/.test(relativePath)) return `${prefix}_story_lesson_manifest_script`;
  return `${prefix}_story_lesson_chunk`;
}

function getDomainDeferral(domain, coveragePolicy) {
  return coveragePolicy && coveragePolicy.domainDeferrals && coveragePolicy.domainDeferrals[domain] || null;
}

function issue(code, message) {
  return { code, message };
}

function isGenericStoryBeat(text) {
  const value = safeString(text).toLowerCase();
  if (!value || value.split(/\s+/).length < 6) return true;
  return [
    /^students? learn(s)? (the )?(topic|skill|lesson)\.?$/,
    /^learners? practice(s)? (the )?(topic|skill|lesson)\.?$/,
    /generic story/i,
    /placeholder/i
  ].some(pattern => pattern.test(value));
}

function isTooComplexForGradeTwo(text) {
  const sentences = safeString(text).split(/[.!?]+/).map(item => item.trim()).filter(Boolean);
  const longestSentence = sentences.reduce((max, sentence) => Math.max(max, sentence.split(/\s+/).filter(Boolean).length), 0);
  return longestSentence > 24 && /(subordinate|dependent clause|predicate nominative|syntactic|nominalization|antecedent|appositive)/i.test(text);
}

function hasFormalConceptLanguage(text) {
  return /(capital|punctuat|comma|apostrophe|quotation|sentence|subject|predicate|verb|noun|pronoun|adjective|adverb|preposition|conjunction|clause|phrase|agreement|tense|formal|informal|paragraph|evidence|inference|theme|structure|compare|contrast|context|synonym|antonym|homophone|syllable|root|prefix|suffix|meaning|dictionary|source|feature|guide word|media|research)/i.test(text);
}

function collectVariantText(variant) {
  return [
    (Array.isArray(variant.storyBeats) ? variant.storyBeats : []).map(beat => beat && beat.narrative).join(' '),
    (Array.isArray(variant.conceptRules) ? variant.conceptRules : []).join(' '),
    (Array.isArray(variant.examples) ? variant.examples : []).map(example => `${example && example.text || ''} ${example && example.explanation || ''}`).join(' '),
    (Array.isArray(variant.guidedChecks) ? variant.guidedChecks : []).map(check => `${check && check.prompt || ''} ${check && check.answer || ''}`).join(' '),
    (Array.isArray(variant.commonMistakes) ? variant.commonMistakes : []).join(' ')
  ].join(' ');
}

function normalizeStringArray(values) {
  return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
}

function hasUnsafeAuthoringMetadata(value) {
  const unsafeKeys = new Set([
    'apiKey',
    'answerKey',
    'learnerData',
    'privateSourceText',
    'providerRequest',
    'providerResponse',
    'rawAnswerKey',
    'rawPrompt',
    'reviewerNotes',
    'secret',
    'token'
  ]);
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      current.forEach(item => stack.push(item));
      continue;
    }
    Object.keys(current).forEach(key => {
      if (unsafeKeys.has(key)) stack.push(unsafeAuthoringMetadataMarker);
      const item = current[key];
      if (typeof item === 'string' && /\b(?:OPENAI_API_KEY|GEMINI_API_KEY|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})\b/.test(item)) {
        stack.push(unsafeAuthoringMetadataMarker);
      }
      if (item && typeof item === 'object') stack.push(item);
    });
    if (stack.includes(unsafeAuthoringMetadataMarker)) return true;
  }
  return false;
}

const unsafeAuthoringMetadataMarker = { unsafeAuthoringMetadata: true };

function safeString(value) {
  return String(value || '').trim();
}

function safeIso(value) {
  const date = new Date(value || '');
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (require.main === module) {
  const result = runStoryLessonQa();
  if (result.errors.length) {
    result.errors.forEach(error => console.error(`ERROR: ${error.code}: ${error.message}`));
    process.exit(1);
  }
  console.log(`Story lesson QA passed: ${result.coverage.coveredSetCount} covered, ${result.coverage.excludedSetCount} fixture-only deferrals.`);
}

module.exports = {
  DEFAULT_AUTHORING_RECORDS_PATH,
  loadStoryLessonReviewRecords,
  loadStoryLessonAuthoringRecords,
  runStoryLessonQa,
  validateStoryLessonPedagogy,
  validateStoryLessonCoverage,
  validateStoryLessonFreshness,
  validateStoryLessonAuthoringEvidence,
  validateStoryLessonReviewEvidence
};
