const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_UI_COPY_POLICY,
  REQUIRED_COPY_CATEGORIES,
  buildCopyCatalog,
  validateCopyEntry,
  validateUiCopyPolicy
} = require('../assets/ui-copy-policy');

const repoRoot = path.resolve(__dirname, '..');

test('UI copy policy defines required audience and surface categories', () => {
  const result = validateUiCopyPolicy(DEFAULT_UI_COPY_POLICY);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.policy.categories.map(category => category.id), REQUIRED_COPY_CATEGORIES);
});

test('copy catalog is localization-ready and keyed by owned surfaces', () => {
  const catalog = buildCopyCatalog(DEFAULT_UI_COPY_POLICY);

  assert.equal(catalog.locale, 'en-US');
  assert.ok(catalog.entries.length >= REQUIRED_COPY_CATEGORIES.length);
  catalog.entries.forEach(entry => {
    assert.match(entry.key, /^[a-z][a-z0-9.]*$/);
    assert.ok(entry.owner);
    assert.ok(entry.category);
    assert.ok(entry.surface);
    assert.ok(entry.text);
  });
  assert.doesNotMatch(JSON.stringify(catalog), /stack trace|TypeError|ReferenceError|learnerId|studentId|token|private key/i);
  assert.ok(catalog.entries.some(entry => entry.key === 'mission.reminder.duesoon'));
  assert.ok(catalog.entries.some(entry => entry.key === 'mission.dashboard.completed'));
});

test('copy validation rejects unsafe technical and overlong learner-facing copy', () => {
  const unsafe = validateCopyEntry({
    key: 'quiz.error.raw',
    category: 'learner_error',
    surface: 'quiz',
    audience: 'learner',
    owner: '',
    text: 'TypeError: Cannot read properties of undefined at stack trace with learnerId=abc and token=secret',
    maxLength: 40
  });

  assert.deepEqual(unsafe.errors, [
    'owner is required',
    'quiz.error.raw text exceeds maxLength 40',
    'quiz.error.raw contains raw technical diagnostics',
    'quiz.error.raw contains unsafe private or learner data'
  ]);
});

test('representative default copy stays bounded and audience-safe', () => {
  const result = validateUiCopyPolicy(DEFAULT_UI_COPY_POLICY);

  result.policy.entries.forEach(entry => {
    const validation = validateCopyEntry(entry);
    assert.deepEqual(validation.errors, [], `${entry.key} should be valid`);
    if (entry.audience === 'learner') {
      assert.doesNotMatch(entry.text, /failed|fatal|stack|exception|undefined|denied|unauthorized/i);
    }
  });
});

test('UI copy documentation defines ownership and localization readiness', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'ui-copy.md'), 'utf8');

  [
    'learner_control',
    'learner_empty_state',
    'learner_error',
    'guardian_dashboard',
    'teacher_dashboard',
    'operator_status',
    'mission.reminder.duesoon'
  ].forEach(category => {
    assert.match(docs, new RegExp('`' + category + '`'), `docs should include ${category}`);
  });

  assert.match(docs, /English-only/i);
  assert.match(docs, /localization-ready/i);
  assert.match(docs, /raw technical diagnostics/i);
  assert.match(docs, /bounded length/i);
});
