const assert = require('node:assert/strict');
const test = require('node:test');

const access = require('../assets/access-control');

test('system admin can perform operational actions only on operational resources', () => {
  const admin = access.normalizeActor({ id: 'admin-1', role: access.Roles.SYSTEM_ADMIN });

  assert.equal(access.canAccess(admin, access.Capabilities.manageContentArtifacts, {
    type: access.ResourceTypes.CONTENT_ARTIFACT,
    id: 'question-manifest'
  }), true);
  assert.equal(access.canAccess(admin, access.Capabilities.manageSelectionRollout, {
    type: access.ResourceTypes.FEATURE_FLAG,
    id: 'server-selection'
  }), true);
  assert.equal(access.canAccess(admin, access.Capabilities.managePublicSigningKeys, {
    type: access.ResourceTypes.SYSTEM_SETTING,
    id: 'selection-public-keys'
  }), true);
  assert.equal(access.canAccess(admin, access.Capabilities.viewOperationalHealth, {
    type: access.ResourceTypes.SYSTEM_SETTING,
    id: 'selection-runtime-health'
  }), true);
  assert.equal(access.canAccess(admin, access.Capabilities.supportImpersonation, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), false);
  assert.equal(access.canAccess(admin, access.Capabilities.manageAssignments, {
    type: access.ResourceTypes.ASSIGNMENT,
    learnerId: 'learner-1'
  }), false);
});

test('admin actions are denied to guardian teacher student and unknown roles', () => {
  const actors = [
    access.normalizeActor({ id: 'guardian-1', role: access.Roles.PARENT_GUARDIAN, linkedLearnerIds: ['learner-1'] }),
    access.normalizeActor({ id: 'teacher-1', role: access.Roles.TEACHER, assignedLearnerIds: ['learner-1'] }),
    access.normalizeActor({ id: 'student-1', role: access.Roles.STUDENT, learnerId: 'learner-1' }),
    access.normalizeActor({ id: 'unknown-1', role: 'operator' })
  ];

  actors.forEach(actor => {
    assert.equal(access.canAccess(actor, access.Capabilities.manageFeatureFlags, {
      type: access.ResourceTypes.FEATURE_FLAG,
      id: 'server-selection'
    }), false);
    assert.equal(access.canAccess(actor, access.Capabilities.manageUserRoles, {
      type: access.ResourceTypes.SYSTEM_SETTING,
      id: 'roles'
    }), false);
    assert.equal(access.canAccess(actor, access.Capabilities.viewAuditLogs, {
      type: access.ResourceTypes.AUDIT_LOG
    }), false);
  });
});
