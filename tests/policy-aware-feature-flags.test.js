const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  POLICY_AWARE_FEATURES,
  evaluatePolicyAwareFeatureFlag,
  normalizeFeatureFlags
} = require('../assets/feature-flag-domain');

const actors = require('./fixtures/backend-security/actors.json');
const repoRoot = path.resolve(__dirname, '..');

test('policy-aware feature list covers sensitive optional surfaces and core practice', () => {
  assert.deepEqual(POLICY_AWARE_FEATURES, [
    'coreLocalPractice',
    'telemetry',
    'experiments',
    'aiAssistedAuthoring',
    'accountSync',
    'optionalPersonalization',
    'notificationDelivery',
    'nativeContentBundle',
    'futureBillingDisplay',
    'futureBillingCheckout'
  ]);
});

test('sensitive policy-aware flags deny by default while core local practice stays available', () => {
  assert.deepEqual(evaluatePolicyAwareFeatureFlag({
    feature: 'coreLocalPractice',
    actor: actors.student,
    learnerId: 'learner-a'
  }), {
    enabled: true,
    reason: 'core_practice_available',
    feature: 'coreLocalPractice',
    diagnostics: { route: '', environment: 'local', policyVersion: '' }
  });

  POLICY_AWARE_FEATURES
    .filter(feature => feature !== 'coreLocalPractice')
    .forEach(feature => {
      const decision = evaluatePolicyAwareFeatureFlag({ feature, actor: actors.student, learnerId: 'learner-a' });
      assert.equal(decision.enabled, false, `${feature} should deny by default`);
      assert.equal(decision.reason, 'feature_flag_disabled');
    });
});

test('global availability remains separate from institution policy eligibility', () => {
  const decision = evaluatePolicyAwareFeatureFlag({
    feature: 'telemetry',
    actor: actors.student,
    learnerId: 'learner-a',
    flags: { telemetryEnabled: true },
    institutionPolicy: { disabledFeatures: ['telemetry'], policyVersion: 'school-2026' },
    guardianConsent: { telemetry: true },
    learnerPrivacyPreferences: { telemetryEnabled: true },
    routeContext: { route: '/quiz.html?learnerId=secret' },
    environment: 'production'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'institution_policy_denied');
  assert.deepEqual(decision.diagnostics, {
    route: '/quiz.html',
    environment: 'production',
    policyVersion: 'school-2026'
  });
  assert.equal(JSON.stringify(decision).includes('secret'), false);
});

test('eligible telemetry experiments sync personalization notifications native and billing flags can pass together', () => {
  const flags = normalizeFeatureFlags({
    telemetryEnabled: true,
    experimentsEnabled: true,
    aiAssistedAuthoringEnabled: true,
    syncEnabled: true,
    optionalPersonalizationEnabled: true,
    notificationDeliveryEnabled: true,
    nativeContentBundleEnabled: true,
    futureBillingDisplayEnabled: true,
    futureBillingCheckoutEnabled: true
  });
  const common = {
    actor: actors.student,
    learnerId: 'learner-a',
    flags,
    institutionPolicy: {
      telemetry: true,
      experiments: true,
      aiAssistedAuthoring: true,
      accountSync: true,
      optionalPersonalization: true,
      notificationDelivery: true,
      nativeContentBundle: true,
      futureBilling: true
    },
    guardianConsent: {
      telemetry: true,
      experiments: true,
      aiAssistedAuthoring: true,
      accountSync: true,
      optionalPersonalization: true,
      notificationDelivery: true,
      nativeContentBundle: true,
      futureBilling: true
    },
    learnerPrivacyPreferences: {
      telemetryEnabled: true,
      experimentParticipationEnabled: true,
      optionalPersonalizationEnabled: true
    }
  };

  [
    'telemetry',
    'experiments',
    'aiAssistedAuthoring',
    'accountSync',
    'optionalPersonalization',
    'notificationDelivery',
    'nativeContentBundle',
    'futureBillingDisplay',
    'futureBillingCheckout'
  ].forEach(feature => {
    assert.equal(evaluatePolicyAwareFeatureFlag({ ...common, feature }).enabled, true, `${feature} should be eligible`);
  });
});

test('parent preview stale policies and unknown flags fail closed with safe diagnostics', () => {
  assert.equal(evaluatePolicyAwareFeatureFlag({
    feature: 'experiments',
    actor: actors.parentPreview,
    learnerId: 'learner-a',
    flags: { experimentsEnabled: true },
    guardianConsent: { experiments: true },
    learnerPrivacyPreferences: { telemetryEnabled: true, experimentParticipationEnabled: true }
  }).reason, 'parent_preview_read_only');

  assert.equal(evaluatePolicyAwareFeatureFlag({
    feature: 'accountSync',
    actor: actors.student,
    learnerId: 'learner-a',
    flags: { syncEnabled: true },
    institutionPolicy: { accountSync: true, expiresAt: '2026-01-01T00:00:00.000Z' },
    guardianConsent: { accountSync: true },
    now: '2026-05-03T12:00:00.000Z'
  }).reason, 'stale_policy_record');

  assert.deepEqual(evaluatePolicyAwareFeatureFlag({
    feature: 'rawLearnerDebug',
    actor: actors.student,
    learnerId: 'learner-a',
    routeContext: { route: '/debug.html?studentId=hidden' }
  }), {
    enabled: false,
    reason: 'unknown_feature',
    feature: 'rawLearnerDebug',
    diagnostics: { route: '/debug.html', environment: 'local', policyVersion: '' }
  });
});

test('policy-aware flag docs and unit gate are wired', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'feature-flags.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /policy-aware feature flags/i);
  assert.match(docs, /core local practice/i);
  assert.match(docs, /futureBillingCheckout/i);
  assert.match(checklist, /policy-aware feature flags/i);
  assert.match(pkg.scripts['test:unit'], /tests\/policy-aware-feature-flags\.test\.js/);
});
