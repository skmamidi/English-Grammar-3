const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  CONFIG_ROTATION_REHEARSALS,
  REQUIRED_ROTATION_CONFIG_TYPES,
  buildRotationRehearsalSummary,
  sanitizeRotationEvidence,
  validateRotationRehearsals
} = require('../assets/config-rotation-rehearsal-policy');

const repoRoot = path.resolve(__dirname, '..');

test('config rotation rehearsals cover required config and secret-adjacent references', () => {
  const types = new Set(CONFIG_ROTATION_REHEARSALS.map(rehearsal => rehearsal.configType));

  REQUIRED_ROTATION_CONFIG_TYPES.forEach(type => {
    assert.ok(types.has(type), `missing rotation rehearsal for ${type}`);
  });
});

test('config rotation rehearsals require owner overlap rollback verification and sanitizer fields', () => {
  const result = validateRotationRehearsals(CONFIG_ROTATION_REHEARSALS, { root: repoRoot });

  assert.deepEqual(result.errors, []);
  CONFIG_ROTATION_REHEARSALS.forEach(rehearsal => {
    assert.match(rehearsal.id, /^rotation-[a-z0-9-]+$/);
    assert.match(rehearsal.owner, /^[a-z][a-z0-9-]+$/);
    assert.ok(rehearsal.precheck.length > 10);
    assert.ok(rehearsal.overlapStrategy.length > 10);
    assert.ok(rehearsal.rollback.length > 10);
    assert.ok(rehearsal.verification.length > 10);
    assert.ok(rehearsal.staleConfigDetection.length > 10);
    assert.equal(rehearsal.evidenceSanitizer, 'sanitizeRotationEvidence');
    rehearsal.commands.forEach(command => assert.match(command, /^(npm run|node --test|node scripts\/)/));
  });
});

test('config rotation validation rejects unsafe or incomplete rehearsals', () => {
  const result = validateRotationRehearsals([
    Object.assign({}, CONFIG_ROTATION_REHEARSALS[0], {
      id: 'rotation-broken',
      owner: '',
      overlapStrategy: '',
      rollback: '',
      verification: '',
      evidenceSanitizer: '',
      commands: ['curl https://example.test?token=secret']
    })
  ], { root: repoRoot });

  assert.ok(result.errors.includes('rotation-broken owner is required'));
  assert.ok(result.errors.includes('rotation-broken overlap strategy is required'));
  assert.ok(result.errors.includes('rotation-broken rollback is required'));
  assert.ok(result.errors.includes('rotation-broken verification is required'));
  assert.ok(result.errors.includes('rotation-broken evidence sanitizer is required'));
  assert.ok(result.errors.includes('rotation-broken command must use an approved local command'));
});

test('rotation evidence sanitizer redacts secret values and learner data', () => {
  const sanitized = sanitizeRotationEvidence({
    configType: 'public_signing_keys',
    publicKeyIds: ['selection-key-old', 'selection-key-new'],
    privateKey: 'secret',
    token: 'secret',
    learnerId: 'learner-a',
    rawEnv: 'SELECTION_PRIVATE_KEY_REF=projects/app/secrets/key',
    verification: 'ready'
  });

  assert.deepEqual(sanitized, {
    configType: 'public_signing_keys',
    publicKeyIds: ['selection-key-old', 'selection-key-new'],
    verification: 'ready'
  });
});

test('rotation rehearsal summary is sanitized and actionable', () => {
  const summary = buildRotationRehearsalSummary(CONFIG_ROTATION_REHEARSALS);

  assert.equal(summary.total, CONFIG_ROTATION_REHEARSALS.length);
  assert.ok(summary.byConfigType.public_signing_keys >= 1);
  assert.ok(summary.byOwner.platform >= 1);
  assert.doesNotMatch(JSON.stringify(summary), /secret|token|privateKey|learnerId|studentId|email/i);
});

test('rotation rehearsal docs package and release wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'config-rotation-rehearsals.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /config rotation rehearsal/i);
  assert.match(docs, /staging rehearsals precede production changes/i);
  assert.match(docs, /npm run qa:config-rotation/);
  assert.match(checklist, /qa:config-rotation/);
  assert.equal(pkg.scripts['qa:config-rotation'], 'node scripts/qa/config-rotation-rehearsal.js');
  assert.match(pkg.scripts['test:unit'], /tests\/config-rotation-rehearsal-policy\.test\.js/);
});
