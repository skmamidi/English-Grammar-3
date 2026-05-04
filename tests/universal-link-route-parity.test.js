const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildRouteParityFixtures,
  mapWebRouteToNativeDestination,
  validateRouteParityContract,
  validateUniversalLink
} = require('../assets/universal-link-route-parity');

const repoRoot = path.resolve(__dirname, '..');

test('route parity fixtures cover topic subtopic assignments reports settings account and support routes', () => {
  const fixtures = buildRouteParityFixtures();
  const destinations = fixtures.routes.map(route => route.nativeDestination.type);

  ['home', 'topic_index', 'subtopic_quiz', 'assignment', 'reports', 'settings', 'account', 'subscription', 'support'].forEach(type => {
    assert.ok(destinations.includes(type), `${type} destination should be covered`);
  });

  assert.deepEqual(validateRouteParityContract(fixtures), []);
  fixtures.routes.forEach(route => {
    assert.ok(route.webPath.startsWith('/'), `${route.webPath} should be canonical absolute path`);
    assert.equal(route.destructiveAction, false, `${route.webPath} should not be destructive`);
    assert.ok(route.nativeDestination.screen, `${route.webPath} should map to a native screen`);
  });
});

test('web routes map to safe native destination descriptors', () => {
  assert.deepEqual(mapWebRouteToNativeDestination('/topics/grammar/index.html'), {
    type: 'topic_index',
    screen: 'TopicIndex',
    params: { domain: 'grammar' }
  });
  assert.deepEqual(mapWebRouteToNativeDestination('/topics/grammar/subtopics/sentence-types.html?grade=4&difficulty=medium'), {
    type: 'subtopic_quiz',
    screen: 'Quiz',
    params: { domain: 'grammar', subtopic: 'sentence-types', grade: '4', difficulty: 'medium' }
  });
  assert.deepEqual(mapWebRouteToNativeDestination('/assignments.html?assignmentId=assignment-1'), {
    type: 'assignment',
    screen: 'AssignmentDetail',
    params: { assignmentId: 'assignment-1' }
  });
});

test('universal links reject unsafe parameters unsupported hosts and destructive actions', () => {
  assert.deepEqual(validateUniversalLink('https://grammarquest.app/topics/grammar/subtopics/sentence-types.html?grade=4'), []);
  assert.ok(validateUniversalLink('https://evil.example/topics/grammar/index.html').includes('universal_link_host_not_allowed'));
  assert.ok(validateUniversalLink('https://grammarquest.app/settings.html?action=delete-account').includes('destructive_deep_link_action_forbidden'));
  assert.ok(validateUniversalLink('https://grammarquest.app/assignments.html?assignmentId=../secret').includes('route_parameter_invalid:assignmentId'));
  assert.ok(validateUniversalLink('https://grammarquest.app/admin-operations.html').includes('native_destination_not_supported'));
});

test('route parity docs and unit gate are wired', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'universal-link-route-parity.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /Universal Links/i);
  assert.match(docs, /destructive deep-link actions/i);
  assert.match(docs, /assignment/i);
  assert.match(docs, /subscription/i);
  assert.match(pkg.scripts['test:unit'], /tests\/universal-link-route-parity\.test\.js/);
});
