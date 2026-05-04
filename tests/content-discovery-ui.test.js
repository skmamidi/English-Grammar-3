const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const manifest = require('../assets/question-manifest.json');
const {
  createAssignmentPrefill,
  renderContentDiscovery,
  selectDiscoveryResults
} = require('../assets/content-discovery-ui');

test('content discovery UI renders search controls, filters, and safe result actions', () => {
  const html = renderContentDiscovery({
    manifest,
    filters: { query: 'sentence', domain: 'grammar', grade: 4, difficulty: 'medium', limit: 3 },
    actor: { role: 'teacher' }
  });

  assert.match(html, /role="search"/);
  assert.match(html, /aria-label="Search content"/);
  assert.match(html, /Start practice/);
  assert.match(html, /Copy route/);
  assert.match(html, /Prefill assignment/);
  assert.equal(html.includes('"questions"'), false);
  assert.equal(html.includes('"choices"'), false);
  assert.equal(html.includes('"explanation"'), false);
});

test('content discovery UI hides teacher-only assignment actions for learners', () => {
  const html = renderContentDiscovery({
    manifest,
    filters: { query: 'homophones', limit: 1 },
    actor: { role: 'student' }
  });

  assert.match(html, /Start practice/);
  assert.match(html, /href="topics\/vocabulary\/subtopics\/homophones\.html\?practice=1"/);
  assert.match(html, /data-copy-route="topics\/vocabulary\/subtopics\/homophones\.html"/);
  assert.doesNotMatch(html, /Prefill assignment/);
});

test('content discovery selection remains deterministic and manifest-only', () => {
  const first = selectDiscoveryResults(manifest, {
    query: 'subject verb',
    domain: 'grammar',
    grade: '4',
    difficulty: 'medium'
  });
  const second = selectDiscoveryResults(manifest, {
    difficulty: 'medium',
    grade: 4,
    domain: 'grammar',
    query: 'subject verb'
  });

  assert.deepEqual(first, second);
  assert.ok(first.length > 0);
  assert.equal(JSON.stringify(first).includes('questionSnapshots'), false);
  assert.equal(JSON.stringify(first).includes('"question"'), false);
});

test('assignment prefill is teacher scoped and ref-only', () => {
  const result = selectDiscoveryResults(manifest, { query: 'homophones', domain: 'vocabulary', limit: 1 })[0];
  const assignment = createAssignmentPrefill(result, {
    actor: { id: 'teacher-1', role: 'teacher' },
    now: () => '2030-04-29T12:00:00.000Z'
  });

  assert.equal(assignment.assignedBy.actorId, 'teacher-1');
  assert.deepEqual(assignment.scope.setIds, ['vocabulary-homophones']);
  assert.deepEqual(assignment.scope.domainIds, ['vocabulary']);
  assert.equal(assignment.quizOptions.mode, 'assignment');
  assert.equal(JSON.stringify(assignment).includes('choices'), false);
  assert.throws(() => createAssignmentPrefill(result, {
    actor: { id: 'student-1', role: 'student' }
  }), /assignment_prefill_requires_teacher/);
});

test('discovery page loads manifest metadata without generated question chunks', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'discovery.html'), 'utf8');

  assert.match(html, /assets\/question-manifest\.js/);
  assert.match(html, /assets\/content-discovery-ui\.js/);
  assert.doesNotMatch(html, /assets\/question-loader\.js/);
  assert.doesNotMatch(html, /assets\/question-chunks\//);
  assert.doesNotMatch(html, /assets\/question-banks\//);
});
