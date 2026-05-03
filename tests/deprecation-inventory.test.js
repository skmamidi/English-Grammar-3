const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEPRECATION_INVENTORY,
  REQUIRED_DEPRECATION_TYPES,
  summarizeDeprecationInventory,
  validateDeprecationInventory
} = require('../assets/deprecation-inventory');

const repoRoot = path.resolve(__dirname, '..');

test('deprecation inventory covers required compatibility and dead-code types', () => {
  const presentTypes = new Set(DEPRECATION_INVENTORY.map(item => item.type));

  REQUIRED_DEPRECATION_TYPES.forEach(type => {
    assert.ok(presentTypes.has(type), `missing inventory type ${type}`);
  });
});

test('deprecation inventory items have owner reason replacement review and removal metadata', () => {
  const result = validateDeprecationInventory(DEPRECATION_INVENTORY, {
    root: repoRoot,
    now: new Date('2026-05-03T00:00:00Z')
  });

  assert.deepEqual(result.errors, []);
  DEPRECATION_INVENTORY.forEach(item => {
    assert.match(item.id, /^dep-[a-z0-9-]+$/);
    assert.match(item.owner, /^[a-z][a-z0-9-]+$/);
    assert.match(item.introducedByPr, /^PR-\d+$/);
    assert.match(item.reviewDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.reasonRetained.length > 20, `${item.id} reason should be useful`);
    assert.ok(item.replacement.length > 5, `${item.id} replacement should be declared`);
    assert.ok(item.removalCriteria.length > 20, `${item.id} removal criteria should be useful`);
    assert.ok(['low', 'medium', 'high', 'critical'].includes(item.riskLevel), `${item.id} risk level should be valid`);
    assert.ok(Array.isArray(item.tests) && item.tests.length >= 1, `${item.id} tests are required`);
  });
});

test('deprecation validation rejects expired ownerless and untested entries', () => {
  const result = validateDeprecationInventory([
    Object.assign({}, DEPRECATION_INVENTORY[0], {
      id: 'dep-expired-ownerless',
      owner: '',
      reviewDate: '2026-01-01',
      tests: [],
      removalCriteria: ''
    })
  ], {
    root: repoRoot,
    now: new Date('2026-05-03T00:00:00Z')
  });

  assert.ok(result.errors.includes('dep-expired-ownerless owner is required'));
  assert.ok(result.errors.includes('dep-expired-ownerless review date is expired'));
  assert.ok(result.errors.includes('dep-expired-ownerless removal criteria is required'));
  assert.ok(result.errors.includes('dep-expired-ownerless tests are required'));
});

test('deprecation inventory separates active compatibility fixture-only and dead-code candidates', () => {
  const summary = summarizeDeprecationInventory(DEPRECATION_INVENTORY);

  assert.ok(summary.byStatus.active_compatibility >= 1);
  assert.ok(summary.byStatus.fixture_only >= 1);
  assert.ok(summary.byStatus.dead_code_candidate >= 1);
  assert.ok(summary.byType.legacy_global >= 1);
  assert.ok(summary.byType.compatibility_alias >= 1);
  assert.ok(summary.byType.unmigrated_route_script >= 1);
  assert.ok(summary.byType.orphaned_fixture >= 1);
  assert.ok(summary.byType.duplicate_helper >= 1);
});

test('inventory paths symbols and tests point to existing project evidence', () => {
  DEPRECATION_INVENTORY.forEach(item => {
    if (item.path) {
      assert.ok(fs.existsSync(path.join(repoRoot, item.path)), `${item.id} path should exist: ${item.path}`);
    }
    item.tests.forEach(testPath => {
      assert.ok(fs.existsSync(path.join(repoRoot, testPath)), `${item.id} test should exist: ${testPath}`);
    });
  });
});

test('deprecation QA command docs and unit wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'deprecation-inventory.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(repoRoot, 'docs', 'milestone-roadmap.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /deprecation and ownership inventory/i);
  assert.match(docs, /npm run qa:deprecations/);
  assert.match(docs, /new compatibility paths require inventory entries/i);
  assert.match(roadmap, /compatibility paths require inventory entries/i);
  assert.equal(pkg.scripts['qa:deprecations'], 'node scripts/qa/deprecation-inventory.js');
  assert.match(pkg.scripts['test:unit'], /tests\/deprecation-inventory\.test\.js/);
});
