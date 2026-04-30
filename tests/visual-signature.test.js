const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  assertVisualSignatureMatches,
  buildSemanticDiff,
  writeScreenshotDriftArtifact,
  writeVisualFailureArtifacts
} = require('./helpers/visual-signature');

test('visual signatures allow tiny screenshot encoder drift when semantic summary is unchanged', () => {
  const expected = signature({ screenshotBytes: 259808, screenshotSha256: 'expected' });
  const actual = signature({ screenshotBytes: 259814, screenshotSha256: 'actual' });

  assert.doesNotThrow(() => assertVisualSignatureMatches(actual, expected));
});

test('visual signatures still fail when semantic summary changes', () => {
  const expected = signature();
  const actual = signature({
    summary: {
      title: 'Sentence Types',
      semanticTextHash: 'changed',
      elements: [{
        selector: '#quiz-root',
        text: 'Question 2 of 15',
        visible: true,
        rect: { x: 124, y: 87, width: 1032, height: 1614 }
      }]
    }
  });

  assert.throws(() => assertVisualSignatureMatches(actual, expected), /visual signature mismatch/);
});

test('visual signatures ignore unreviewed body text drift when selector summary matches', () => {
  const expected = signature({ summary: Object.assign({}, signature().summary, { bodyTextHash: 'old-body' }) });
  const actual = signature({ summary: Object.assign({}, signature().summary, { bodyTextHash: 'new-body' }) });

  assert.doesNotThrow(() => assertVisualSignatureMatches(actual, expected));
});

test('visual signatures allow large screenshot encoder drift when semantic summary is unchanged', () => {
  const expected = signature({ screenshotBytes: 259808, screenshotSha256: 'expected' });
  const actual = signature({ screenshotBytes: 263000, screenshotSha256: 'actual' });

  const result = assertVisualSignatureMatches(actual, expected);

  assert.equal(result.matches, true);
  assert.equal(result.screenshotOnlyDrift, true);
  assert.equal(result.byteDelta, 3192);
});

test('visual signatures still fail when key element layout changes', () => {
  const expected = signature();
  const actual = signature({
    screenshotBytes: 263000,
    screenshotSha256: 'actual',
    summary: {
      title: 'Sentence Types',
      semanticTextHash: '475542686',
      elements: [{
        selector: '#quiz-root',
        text: 'Question 1 of 15',
        visible: true,
        rect: { x: 124, y: 120, width: 1032, height: 1614 }
      }]
    }
  });

  assert.throws(() => assertVisualSignatureMatches(actual, expected), /visual signature mismatch/);
});

test('visual failure artifacts include actual expected and screenshot files', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-artifacts-'));
  const expected = signature({ screenshotSha256: 'expected' });
  const actual = signature({ screenshotSha256: 'actual' });

  writeVisualFailureArtifacts({
    actual,
    expected,
    screenshot: Buffer.from('png-bytes'),
    outputDir,
    caseName: 'quiz-feedback'
  });

  assert.equal(JSON.parse(fs.readFileSync(path.join(outputDir, 'quiz-feedback.actual.json'), 'utf8')).screenshotSha256, 'actual');
  assert.equal(JSON.parse(fs.readFileSync(path.join(outputDir, 'quiz-feedback.expected.json'), 'utf8')).screenshotSha256, 'expected');
  assert.equal(fs.readFileSync(path.join(outputDir, 'quiz-feedback.png'), 'utf8'), 'png-bytes');
});

test('visual failure artifacts include scoped semantic selector diffs', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-artifacts-'));
  const expected = signature();
  const actual = signature({
    summary: {
      title: 'Sentence Types',
      semanticTextHash: 'changed',
      elements: [{
        selector: '#quiz-root',
        text: 'Question 2 of 15',
        visible: true,
        rect: { x: 124, y: 87, width: 1032, height: 1614 }
      }]
    }
  });

  writeVisualFailureArtifacts({
    actual,
    expected,
    outputDir,
    caseName: 'quiz-question'
  });

  const artifact = JSON.parse(fs.readFileSync(path.join(outputDir, 'quiz-question.semantic-diff.json'), 'utf8'));
  assert.deepEqual(artifact.changedSelectors.map(item => item.selector), ['#quiz-root']);
  assert.equal(artifact.hashDelta.expected, expected.summary.semanticTextHash);
  assert.equal(artifact.hashDelta.actual, 'changed');
});

test('semantic diff names changed reviewed selectors only', () => {
  const expected = signature();
  const actual = signature({
    summary: Object.assign({}, signature().summary, {
      elements: [{
        selector: '#quiz-root',
        text: 'Question 1 of 15 updated',
        visible: true,
        rect: { x: 124, y: 87, width: 1032, height: 1614 }
      }]
    })
  });

  const diff = buildSemanticDiff(actual, expected);

  assert.deepEqual(diff.changedSelectors.map(item => item.selector), ['#quiz-root']);
  assert.equal(diff.changedSelectors[0].expected.text, 'Question 1 of 15');
  assert.equal(diff.changedSelectors[0].actual.text, 'Question 1 of 15 updated');
});

test('screenshot drift artifact records metadata without failing semantic match', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-drift-'));
  const expected = signature({ screenshotBytes: 259808, screenshotSha256: 'expected' });
  const actual = signature({ screenshotBytes: 263000, screenshotSha256: 'actual' });
  const result = assertVisualSignatureMatches(actual, expected);

  writeScreenshotDriftArtifact({
    actual,
    expected,
    result,
    outputDir,
    caseName: 'quiz-feedback'
  });

  const artifact = JSON.parse(fs.readFileSync(path.join(outputDir, 'quiz-feedback.screenshot-drift.json'), 'utf8'));
  assert.equal(artifact.screenshotOnlyDrift, true);
  assert.equal(artifact.byteDelta, 3192);
  assert.equal(artifact.actual.screenshotSha256, 'actual');
  assert.equal(artifact.expected.screenshotSha256, 'expected');
});

function signature(overrides = {}) {
  return Object.assign({
    name: 'quiz-feedback',
    file: 'topics/grammar/subtopics/sentence-types.html',
    viewport: { width: 1280, height: 900 },
    screenshotSha256: 'ecdb94e332ab19fbc304a09ef23420d1ee0dd9283622f44e6bbf338f52c425b8',
    screenshotBytes: 259808,
    summary: {
      title: 'Sentence Types',
      semanticTextHash: '475542686',
      elements: [{
        selector: '#quiz-root',
        text: 'Question 1 of 15',
        visible: true,
        rect: { x: 124, y: 87, width: 1032, height: 1614 }
      }]
    }
  }, overrides);
}
