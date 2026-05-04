const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_VISUAL_STATE_MATRIX,
  REQUIRED_VISUAL_FLOWS,
  REQUIRED_VISUAL_STATES,
  validateVisualStateMatrix
} = require('../assets/visual-state-matrix');

const baselineRoot = path.join(__dirname, 'visual-baselines');
const repoRoot = path.resolve(__dirname, '..');

test('visual state matrix covers required major flows and states', () => {
  const result = validateVisualStateMatrix(DEFAULT_VISUAL_STATE_MATRIX, { baselineNames: listBaselineNames() });
  const flows = new Set(result.matrix.entries.map(entry => entry.flow));
  const states = new Set(result.matrix.entries.map(entry => entry.state));

  assert.deepEqual(result.errors, []);
  REQUIRED_VISUAL_FLOWS.forEach(flow => assert.ok(flows.has(flow), `missing flow ${flow}`));
  REQUIRED_VISUAL_STATES.forEach(state => assert.ok(states.has(state), `missing state ${state}`));
});

test('visual state matrix entries reference baselines or deliberate non-visual coverage reasons', () => {
  const result = validateVisualStateMatrix(DEFAULT_VISUAL_STATE_MATRIX, { baselineNames: listBaselineNames() });

  result.matrix.entries.forEach(entry => {
    assert.ok(entry.visualCase || entry.nonVisualReason, `${entry.id} needs a visualCase or nonVisualReason`);
    assert.equal(Boolean(entry.visualCase && entry.nonVisualReason), false, `${entry.id} should not mix baseline and non-visual coverage`);
    if (entry.visualCase) {
      assert.ok(listBaselineNames().includes(entry.visualCase), `${entry.id} references missing baseline ${entry.visualCase}`);
    }
    if (entry.nonVisualReason) {
      assert.match(entry.nonVisualReason, /(component|smoke|unit|accessibility|deterministic)/i);
    }
  });
});

test('visual state matrix rejects missing coverage and high-churn placeholders', () => {
  const result = validateVisualStateMatrix({
    entries: [{
      id: 'quiz-loading',
      flow: 'quiz',
      state: 'loading',
      route: 'topics/grammar/subtopics/sentence-types.html',
      visualCase: 'missing-baseline',
      nonVisualReason: '',
      selectors: []
    }]
  }, { baselineNames: listBaselineNames() });

  assert.deepEqual(result.errors, [
    'quiz-loading visualCase missing-baseline has no baseline',
    'quiz-loading selectors are required for visual baseline coverage',
    'flow discovery is missing',
    'flow story-lesson is missing',
    'flow reports is missing',
    'flow dashboard is missing',
    'flow subscription is missing',
    'flow offline is missing',
    'flow settings is missing',
    'flow operations is missing',
    'state empty is missing',
    'state error is missing',
    'state offline is missing',
    'state disabled is missing',
    'state lesson-loaded is missing',
    'state guided-check-feedback is missing',
    'state reduced-motion is missing',
    'state parent-preview is missing',
    'state teacher-view is missing',
    'state guardian-view is missing',
    'state admin-view is missing'
  ]);
});

test('visual state matrix docs explain baseline and non-visual coverage rules', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'ui-regression.md'), 'utf8');

  assert.match(docs, /visual state matrix/i);
  assert.match(docs, /baseline or a non-visual coverage reason/i);
  assert.match(docs, /loading, empty, error, offline, disabled, lesson-loaded, guided-check-feedback, reduced-motion, parent preview, teacher view, guardian view, and admin view/i);
  assert.match(docs, /quiz, discovery, story-lesson, reports, dashboards, offline, settings, and operations flows/i);
});

function listBaselineNames() {
  return fs.readdirSync(baselineRoot)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/, ''))
    .sort();
}
