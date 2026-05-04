const assert = require('node:assert/strict');
const test = require('node:test');

const questionManifest = require('../assets/question-manifest.json');
const lessonManifest = require('../assets/story-lesson-manifest.json');
const {
  normalizeStudyAidInternalLinks,
  validateStudyAidInternalLinks
} = require('../assets/study-aid-link-domain');

test('study aid links normalize primary and related lesson route descriptors', () => {
  const links = normalizeStudyAidInternalLinks({
    sourceSet: 'grammar-sentence-types',
    studyAid: {
      internalLinks: [
        { targetSetId: 'grammar-sentence-types', reason: 'primary' },
        { targetSetId: 'grammar-subject-predicate', reason: 'foundation' },
        { targetSetId: 'grammar-sentence-correction', reason: 'next_step' },
        { targetSetId: 'grammar-run-on-sentences', reason: 'overflow' }
      ]
    },
    questionManifest,
    lessonManifest,
    limit: 3
  });

  assert.deepEqual(links.map(link => link.targetSetId), [
    'grammar-sentence-types',
    'grammar-subject-predicate',
    'grammar-sentence-correction'
  ]);
  assert.equal(links[0].label, 'Review this lesson');
  assert.equal(links[0].route.webPath, 'topics/grammar/subtopics/sentence-types.html?learn=1');
  assert.equal(links[1].route.params.learn, '1');
});

test('study aid links reject unsafe duplicate and unknown targets', () => {
  const result = validateStudyAidInternalLinks({
    sourceSet: 'grammar-sentence-types',
    studyAid: {
      internalLinks: [
        { targetSetId: 'https://evil.example/lesson', reason: 'external' },
        { targetSetId: 'grammar-unknown', reason: 'missing' },
        { targetSetId: 'grammar-sentence-types', reason: 'primary' },
        { targetSetId: 'grammar-sentence-types', reason: 'duplicate' }
      ]
    },
    questionManifest,
    lessonManifest
  });

  assert.ok(result.errors.includes('study_aid_internal_link_target_unsafe:https://evil.example/lesson'));
  assert.ok(result.errors.includes('study_aid_internal_link_target_unknown:grammar-unknown'));
  assert.ok(result.errors.includes('study_aid_internal_link_duplicate:grammar-sentence-types'));
});

test('study aid link metadata excludes question text learner identity and external URLs', () => {
  const links = normalizeStudyAidInternalLinks({
    sourceSet: 'grammar-sentence-types',
    studyAid: {},
    questionManifest,
    lessonManifest
  });
  const serialized = JSON.stringify(links);

  assert.equal(links.length, 1);
  assert.equal(serialized.includes('question'), false);
  assert.equal(serialized.includes('learner'), false);
  assert.equal(serialized.includes('https://'), false);
});
