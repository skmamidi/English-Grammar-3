const assert = require('node:assert/strict');
const test = require('node:test');

const { assertVisualSignatureMatches } = require('./helpers/visual-signature');

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
      bodyTextHash: 'changed',
      elements: []
    }
  });

  assert.throws(() => assertVisualSignatureMatches(actual, expected), /visual signature mismatch/);
});

test('visual signatures still fail when screenshot drift is too large', () => {
  const expected = signature({ screenshotBytes: 259808, screenshotSha256: 'expected' });
  const actual = signature({ screenshotBytes: 263000, screenshotSha256: 'actual' });

  assert.throws(() => assertVisualSignatureMatches(actual, expected), /visual signature mismatch/);
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
      bodyTextHash: '475542686',
      elements: [{
        selector: '#quiz-root',
        text: 'Question 1 of 15',
        visible: true,
        rect: { x: 124, y: 87, width: 1032, height: 1614 }
      }]
    }
  }, overrides);
}
