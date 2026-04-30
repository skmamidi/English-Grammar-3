const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { validateRegistry } = require('../scripts/qa/pr-readiness-monitor.js');

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-readiness-'));
  fs.mkdirSync(path.join(root, 'docs/prs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/milestone-roadmap.md'), [
    '| Status | Number | Task | Evidence / Notes |',
    '| --- | --- | --- | --- |',
    '| ✅ | 12.7 | Add privacy consent and telemetry opt-out controls | Done. |',
    '| ⬜ | 6.10 | Add health-check and readiness endpoints for server selection | Todo. |',
    '| ⬜ | 7.9 | Add cross-browser smoke coverage | Todo. |',
    '| ⬜ | 7.10 | Add automated accessibility engine coverage | Todo. |',
    '| ⬜ | 7.11 | Add reduced-motion and high-contrast mode coverage | Todo. |',
    '| ⬜ | 13.5 | Add operational runbooks for common failures | Todo. |',
    ''
  ].join('\n'));
  for (const number of [85, 95, 96, 97, 98, 99]) {
    fs.writeFileSync(path.join(root, `docs/prs/${number}-fixture.md`), `# PR ${number}\n`);
  }
  return root;
}

function validRegistry() {
  return {
    schemaVersion: 1,
    updatedAt: '2026-04-30T12:38:01Z',
    policy: {
      recentCompletionLookbackMinutes: 30,
      readyPrMinimum: 5
    },
    prs: [
      {
        number: 85,
        title: 'Privacy',
        file: 'docs/prs/85-fixture.md',
        status: 'completed',
        completedAt: '2026-04-30T12:18:00Z',
        roadmapItems: ['12.7'],
        review: {
          status: 'passed',
          reviewedAt: '2026-04-30T12:37:00Z',
          commands: ['npm run test:unit']
        }
      },
      { number: 95, title: 'Ready 1', file: 'docs/prs/95-fixture.md', status: 'ready', roadmapItems: ['6.10'] },
      { number: 96, title: 'Ready 2', file: 'docs/prs/96-fixture.md', status: 'ready', roadmapItems: ['7.9'] },
      { number: 97, title: 'Ready 3', file: 'docs/prs/97-fixture.md', status: 'ready', roadmapItems: ['7.10'] },
      { number: 98, title: 'Ready 4', file: 'docs/prs/98-fixture.md', status: 'ready', roadmapItems: ['7.11'] },
      { number: 99, title: 'Ready 5', file: 'docs/prs/99-fixture.md', status: 'ready', roadmapItems: ['13.5'] }
    ]
  };
}

test('PR readiness monitor passes with a reviewed recent completion and five ready PRs', () => {
  const root = makeFixture();
  const result = validateRegistry(validRegistry(), root, {
    now: new Date('2026-04-30T12:38:00Z')
  });

  assert.equal(result.ok, true);
  assert.equal(result.recentCompleted.length, 1);
  assert.equal(result.readyPrs.length, 5);
});

test('PR readiness monitor fails completed PRs without passing review records', () => {
  const root = makeFixture();
  const registry = validRegistry();
  registry.prs[0].review.status = 'pending';

  const result = validateRegistry(registry, root, {
    now: new Date('2026-04-30T12:38:00Z')
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /review status is "pending"/);
});

test('PR readiness monitor fails when fewer than five ready PRs are queued', () => {
  const root = makeFixture();
  const registry = validRegistry();
  registry.prs = registry.prs.filter((pr) => pr.number !== 99);

  const result = validateRegistry(registry, root, {
    now: new Date('2026-04-30T12:38:00Z')
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /Only 4 ready PR\(s\) are queued/);
});

test('PR readiness monitor requires completed PR roadmap items to be checked off', () => {
  const root = makeFixture();
  const registry = validRegistry();
  registry.prs[0].roadmapItems = ['6.10'];

  const result = validateRegistry(registry, root, {
    now: new Date('2026-04-30T12:38:00Z')
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /completed but roadmap item 6\.10 is not checked off/);
});
