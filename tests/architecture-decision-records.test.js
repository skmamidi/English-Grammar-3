const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const adrDir = path.join(repoRoot, 'docs', 'adr');
const adrIndexPath = path.join(adrDir, 'README.md');
const requiredSections = [
  'Context',
  'Decision',
  'Consequences',
  'Affected Domains',
  'Owner',
  'Review Date',
  'Related Tests'
];
const acceptedStatuses = new Set(['Accepted', 'Proposed', 'Superseded']);
const requiredBoundaries = [
  'static-host-first delivery',
  'JSON-to-generated content artifacts',
  'ref-only learner state',
  'signed server selection',
  'local-first sync',
  'page-shell migration',
  'privacy-safe telemetry',
  'provider-neutral backend policy',
  'institutional policy',
  'native-readiness contracts',
  'native-platform architecture',
  'commerce/billing boundaries',
  'commerce-readiness launch gate'
];

test('architecture decision records cover required major boundaries', () => {
  const adrs = readAdrs();
  const coveredBoundaries = new Set(adrs.flatMap(adr => adr.boundaries));

  requiredBoundaries.forEach(boundary => {
    assert.ok(coveredBoundaries.has(boundary), `missing ADR boundary coverage for ${boundary}`);
  });
});

test('architecture decision records have stable metadata and required sections', () => {
  const adrs = readAdrs();
  const seenIds = new Set();

  adrs.forEach(adr => {
    assert.match(adr.id, /^ADR-\d{3}$/, `${adr.file} should use ADR-### id`);
    assert.ok(!seenIds.has(adr.id), `${adr.id} should be unique`);
    seenIds.add(adr.id);

    assert.equal(adr.id, path.basename(adr.file, '.md').slice(0, 7), `${adr.file} filename should begin with ADR id`);
    assert.ok(acceptedStatuses.has(adr.status), `${adr.file} should use an accepted ADR status`);
    assert.match(adr.owner, /^[a-z][a-z0-9-]+$/, `${adr.file} owner should be a stable team slug`);
    assert.match(adr.reviewDate, /^\d{4}-\d{2}-\d{2}$/, `${adr.file} review date should be ISO yyyy-mm-dd`);
    assert.ok(adr.boundaries.length >= 1, `${adr.file} should declare at least one boundary`);
    assert.ok(adr.relatedTests.length >= 1, `${adr.file} should reference at least one test`);

    requiredSections.forEach(section => {
      assert.match(adr.source, new RegExp(`^## ${escapeRegExp(section)}$`, 'm'), `${adr.file} missing ${section}`);
    });
  });
});

test('architecture decision record index links every ADR and every required boundary', () => {
  const index = fs.readFileSync(adrIndexPath, 'utf8');
  const adrs = readAdrs();

  adrs.forEach(adr => {
    assert.match(index, new RegExp(`\\(${escapeRegExp(adr.file)}\\)`), `ADR index should link ${adr.file}`);
    assert.match(index, new RegExp(escapeRegExp(adr.id)), `ADR index should list ${adr.id}`);
  });

  requiredBoundaries.forEach(boundary => {
    assert.match(index, new RegExp(escapeRegExp(boundary), 'i'), `ADR index should list ${boundary}`);
  });
});

test('ADR links and related tests point to existing project paths', () => {
  readAdrs().concat([{ file: 'README.md', source: fs.readFileSync(adrIndexPath, 'utf8'), relatedTests: [] }]).forEach(adr => {
    for (const link of adr.source.matchAll(/\]\(([^)]+)\)/g)) {
      const target = link[1];
      if (/^https?:/.test(target) || target.startsWith('#')) continue;
      const cleanTarget = target.split('#')[0];
      const resolved = path.resolve(adrDir, cleanTarget);
      assert.ok(resolved.startsWith(repoRoot), `${adr.file} link escapes repo: ${target}`);
      assert.ok(fs.existsSync(resolved), `${adr.file} link target should exist: ${target}`);
    }

    adr.relatedTests.forEach(testPath => {
      assert.ok(fs.existsSync(path.join(repoRoot, testPath)), `${adr.file} related test should exist: ${testPath}`);
    });
  });
});

test('roadmap and PR guidance require ADR links for boundary-changing work', () => {
  const roadmap = fs.readFileSync(path.join(repoRoot, 'docs', 'milestone-roadmap.md'), 'utf8');
  const pr134 = fs.readFileSync(path.join(repoRoot, 'docs', 'prs', '134-add-architecture-decision-records-for-major-boundaries.md'), 'utf8');

  assert.match(roadmap, /docs\/adr\/README\.md/i);
  assert.match(roadmap, /boundary-changing PRs/i);
  assert.match(pr134, /docs\/adr\/README\.md/i);
  assert.match(pr134, /Related ADRs/i);
});

test('ADR docs avoid secret credential and learner identifier examples', () => {
  readAdrs().forEach(adr => {
    assert.doesNotMatch(adr.source, /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/i, `${adr.file} must not include private keys`);
    assert.doesNotMatch(adr.source, /\b(AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,})\b/, `${adr.file} must not include token-looking examples`);
    assert.doesNotMatch(adr.source, /\b(learnerId|studentId|email|password)\s*=/i, `${adr.file} must not include learner credential examples`);
  });
});

test('native platform architecture ADR defines shared native and deferred responsibilities', () => {
  const source = fs.readFileSync(path.join(adrDir, 'ADR-012-native-platform-architecture.md'), 'utf8');

  [
    'canonical question JSON',
    'generated manifests',
    'skill/standard taxonomy',
    'domain fixtures',
    'learner-state envelopes',
    'entitlement projections',
    'design tokens',
    'asset metadata',
    'route/deep-link map',
    'telemetry schema',
    'accessibility expectations',
    'release compatibility',
    'platform-native rendering',
    'storage adapters',
    'Swift/SwiftUI',
    'WebView shell',
    'hybrid bridge',
    'deferred decision',
    'App Store policy',
    'offline storage',
    'account sync',
    'content bundles',
    'billing entitlements',
    'No iOS project'
  ].forEach(requiredText => {
    assert.match(source, new RegExp(escapeRegExp(requiredText), 'i'), `native platform ADR should mention ${requiredText}`);
  });
});

function readAdrs() {
  const files = fs.readdirSync(adrDir)
    .filter(file => /^ADR-\d{3}-.+\.md$/.test(file))
    .sort();

  return files.map(file => {
    const source = fs.readFileSync(path.join(adrDir, file), 'utf8');
    return {
      file,
      source,
      id: requiredField(source, 'ADR ID', file),
      status: requiredField(source, 'Status', file),
      owner: requiredField(source, 'Owner', file),
      reviewDate: requiredField(source, 'Review Date', file),
      boundaries: splitField(requiredField(source, 'Boundary', file)),
      relatedTests: splitField(requiredField(source, 'Related Tests', file))
    };
  });
}

function requiredField(source, field, file) {
  const match = source.match(new RegExp(`^- ${escapeRegExp(field)}: (.+)$`, 'm'));
  assert.ok(match, `${file} missing ${field} metadata`);
  const value = match[1].trim();
  assert.doesNotMatch(value, /\b(TBD|unknown|later)\b/i, `${file} ${field} metadata should be final`);
  return value;
}

function splitField(value) {
  return value.split(',').map(part => part.trim()).filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
