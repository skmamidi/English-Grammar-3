const assert = require('node:assert/strict');
const test = require('node:test');

const access = require('../assets/access-control');

test('dashboard access is scoped by adult learner relationship', () => {
  const guardian = access.normalizeActor({
    role: access.Roles.PARENT_GUARDIAN,
    linkedLearnerIds: ['learner-1']
  });
  const teacher = access.normalizeActor({
    role: access.Roles.TEACHER,
    assignedLearnerIds: ['learner-2'],
    assignedClassIds: ['class-a']
  });

  assert.equal(access.canViewLearnerDashboard(guardian, 'learner-1'), true);
  assert.equal(access.canViewLearnerDashboard(guardian, 'learner-2'), false);
  assert.equal(access.canViewLearnerDashboard(teacher, 'learner-2'), true);
  assert.equal(access.canAccess(teacher, access.Capabilities.viewClassDashboardSummary, {
    type: access.ResourceTypes.CLASS_SUMMARY,
    classId: 'class-a'
  }), true);
});

test('system admin and parent preview do not receive learner dashboard access by default', () => {
  const admin = access.normalizeActor({ role: access.Roles.SYSTEM_ADMIN });
  const preview = access.normalizeActor({ role: 'parent_preview' });

  assert.equal(access.canViewLearnerDashboard(admin, 'learner-1'), false);
  assert.equal(access.canViewLearnerDashboard(preview, 'learner-1'), false);
});

