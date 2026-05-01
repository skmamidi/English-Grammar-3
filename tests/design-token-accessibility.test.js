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

test('feedback readability tokens meet contrast on explanation and study-aid surfaces', () => {
  const tokens = parseRootTokens(appStyles);
  const pairs = [
    ['feedback title success', tokens['--success-text'], tokens['--surface-raised']],
    ['feedback title error', tokens['--error-text'], tokens['--surface-raised']],
    ['correct explanation', tokens['--success-text'], tokens['--success-light']],
    ['incorrect explanation', tokens['--error-text'], tokens['--error-light']],
    ['study aid title', tokens['--warning-text'], tokens['--warning-surface-strong']],
    ['study aid body', tokens['--text'], tokens['--warning-surface-strong']],
    ['study aid link', tokens['--primary-dark'], tokens['--warning-surface-strong']]
  ];

  pairs.forEach(([label, foreground, background]) => {
    assert.ok(contrastRatio(foreground, background) >= 4.5, `${label} contrast should be at least 4.5:1`);
  });
});

test('feedback reveal animation does not reduce text opacity during axe scans', () => {
  const feedbackBlock = extractRuleBlock(appStyles, '.feedback-box');
  const slideUpBlock = extractKeyframesBlock(appStyles, 'slideUp');

  assert.match(feedbackBlock, /animation:\s*slideUp/);
  assert.doesNotMatch(slideUpBlock, /opacity\s*:/, 'feedback reveal animation should not lower text opacity');
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

function extractRuleBlock(source, selector) {
  const expression = new RegExp(`(^|\\n)${escapeRegExp(selector)}\\s*{`);
  const match = source.match(expression);
  assert.ok(match, `missing ${selector}`);
  const start = match.index + match[0].lastIndexOf(selector);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return source.slice(open + 1, close);
}

function extractKeyframesBlock(source, name) {
  const start = source.indexOf(`@keyframes ${name}`);
  assert.notEqual(start, -1, `missing @keyframes ${name}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`unterminated @keyframes ${name}`);
}

function contrastRatio(foreground, background) {
  const light = relativeLuminance(hexToRgb(foreground));
  const dark = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(light, dark);
  const darker = Math.min(light, dark);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb) {
  const channels = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function hexToRgb(hex) {
  const normalized = String(hex || '').trim();
  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  assert.ok(match, `expected 6-digit hex color, got ${hex}`);
  return [0, 2, 4].map(index => Number.parseInt(match[1].slice(index, index + 2), 16));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
