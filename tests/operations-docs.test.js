const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const operationsDir = path.join(repoRoot, 'docs', 'operations');
const requiredRunbooks = [
  'runbook-stale-question-artifacts.md',
  'runbook-selection-api-failure.md',
  'runbook-bad-selection-signature.md',
  'runbook-offline-cache-issue.md',
  'runbook-auth-session-outage.md',
  'runbook-telemetry-outage.md',
  'runbook-learner-sync-failure.md',
  'runbook-content-publication-rollback.md'
];
const requiredSections = [
  'Symptoms',
  'Detection Signals',
  'Immediate Mitigation',
  'Safe Rollback',
  'Verification Commands',
  'User-Facing Support Notes',
  'Audit and Logging Requirements',
  'Escalation Owner'
];

test('operations runbooks exist with the required response structure', () => {
  requiredRunbooks.forEach(file => {
    const source = readOperationDoc(file);
    assert.match(source, /^# Runbook: .+/m, `${file} should have a runbook title`);
    requiredSections.forEach(section => {
      assert.match(source, new RegExp(`^## ${escapeRegExp(section)}$`, 'm'), `${file} missing ${section}`);
    });
    assert.match(source, /```bash[\s\S]*?(npm run|node scripts\/|npx )/m, `${file} should include a verification command block`);
  });
});

test('operations index links every required runbook', () => {
  const index = readOperationDoc('README.md');
  requiredRunbooks.forEach(file => {
    assert.match(index, new RegExp(`\\(${escapeRegExp(file)}\\)`), `README.md should link ${file}`);
  });
  assert.match(index, /\(production-slos\.md\)/, 'README.md should link production SLO policy');
  assert.match(index, /\(synthetic-monitors\.md\)/, 'README.md should link synthetic monitor guide');
});

test('release checklist links operational runbooks for incident response', () => {
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  ['runbook-stale-question-artifacts.md', 'runbook-selection-api-failure.md', 'runbook-offline-cache-issue.md', 'runbook-content-publication-rollback.md']
    .forEach(file => {
      assert.match(checklist, new RegExp(`docs/operations/${escapeRegExp(file)}`), `release checklist should link ${file}`);
    });
});

test('runbook links and package verification commands point to existing project paths', () => {
  const packageScripts = Object.keys(readJson('package.json').scripts);
  requiredRunbooks.concat(['README.md']).forEach(file => {
    const source = readOperationDoc(file);
    for (const link of source.matchAll(/\]\(([^)]+)\)/g)) {
      const target = link[1];
      if (/^https?:/.test(target) || target.startsWith('#')) continue;
      const cleanTarget = target.split('#')[0];
      const resolved = path.resolve(operationsDir, cleanTarget);
      assert.ok(resolved.startsWith(repoRoot), `${file} link escapes repo: ${target}`);
      assert.ok(fs.existsSync(resolved), `${file} link target should exist: ${target}`);
    }
    for (const command of source.matchAll(/npm run ([\w:.-]+)/g)) {
      assert.ok(packageScripts.includes(command[1]), `${file} references missing npm script ${command[1]}`);
    }
  });
});

test('production SLO docs link critical objectives to runbooks and privacy constraints', () => {
  const source = readOperationDoc('production-slos.md');

  [
    'Quiz start success',
    'Question chunk hydration success',
    'Selection API readiness',
    'Offline recovery success',
    'Learner state sync success',
    'Content publication freshness'
  ].forEach(label => {
    assert.match(source, new RegExp(escapeRegExp(label)), `production-slos.md should document ${label}`);
  });
  requiredRunbooks
    .filter(file => !['runbook-bad-selection-signature.md', 'runbook-auth-session-outage.md', 'runbook-telemetry-outage.md'].includes(file))
    .forEach(file => {
      assert.match(source, new RegExp(escapeRegExp(file)), `production-slos.md should link ${file}`);
    });
  assert.match(source, /aggregate operational signals only/i);
  assert.match(source, /must not include learner identifiers/i);
});

test('synthetic monitor docs describe critical flows privacy and runner commands', () => {
  const source = readOperationDoc('synthetic-monitors.md');

  [
    'Home page shell',
    'Topic index and manifest',
    'Subtopic quiz start',
    'Selection API readiness',
    'Offline fallback metadata',
    'Admin readiness metadata'
  ].forEach(label => {
    assert.match(source, new RegExp(escapeRegExp(label)), `synthetic-monitors.md should document ${label}`);
  });

  assert.match(source, /npm run monitor:synthetic/);
  assert.match(source, /node --test tests\/synthetic-monitor-policy\.test\.js/);
  assert.match(source, /must not include learner identifiers/i);
  assert.match(source, /question text, answer choices, explanations/i);
  assert.match(source, /docs\/operations\/runbook-selection-api-failure\.md/);
});

test('operations docs avoid private-key token and credential examples', () => {
  requiredRunbooks.concat(['README.md', 'release-and-rollback.md', 'backup-restore.md', 'production-slos.md', 'synthetic-monitors.md']).forEach(file => {
    const source = readOperationDoc(file);
    assert.doesNotMatch(source, /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/i, `${file} must not include private keys`);
    assert.doesNotMatch(source, /\b(AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,})\b/, `${file} must not include token-looking examples`);
    assert.doesNotMatch(source, /password\s*=\s*["'][^"']+["']/i, `${file} must not include password examples`);
  });
});

function readOperationDoc(file) {
  return fs.readFileSync(path.join(operationsDir, file), 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
