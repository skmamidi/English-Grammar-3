const assert = require('node:assert/strict');
const test = require('node:test');

const { createComponentHarness } = require('./helpers/component-harness');
const leaderboardUi = require('../assets/leaderboard-ui');

const projection = {
  schemaVersion: 1,
  periodId: 'weekly_2030_W18',
  periodType: 'weekly',
  generatedAt: '2030-04-29T12:00:00.000Z',
  entries: [
    { rank: 1, participantRef: 'leaderboardParticipants/sky-reader', displayAlias: 'Sky Reader', score: 180, lastAwardedAt: '2030-04-29T10:00:00.000Z', awardCount: 4 },
    { rank: 2, participantRef: 'leaderboardParticipants/current', displayAlias: 'Comma Captain', score: 140, lastAwardedAt: '2030-04-29T09:00:00.000Z', awardCount: 3 },
    { rank: 3, participantRef: 'leaderboardParticipants/owl-verb', displayAlias: 'Verb Voyager', score: 90, lastAwardedAt: '2030-04-28T09:00:00.000Z', awardCount: 2 }
  ]
};

test('leaderboard UI renders materialized weekly monthly and all-time read models', () => {
  const model = leaderboardUi.buildLeaderboardRouteViewModel({
    period: 'weekly',
    participantRef: 'leaderboardParticipants/current',
    profile: { optedIn: true, displayAlias: 'Comma Captain' },
    projections: {
      weekly: projection,
      monthly: Object.assign({}, projection, { periodId: 'monthly_2030_04', periodType: 'monthly' }),
      allTime: Object.assign({}, projection, { periodId: 'all_time', periodType: 'all_time' })
    }
  });

  assert.equal(model.state, 'ready');
  assert.equal(model.period, 'weekly');
  assert.deepEqual(model.periodTabs.map(tab => [tab.id, tab.selected]), [
    ['weekly', true],
    ['monthly', false],
    ['allTime', false]
  ]);
  assert.deepEqual(model.topEntries.map(entry => [entry.rank, entry.displayAlias, entry.score]), [
    [1, 'Sky Reader', 180],
    [2, 'Comma Captain', 140],
    [3, 'Verb Voyager', 90]
  ]);
  assert.equal(model.ownEntry.rank, 2);
  assert.equal(JSON.stringify(model).includes('learnerId'), false);
});

test('leaderboard UI exposes opt-out offline and empty states without global ranks', () => {
  const optedOut = leaderboardUi.buildLeaderboardRouteViewModel({
    profile: { optedIn: false },
    projections: { weekly: projection },
    xpSummary: { totalXp: 430, weeklyXp: 85 }
  });
  assert.equal(optedOut.state, 'opted_out');
  assert.equal(optedOut.topEntries.length, 0);
  assert.match(optedOut.stateCopy, /guardian/i);
  assert.equal(optedOut.personalXp.totalXp, 430);

  const offline = leaderboardUi.buildLeaderboardRouteViewModel({
    online: false,
    profile: { optedIn: true, displayAlias: 'Comma Captain' },
    projections: { weekly: projection }
  });
  assert.equal(offline.state, 'offline');
  assert.equal(offline.topEntries.length, 0);

  const empty = leaderboardUi.buildLeaderboardRouteViewModel({
    profile: { optedIn: true, displayAlias: 'Comma Captain' },
    projections: { weekly: Object.assign({}, projection, { entries: [] }) }
  });
  assert.equal(empty.state, 'empty');
});

test('leaderboard markup is semantic keyboard friendly and privacy safe', () => {
  const model = leaderboardUi.buildLeaderboardRouteViewModel({
    period: 'weekly',
    participantRef: 'leaderboardParticipants/current',
    profile: { optedIn: true, displayAlias: 'Comma Captain' },
    projections: { weekly: projection }
  });
  const harness = createComponentHarness();
  const html = leaderboardUi.renderLeaderboard(model);

  harness.render(html);
  assert.equal(harness.getByRole('tab', { name: 'Weekly' }).attrs['aria-selected'], 'true');
  assert.equal(harness.getByRole('table', { name: 'Weekly leaderboard rankings' }).text.includes('Comma Captain'), true);
  assert.equal(harness.queryByText('Your rank').text.includes('#2'), true);
  harness.assertTouchTarget('button', 44);
  harness.assertFocusVisible('button');
  harness.assertNoOverflowText({ maxWordLength: 24 });
  harness.assertNoUnsafeCopy();
});
