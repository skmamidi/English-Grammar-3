const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const routeInventory = require('../scripts/qa/page-inventory');

const repoRoot = path.resolve(__dirname, '..');

test('leaderboard route is classified as a shared projection route', () => {
  const inventory = routeInventory.buildRouteCompositionInventory({ root: repoRoot });
  const leaderboard = inventory.routes.find(route => route.path === 'leaderboard.html');

  assert.ok(leaderboard, 'leaderboard.html should be present in the route inventory');
  assert.equal(leaderboard.type, 'leaderboard');
  assert.ok(leaderboard.requiredShellAssets.includes('assets/styles.css'));
  assert.ok(leaderboard.requiredScripts.includes('assets/leaderboard-domain.js'));
  assert.ok(leaderboard.requiredScripts.includes('assets/leaderboard-ui.js'));
  assert.equal(leaderboard.legacyGlobals.length, 0);
});

test('mission route is classified as guided orchestration without generated catalog payloads', () => {
  const inventory = routeInventory.buildRouteCompositionInventory({ root: repoRoot });
  const mission = inventory.routes.find(route => route.path === 'mission.html');

  assert.ok(mission, 'mission.html should be present in the route inventory');
  assert.equal(mission.type, 'guided-mission');
  assert.equal(mission.usesSharedShell, true);
  assert.ok(mission.requiredShellAssets.includes('assets/styles.css'));
  assert.ok(mission.requiredScripts.includes('assets/guided-mission-domain.js'));
  assert.ok(mission.requiredScripts.includes('assets/guided-mission-ui.js'));
  assert.equal(mission.requiredScripts.includes('assets/guided-mission-catalog.js'), false);
  assert.equal(mission.legacyGlobals.length, 0);
});
