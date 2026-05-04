const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildNativeDesignTokenExport,
  validateNativeDesignTokenExport
} = require('../scripts/generate-native-design-tokens');

const repoRoot = path.resolve(__dirname, '..');

test('native design token export preserves semantic token categories', () => {
  const exportDoc = buildNativeDesignTokenExport({ root: repoRoot });

  assert.equal(exportDoc.schemaVersion, 1);
  assert.equal(exportDoc.generatedFrom, 'assets/design-tokens.css');
  assert.ok(exportDoc.color.primary.value);
  assert.ok(exportDoc.color.focus.value);
  assert.ok(exportDoc.typeScale.md.value);
  assert.ok(exportDoc.spacing[4].value);
  assert.ok(exportDoc.radius.sm.value);
  assert.ok(exportDoc.focus.ring.value);
  assert.ok(exportDoc.contrast.minimumTextRatio >= 4.5);
  assert.equal(exportDoc.motion.reducedMotion.required, true);
  assert.ok(exportDoc.elevation.raised.value);
  assert.ok(exportDoc.icons.names.includes('check'));
  assert.deepEqual(validateNativeDesignTokenExport(exportDoc).errors, []);
});

test('native design token export validates asset metadata and accessibility variants', () => {
  const exportDoc = buildNativeDesignTokenExport({ root: repoRoot });
  const asset = exportDoc.assets.find(entry => entry.role === 'app-icon');

  assert.ok(asset, 'expected app-icon asset metadata');
  assert.deepEqual(asset.platforms, ['ios', 'ipadOS', 'web']);
  assert.deepEqual(asset.scaleFactors, [1, 2, 3]);
  assert.equal(asset.license, 'project-owned');
  assert.equal(asset.cacheCategory, 'critical-shell');
  assert.equal(asset.localizationSensitive, false);
  assert.ok(asset.variants.includes('dark'));
  assert.ok(asset.variants.includes('high-contrast'));

  assert.ok(validateNativeDesignTokenExport(setPath(exportDoc, ['color', 'primary', 'value'], '#eeeeee')).errors.some(error => error.code === 'contrast_ratio_too_low'));
  assert.ok(validateNativeDesignTokenExport(setPath(exportDoc, ['assets', 0, 'license'], '')).errors.some(error => error.code === 'missing_asset_license'));
  assert.ok(validateNativeDesignTokenExport(setPath(exportDoc, ['assets', 0, 'platforms'], ['web'])).errors.some(error => error.code === 'missing_native_platform'));
  assert.ok(validateNativeDesignTokenExport(setPath(exportDoc, ['color', 'pageHero', 'value'], '#123456')).errors.some(error => error.code === 'page_specific_token'));
});

test('checked-in native design token export matches deterministic generator output', () => {
  const generated = buildNativeDesignTokenExport({ root: repoRoot });
  const committed = JSON.parse(fs.readFileSync(path.join(repoRoot, 'assets', 'native-design-tokens.json'), 'utf8'));

  assert.deepEqual(committed, generated);
});

test('native design token docs and unit wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'native-design-tokens.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /native-consumable/i);
  assert.match(docs, /Swift\/iPadOS constants/i);
  assert.match(docs, /semantic tokens/i);
  assert.match(docs, /scale factors/i);
  assert.match(docs, /dark\/high-contrast variants/i);
  assert.match(docs, /assets\/native-design-tokens\.json/);
  assert.match(pkg.scripts['test:unit'], /tests\/native-design-token-export\.test\.js/);
});

function setPath(value, parts, replacement) {
  const clone = JSON.parse(JSON.stringify(value));
  let target = clone;
  parts.slice(0, -1).forEach(part => {
    if (!target[part]) target[part] = {};
    target = target[part];
  });
  target[parts[parts.length - 1]] = replacement;
  return clone;
}
