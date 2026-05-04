const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  auditPortableDomainSources,
  buildSharedDomainFixtures,
  getSharedDomainContractInventory,
  validateSharedDomainContractInventory,
  validateSharedDomainFixtures
} = require('../assets/shared-domain-contracts');

const repoRoot = path.resolve(__dirname, '..');

test('shared domain inventory covers portable kernels and adapter boundaries', () => {
  const inventory = getSharedDomainContractInventory();
  const domains = inventory.contracts.map(contract => contract.domain);

  [
    'quiz_selection',
    'active_quiz_ref',
    'saved_session',
    'progress_normalization',
    'assignment',
    'adaptive_review',
    'spaced_repetition',
    'learner_goal',
    'mastery_projection',
    'weak_skill_recommendation',
    'privacy_preferences',
    'entitlement_projection',
    'app_telemetry',
    'selection_telemetry'
  ].forEach(domain => assert.ok(domains.includes(domain), `${domain} contract should be listed`));

  assert.deepEqual(validateSharedDomainContractInventory(inventory), []);
  inventory.contracts.forEach(contract => {
    assert.ok(contract.kernelPath.startsWith('assets/'), `${contract.domain} should point at an asset kernel`);
    assert.equal(contract.portable, true, `${contract.domain} should be portable`);
    assert.ok(contract.fixtures.length >= 1, `${contract.domain} should name reusable fixtures`);
    assert.ok(contract.browserAdapters.length >= 1, `${contract.domain} should name browser adapters`);
    assert.equal(contract.browserAdapters.some(adapter => adapter === contract.kernelPath), false, `${contract.domain} kernel should not be its own adapter`);
  });
});

test('portable domain fixtures validate learning privacy telemetry and entitlement projections', () => {
  const fixtures = buildSharedDomainFixtures({ now: '2030-04-29T12:00:00.000Z' });

  assert.deepEqual(validateSharedDomainFixtures(fixtures), []);
  assert.equal(fixtures.selection.request.domain, 'grammar');
  assert.equal(fixtures.activeQuiz.questionRefs[0].sourceSet, 'grammar-sentence-types');
  assert.equal(fixtures.progress.schemaVersion, 2);
  assert.equal(fixtures.assignment.scope.setIds[0], 'grammar-sentence-types');
  assert.equal(fixtures.reviewQueue.items[0].questionRef.id, 'grammar-sentence-types-q0001');
  assert.equal(fixtures.spacedRepetition[0].ref.id, 'grammar-sentence-types-q0001');
  assert.equal(fixtures.mastery.skills['grammar.sentence_types'].band, 'developing');
  assert.equal(fixtures.recommendations.recommendations[0].skillId, 'grammar.sentence_types');
  assert.equal(fixtures.privacyPreferences.telemetryEnabled, false);
  assert.equal(fixtures.entitlementProjection.accessState, 'free');
  assert.equal(fixtures.appTelemetry.route, '/practice.html');
  assert.equal(fixtures.selectionTelemetry.eventName, 'grammarquest:question-selection-completed');

  const unsafe = JSON.parse(JSON.stringify(fixtures));
  unsafe.entitlementProjection.providerPayload = { subscriptionId: 'sub_123' };
  assert.ok(validateSharedDomainFixtures(unsafe).includes('entitlement_projection_must_not_include_provider_payload'));
});

test('portable domain source audit rejects browser provider and service-worker assumptions', () => {
  const violations = auditPortableDomainSources({
    'assets/assignment-domain.js': 'function normalize() { return localStorage.getItem("x"); }',
    'assets/mastery-projection-domain.js': 'document.dispatchEvent(new Event("x"));',
    'assets/app-telemetry-domain.js': 'navigator.serviceWorker.ready.then(Boolean);',
    'assets/weak-skill-recommendation-domain.js': "const firebase = require('firebase/app');"
  });
  const codes = violations.map(violation => violation.code);

  assert.ok(codes.includes('browser_api_in_portable_domain'));
  assert.ok(codes.includes('service_worker_in_portable_domain'));
  assert.ok(codes.includes('provider_sdk_in_portable_domain'));
});

test('current portable domain kernels avoid browser-only APIs', () => {
  const inventory = getSharedDomainContractInventory();
  const sources = Object.fromEntries(inventory.contracts.map(contract => {
    const fullPath = path.join(repoRoot, contract.kernelPath);
    return [contract.kernelPath, fs.readFileSync(fullPath, 'utf8')];
  }));

  assert.deepEqual(auditPortableDomainSources(sources), []);
});

test('shared domain portability contract is documented and wired into unit gates', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'shared-domain-contracts.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /portable domain kernels/i);
  assert.match(docs, /browser storage, network, telemetry transport, auth\/session, service worker, and provider config/i);
  assert.match(docs, /entitlement projection/i);
  assert.match(pkg.scripts['test:unit'], /tests\/shared-domain-portability\.test\.js/);
});
