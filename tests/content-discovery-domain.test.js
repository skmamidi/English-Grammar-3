const assert = require('node:assert/strict');
const test = require('node:test');

const manifest = require('../assets/question-manifest.json');
const {
  buildContentDiscoveryIndex,
  resolveDiscoveryRoute,
  searchContentDiscovery
} = require('../assets/content-discovery-domain');

test('content discovery searches manifest metadata by skill id without question payloads', () => {
  const results = searchContentDiscovery(manifest, {
    skillId: 'grammar.sentence-analysis',
    query: 'subject verb',
    limit: 5
  });

  assert.ok(results.length > 0);
  assert.equal(results[0].setId, 'grammar-subject-verb-agreement');
  assert.equal(results[0].domain, 'grammar');
  assert.ok(results[0].skills.some(skill => skill.skillId === 'grammar.sentence-analysis'));
  assertNoQuestionPayload(results[0]);
});

test('content discovery filters standards, grades, difficulty, domain, and set ids deterministically', () => {
  const first = searchContentDiscovery(manifest, {
    standardId: 'L.3-6.1',
    grade: 4,
    difficulty: 'medium',
    domain: 'grammar',
    setId: 'grammar-subject-verb-agreement'
  });
  const second = searchContentDiscovery(manifest, {
    domain: 'grammar',
    difficulty: 'medium',
    grade: '4',
    standardId: 'L.3-6.1',
    setId: 'grammar-subject-verb-agreement'
  });

  assert.deepEqual(first, second);
  assert.equal(first.length, 1);
  assert.equal(first[0].coverage.questionCount, 51);
  assert.deepEqual(first[0].coverage.gradesSupported, [3, 4, 5, 6]);
  assert.deepEqual(first[0].coverage.difficultiesSupported, ['easy', 'hard', 'medium']);
});

test('content discovery empty and unknown queries return safe empty states', () => {
  assert.deepEqual(searchContentDiscovery(manifest, { query: 'zzzz missing topic' }), []);
  assert.deepEqual(searchContentDiscovery(manifest, { skillId: 'missing.skill' }), []);
  assert.deepEqual(searchContentDiscovery({ sets: null }, { query: 'grammar' }), []);
});

test('content discovery route resolution does not require generated chunks', () => {
  const strippedManifest = {
    sets: manifest.sets.map(({ chunkFile, chunks, questions, ...set }) => set)
  };
  const results = searchContentDiscovery(strippedManifest, {
    query: 'homophones',
    domain: 'vocabulary',
    limit: 1
  });
  const route = resolveDiscoveryRoute(results[0]);

  assert.equal(results[0].setId, 'vocabulary-homophones');
  assert.equal(route.topicPath, 'topics/vocabulary/index.html');
  assert.equal(route.subtopicPath, 'topics/vocabulary/subtopics/homophones.html');
  assert.equal(route.unavailableReason, '');
  assertNoQuestionPayload(results[0]);
});

test('content discovery index exposes compact facets for future assignment workflows', () => {
  const index = buildContentDiscoveryIndex(manifest);

  assert.ok(index.facets.domains.includes('grammar'));
  assert.ok(index.facets.skills.includes('grammar.sentence-analysis'));
  assert.ok(index.facets.standards.includes('L.3-6.1'));
  assert.ok(index.facets.grades.includes(4));
  assert.ok(index.facets.difficulties.includes('medium'));
  assert.equal(JSON.stringify(index).includes('"questions"'), false);
});

function assertNoQuestionPayload(value) {
  const source = JSON.stringify(value);
  ['questions', 'question', 'choices', 'answer', 'answers', 'correct', 'explanation'].forEach(key => {
    assert.equal(source.includes(`"${key}"`), false, `result should not include ${key}`);
  });
}
