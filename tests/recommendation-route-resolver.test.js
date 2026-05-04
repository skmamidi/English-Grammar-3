const assert = require('node:assert/strict');
const test = require('node:test');

const resolver = require('../assets/recommendation-route-resolver');

test('recommendation route resolver prefers review then assignment then manifest coverage', () => {
  assert.deepEqual(resolver.resolveRecommendationTarget({
    skillId: 'grammar.subject-verb',
    evidence: { overdueReviewCount: 1 }
  }, {
    reviewQueue: { queueId: 'review-1' },
    assignments: [{ id: 'assignment-1', status: 'active', scope: { skillIds: ['grammar.subject-verb'] } }],
    manifest: { sets: [{ id: 'grammar-subject-verb-agreement', domain: 'grammar', skillCoverage: [{ skillId: 'grammar.subject-verb' }] }] }
  }), {
    type: 'review',
    reviewQueueId: 'review-1',
    domainId: '',
    setIds: [],
    assignmentId: ''
  });

  assert.equal(resolver.resolveRecommendationTarget({
    skillId: 'grammar.subject-verb',
    evidence: { overdueReviewCount: 0 }
  }, {
    assignments: [{ id: 'assignment-1', status: 'active', scope: { skillIds: ['grammar.subject-verb'] } }],
    manifest: { sets: [] }
  }).type, 'assignment');

  assert.equal(resolver.resolveRecommendationTarget({
    skillId: 'grammar.subject-verb',
    evidence: {}
  }, {
    assignments: [],
    manifest: { sets: [{ id: 'grammar-subject-verb-agreement', domain: 'grammar', skillCoverage: [{ skillId: 'grammar.subject-verb' }] }] }
  }).type, 'subtopic');
});

test('recommendation route resolver can target story lessons from weak skills without question payloads', () => {
  const target = resolver.resolveRecommendationTarget({
    skillId: 'grammar.sentence-analysis',
    evidence: { missedRecentlyCount: 2 }
  }, {
    assignments: [],
    manifest: {
      sets: [{
        id: 'grammar-sentence-types',
        domain: 'grammar',
        title: 'Sentence Types',
        skillCoverage: [{ skillId: 'grammar.sentence-analysis' }]
      }]
    },
    storyLessonManifest: {
      lessons: [{
        setId: 'grammar-sentence-types',
        title: 'Sentence Types',
        route: { webPath: 'topics/grammar/subtopics/sentence-types.html?learn=1' },
        storyBeats: [{ narrative: 'Do not copy story body' }]
      }]
    }
  });

  assert.equal(target.type, 'lesson');
  assert.deepEqual(target.lessonRef, {
    setId: 'grammar-sentence-types',
    title: 'Sentence Types',
    route: 'topics/grammar/subtopics/sentence-types.html?learn=1'
  });
  assert.equal(JSON.stringify(target).includes('Do not copy'), false);
});
