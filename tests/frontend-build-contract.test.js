const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

test('frontend build exposes a native module entry for the migrated settings slice', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'settings.html'), 'utf8');
  const entry = fs.readFileSync(path.join(repoRoot, 'assets', 'app-entry.js'), 'utf8');
  const builtEntry = fs.readFileSync(path.join(repoRoot, 'assets', 'build', 'app-entry.js'), 'utf8');

  assert.match(html, /<script\s+type="module"\s+src="assets\/build\/app-entry\.js"/);
  assert.doesNotMatch(html, /assets\/privacy-settings-ui\.js/);
  assert.match(entry, /import\s+\{\s*initPrivacySettings\s*\}/);
  assert.equal(builtEntry, entry);
});

test('frontend build manifest is deterministic and keeps generated question artifacts out of the shell', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'assets', 'build', 'frontend-manifest.json'), 'utf8'));

  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.entrypoints, ['assets/build/app-entry.js']);
  assert.ok(manifest.files.some(file => file.path === 'assets/build/privacy-settings-ui.js'));
  assert.equal(manifest.files.some(file => /question-(chunks|manifest)/.test(file.path)), false);
  manifest.files.forEach(file => {
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    assert.equal(Number.isInteger(file.bytes), true);
    assert.ok(file.bytes > 0);
  });
});

test('frontend build command is exposed and included in reproducible unit gates', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['build:frontend'], 'node scripts/build-frontend.js');
  assert.match(pkg.scripts['test:unit'], /tests\/frontend-build-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/domain-type-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/app-shell-size-budget\.test\.js/);
});
