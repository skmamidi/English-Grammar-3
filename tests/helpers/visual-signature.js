'use strict';

const assert = require('node:assert/strict');

const SCREENSHOT_BYTE_DRIFT_TOLERANCE = 1024;

function assertVisualSignatureMatches(actual, expected) {
  if (isOnlySmallScreenshotDrift(actual, expected)) return;
  assert.deepEqual(actual, expected, 'visual signature mismatch');
}

function isOnlySmallScreenshotDrift(actual, expected) {
  const actualComparable = withoutScreenshotEncoding(actual);
  const expectedComparable = withoutScreenshotEncoding(expected);
  if (!deepEqual(actualComparable, expectedComparable)) return false;
  const byteDelta = Math.abs(Number(actual && actual.screenshotBytes) - Number(expected && expected.screenshotBytes));
  return Number.isFinite(byteDelta) && byteDelta <= SCREENSHOT_BYTE_DRIFT_TOLERANCE;
}

function withoutScreenshotEncoding(signature) {
  const copy = Object.assign({}, signature || {});
  delete copy.screenshotSha256;
  delete copy.screenshotBytes;
  return copy;
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
  SCREENSHOT_BYTE_DRIFT_TOLERANCE
};
