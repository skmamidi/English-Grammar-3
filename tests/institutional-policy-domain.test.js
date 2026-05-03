const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const access = require('../assets/access-control');
const {
  FeatureIntents,
  POLICY_PRECEDENCE,
  resolveInstitutionalPolicy
} = require('../assets/institutional-policy-domain');

const actors = require('./fixtures/backend-security/actors.json');
const repoRoot = path.resolve(__dirname, '..');

test('sensitive optional features deny by default while core practice remains available', () => {
  assert.deepEqual(resolveInstitutionalPolicy({
    actor: actors.student,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.CORE_PRACTICE
  }), {
    allowed: true,
    reason: 'core_practice_available',
    featureIntent: FeatureIntents.CORE_PRACTICE,
    precedence: POLICY_PRECEDENCE
  });

  [
    FeatureIntents.TELEMETRY,
    FeatureIntents.EXPERIMENTS,
    FeatureIntents.AI_ASSISTED_AUTHORING,
    FeatureIntents.ACCOUNT_SYNC,
    FeatureIntents.OPTIONAL_PERSONALIZATION,
    FeatureIntents.NOTIFICATION_DELIVERY,
    FeatureIntents.FUTURE_BILLING
  ].forEach(featureIntent => {
    assert.equal(resolveInstitutionalPolicy({ actor: actors.student, learnerId: 'learner-a', featureIntent }).allowed, false);
    assert.equal(resolveInstitutionalPolicy({ actor: actors.student, learnerId: 'learner-a', featureIntent }).reason, 'explicit_consent_required');
  });
});

test('institutional and deletion restrictions take precedence over consent preferences and flags', () => {
  const happyInputs = {
    actor: actors.student,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.TELEMETRY,
    institutionPolicy: { disabledFeatures: [] },
    guardianConsent: { telemetry: true },
    learnerPrivacyPreferences: { telemetryEnabled: true },
    featureFlags: { telemetry: true }
  };

  assert.equal(resolveInstitutionalPolicy(happyInputs).allowed, true);

  assert.deepEqual(resolveInstitutionalPolicy({
    ...happyInputs,
    deletionOrRetentionRestriction: true
  }), {
    allowed: false,
    reason: 'deletion_or_retention_restriction',
    featureIntent: FeatureIntents.TELEMETRY,
    precedence: POLICY_PRECEDENCE
  });

  assert.deepEqual(resolveInstitutionalPolicy({
    ...happyInputs,
    institutionPolicy: { disabledFeatures: [FeatureIntents.TELEMETRY] }
  }), {
    allowed: false,
    reason: 'institution_policy_denied',
    featureIntent: FeatureIntents.TELEMETRY,
    precedence: POLICY_PRECEDENCE
  });
});

test('parent preview is local read-only and cannot satisfy guardian or billing policy', () => {
  assert.equal(resolveInstitutionalPolicy({
    actor: actors.parentPreview,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.ASSIGNMENT_VISIBILITY,
    guardianConsent: { assignmentVisibility: true },
    featureFlags: { assignmentVisibility: true }
  }).reason, 'parent_preview_read_only');

  assert.equal(resolveInstitutionalPolicy({
    actor: actors.parentPreview,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.FUTURE_BILLING,
    guardianConsent: { futureBilling: true },
    featureFlags: { futureBilling: true }
  }).reason, 'parent_preview_read_only');
});

test('guardian and teacher eligibility stays scoped to linked learners and assigned classes', () => {
  assert.equal(resolveInstitutionalPolicy({
    actor: actors.guardianLinked,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.ASSIGNMENT_VISIBILITY,
    guardianConsent: { assignmentVisibility: true },
    featureFlags: { assignmentVisibility: true }
  }).allowed, true);

  assert.equal(resolveInstitutionalPolicy({
    actor: actors.guardianUnrelated,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.ASSIGNMENT_VISIBILITY,
    guardianConsent: { assignmentVisibility: true },
    featureFlags: { assignmentVisibility: true }
  }).reason, 'relationship_scope_denied');

  assert.equal(resolveInstitutionalPolicy({
    actor: actors.teacherAssigned,
    learnerId: 'learner-a',
    classId: 'class-a',
    featureIntent: FeatureIntents.ASSIGNMENT_VISIBILITY,
    schoolPolicy: { assignmentVisibility: true },
    featureFlags: { assignmentVisibility: true }
  }).allowed, true);

  assert.equal(resolveInstitutionalPolicy({
    actor: actors.teacherUnrelated,
    learnerId: 'learner-a',
    classId: 'class-a',
    featureIntent: FeatureIntents.ASSIGNMENT_VISIBILITY,
    schoolPolicy: { assignmentVisibility: true },
    featureFlags: { assignmentVisibility: true }
  }).reason, 'relationship_scope_denied');
});

test('system admin and support context never grant learner policy eligibility', () => {
  assert.equal(resolveInstitutionalPolicy({
    actor: actors.systemAdmin,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.ACCOUNT_SYNC,
    institutionPolicy: { accountSync: true },
    featureFlags: { accountSync: true }
  }).reason, 'learner_policy_actor_denied');

  assert.equal(resolveInstitutionalPolicy({
    actor: { role: access.Roles.TEACHER, assignedLearnerIds: ['learner-a'], supportImpersonation: true },
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.OPTIONAL_PERSONALIZATION,
    schoolPolicy: { optionalPersonalization: true },
    featureFlags: { optionalPersonalization: true }
  }).reason, 'support_context_denied');
});

test('experiment and personalization policies require learner preference and feature flag consent', () => {
  assert.equal(resolveInstitutionalPolicy({
    actor: actors.student,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.EXPERIMENTS,
    guardianConsent: { experiments: true },
    learnerPrivacyPreferences: { telemetryEnabled: true, experimentParticipationEnabled: false },
    featureFlags: { experiments: true }
  }).reason, 'learner_preference_denied');

  assert.equal(resolveInstitutionalPolicy({
    actor: actors.student,
    learnerId: 'learner-a',
    featureIntent: FeatureIntents.EXPERIMENTS,
    guardianConsent: { experiments: true },
    learnerPrivacyPreferences: { telemetryEnabled: true, experimentParticipationEnabled: true },
    featureFlags: { experiments: false }
  }).reason, 'feature_flag_disabled');
});

test('institutional policy docs distinguish school policy guardian consent and admin config', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'institutional-policy.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  [
    'legal/school policy',
    'deletion/retention restrictions',
    'guardian consent',
    'learner privacy preferences',
    'feature flags',
    'route-specific UI state',
    'parent preview',
    'system admin configuration',
    'core local practice'
  ].forEach(required => assert.match(doc, new RegExp(escapeRegex(required), 'i')));
  assert.match(checklist, /institutional policy/i);
  assert.match(checklist, /guardian consent/i);
  assert.match(checklist, /school policy/i);
});

test('ci contract wires the institutional policy test into the unit gate', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['test:unit'], /tests\/institutional-policy-domain\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
