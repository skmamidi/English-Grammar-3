const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const designTokens = fs.readFileSync(path.join(repoRoot, 'assets', 'design-tokens.css'), 'utf8');
const appStyles = fs.readFileSync(path.join(repoRoot, 'assets', 'styles.css'), 'utf8');

test('design tokens expose accessibility preference colors for focus, feedback, links, buttons, and alerts', () => {
  const tokens = parseRootTokens(designTokens);

  [
    '--gq-color-focus',
    '--gq-focus-ring',
    '--gq-color-link',
    '--gq-color-link-visited',
    '--gq-color-button-bg',
    '--gq-color-button-text',
    '--gq-color-alert-bg',
    '--gq-color-alert-border',
    '--gq-color-alert-text',
    '--gq-color-feedback-correct',
    '--gq-color-feedback-incorrect'
  ].forEach(token => {
    assert.ok(tokens[token], `${token} should be defined`);
  });
});

test('reduced-motion styles disable animation-dependent quiz and control transitions', () => {
  const block = extractMediaBlock(appStyles, 'prefers-reduced-motion: reduce');

  ['.choice-btn', '.btn', '.feedback-box', '.quiz-progress-track span', '.theme-toggle'].forEach(selector => {
    assert.match(block, new RegExp(escapeRegExp(selector)), `${selector} should be covered by reduced-motion rules`);
  });
  assert.match(block, /animation:\s*none/);
  assert.match(block, /transition:\s*none/);
});

test('forced-colors styles keep focus and feedback cues visible without relying only on color', () => {
  const block = extractMediaBlock(appStyles, 'forced-colors: active');

  assert.match(block, /:focus-visible/);
  assert.match(block, /outline:\s*3px solid Highlight/);
  assert.match(block, /\.choice-btn\.correct/);
  assert.match(block, /\.choice-btn\.incorrect/);
  assert.match(block, /\.feedback-title\.correct::before/);
  assert.match(block, /\.feedback-title\.incorrect::before/);
  assert.match(block, /forced-color-adjust:\s*none/);
});

test('feedback states include textual and symbolic cues beyond color', () => {
  assert.match(appStyles, /\.feedback-title\.correct::before[\s\S]*content:\s*"✓"/);
  assert.match(appStyles, /\.feedback-title\.incorrect::before[\s\S]*content:\s*"!"/);
  assert.match(fs.readFileSync(path.join(repoRoot, 'assets', 'quiz-engine.js'), 'utf8'), /Correct! Star gem found\./);
  assert.match(fs.readFileSync(path.join(repoRoot, 'assets', 'quiz-engine.js'), 'utf8'), /Not quite\. The trail is still open\./);
});

function parseRootTokens(source) {
  const root = source.match(/:root\s*{([\s\S]*?)}/);
  assert.ok(root, 'design-tokens.css should define :root tokens');
  return Object.fromEntries(Array.from(root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
    .map(match => [match[1], match[2].trim()]));
}

function extractMediaBlock(source, query) {
  const start = source.indexOf(`@media (${query})`);
  assert.notEqual(start, -1, `missing @media (${query})`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`unterminated @media (${query})`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
