'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SCREENSHOT_BYTE_DRIFT_TOLERANCE = 1024;

function assertVisualSignatureMatches(actual, expected) {
  const result = compareVisualSignatures(actual, expected);
  if (result.matches) return result;
  assert.deepEqual(result.actualComparable, result.expectedComparable, 'visual signature mismatch');
  return result;
}

function compareVisualSignatures(actual, expected) {
  const actualComparable = withoutScreenshotEncoding(actual);
  const expectedComparable = withoutScreenshotEncoding(expected);
  if (!deepEqual(actualComparable, expectedComparable)) {
    return {
      matches: false,
      screenshotOnlyDrift: false,
      actualComparable,
      expectedComparable
    };
  }
  const byteDelta = Math.abs(Number(actual && actual.screenshotBytes) - Number(expected && expected.screenshotBytes));
  return {
    matches: true,
    screenshotOnlyDrift: screenshotEncodingChanged(actual, expected),
    byteDelta: Number.isFinite(byteDelta) ? byteDelta : null,
    actualComparable,
    expectedComparable
  };
}

function writeVisualFailureArtifacts({ actual, expected, screenshot, outputDir, caseName }) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${caseName}.actual.json`), `${JSON.stringify(actual, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, `${caseName}.expected.json`), `${JSON.stringify(expected, null, 2)}\n`);
  const semanticDiff = buildSemanticDiff(actual, expected);
  if (semanticDiff.changedSelectors.length || semanticDiff.hashDelta) {
    fs.writeFileSync(path.join(outputDir, `${caseName}.semantic-diff.json`), `${JSON.stringify(semanticDiff, null, 2)}\n`);
  }
  if (screenshot) fs.writeFileSync(path.join(outputDir, `${caseName}.png`), screenshot);
}

function writeScreenshotDriftArtifact({ actual, expected, result, outputDir, caseName }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const payload = {
    caseName,
    warning: 'Screenshot encoding metadata changed while semantic visual summary matched.',
    screenshotOnlyDrift: true,
    byteDelta: result.byteDelta,
    actual: screenshotMetadata(actual),
    expected: screenshotMetadata(expected),
    runtime: actual && actual.runtime ? actual.runtime : null,
    baselineRuntime: expected && expected.runtime ? expected.runtime : null
  };
  fs.writeFileSync(path.join(outputDir, `${caseName}.screenshot-drift.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

function withoutScreenshotEncoding(signature) {
  const copy = Object.assign({}, signature || {});
  delete copy.screenshotSha256;
  delete copy.screenshotBytes;
  delete copy.runtime;
  if (copy.summary) {
    copy.summary = Object.assign({}, copy.summary);
    delete copy.summary.bodyTextHash;
  }
  return copy;
}

function buildSemanticDiff(actual, expected) {
  const actualSummary = actual && actual.summary || {};
  const expectedSummary = expected && expected.summary || {};
  const actualElements = elementsBySelector(actualSummary.elements);
  const expectedElements = elementsBySelector(expectedSummary.elements);
  const selectors = Array.from(new Set(Object.keys(actualElements).concat(Object.keys(expectedElements)))).sort();
  const changedSelectors = selectors.filter(selector => {
    const actualElement = actualElements[selector] || null;
    const expectedElement = expectedElements[selector] || null;
    return !deepEqual(actualElement, expectedElement);
  }).map(selector => ({
    selector,
    expected: expectedElements[selector] || null,
    actual: actualElements[selector] || null
  }));

  return {
    changedSelectors,
    hashDelta: actualSummary.semanticTextHash !== expectedSummary.semanticTextHash ? {
      expected: expectedSummary.semanticTextHash,
      actual: actualSummary.semanticTextHash
    } : null
  };
}

function elementsBySelector(elements) {
  return (Array.isArray(elements) ? elements : []).reduce((map, element) => {
    if (element && element.selector) map[element.selector] = element;
    return map;
  }, {});
}

function screenshotEncodingChanged(actual, expected) {
  return Boolean(
    actual &&
    expected &&
    (
      actual.screenshotSha256 !== expected.screenshotSha256 ||
      actual.screenshotBytes !== expected.screenshotBytes
    )
  );
}

function screenshotMetadata(signature) {
  return {
    screenshotSha256: signature ? signature.screenshotSha256 : undefined,
    screenshotBytes: signature ? signature.screenshotBytes : undefined
  };
}

function deepEqual(left, right) {
  try {
    assert.deepEqual(left, right);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  assertVisualSignatureMatches,
  compareVisualSignatures,
  buildSemanticDiff,
  writeScreenshotDriftArtifact,
  writeVisualFailureArtifacts,
  SCREENSHOT_BYTE_DRIFT_TOLERANCE
};
