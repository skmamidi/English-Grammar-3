const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { validateRegistry } = require('../scripts/qa/pr-readiness-monitor.js');

function makeFixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-readiness-'));
  fs.mkdirSync(path.join(root, 'docs/prs'), { recursive: true });
  const rows = [
    '| Status | Number | Task | Evidence / Notes |',
    '| --- | --- | --- | --- |',
    '| ✅ | 12.7 | Add privacy consent and telemetry opt-out controls | Done. |',
    '| ✅ | 6.9 | Add app-wide error and performance telemetry contracts | Done. |',
    '| ⬜ | 6.10 | Add health-check and readiness endpoints for server selection | Todo. |',
    '| ⬜ | 7.9 | Add cross-browser smoke coverage | Todo. |',
    '| ⬜ | 7.10 | Add automated accessibility engine coverage | Todo. |',
    '| ⬜ | 7.11 | Add reduced-motion and high-contrast mode coverage | Todo. |',
    '| ✅ | 8.12 | Stabilize noisy performance and visual gates | Done. |',
    '| ✅ | 10.9 | Add import/export for learner progress | Done. |',
    '| ✅ | 11.1 | Define account-backed learner state adapter contract | Done. |',
    '| ✅ | 12.1 | Add Content Security Policy and security header plan | Done. |',
    '| ⬜ | 13.5 | Add operational runbooks for common failures | Todo. |',
    ''
  ];
  if (options.staleSuggestedRows) {
    rows.splice(rows.length - 1, 0,
      '| ⬜ | F-006 | Stabilize local API latency budget gate | Todo. |',
      '| ⬜ | F-007 | Scope visual semantic signatures to reviewed regions | Todo. |',
      '| ⬜ | 17.2 | Implement learner progress import/export | Todo. |',
      '| ⬜ | 17.3 | Add backend learner-state adapter contract | Todo. |',
      '| ⬜ | 17.4 | Add CSP/security header contracts | Todo. |',
      '| ⬜ | 17.5 | Add app-wide error telemetry contracts | Todo. |'
    );
  }
  fs.writeFileSync(path.join(root, 'docs/milestone-roadmap.md'), rows.join('\n'));
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

test('PR readiness monitor fails implemented roadmap evidence left in ready status', () => {
  const root = makeFixture();
  const registry = validRegistry();
  registry.prs[1].roadmapItems = ['12.7'];

  const result = validateRegistry(registry, root, {
    now: new Date('2026-04-30T12:38:00Z')
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /PR 95 is ready but roadmap item 12\.7 is already checked off/);
});

test('PR readiness monitor fails stale suggested-order rows with completed evidence rows', () => {
  const root = makeFixture({ staleSuggestedRows: true });
  const result = validateRegistry(validRegistry(), root, {
    now: new Date('2026-04-30T12:38:00Z')
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /roadmap item F-006 is unchecked but evidence item 8\.12 is checked off/);
  assert.match(result.issues.join('\n'), /roadmap item 17\.2 is unchecked but evidence item 10\.9 is checked off/);
  assert.match(result.issues.join('\n'), /roadmap item 17\.5 is unchecked but evidence item 6\.9 is checked off/);
});
