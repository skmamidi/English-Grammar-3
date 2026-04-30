const assert = require('node:assert/strict');
const test = require('node:test');

const access = require('../assets/access-control');

test('student access is scoped to the actor learner only', () => {
  const student = access.normalizeActor({
    id: 'student-user-1',
    role: access.Roles.STUDENT,
    learnerId: 'learner-1'
  });

  assert.equal(
    access.canAccess(student, access.Capabilities.viewOwnProgress, {
      type: access.ResourceTypes.LEARNER_PROGRESS,
      learnerId: 'learner-1'
    }),
    true
  );
  assert.equal(
    access.canAccess(student, access.Capabilities.resumeOwnQuiz, {
      type: access.ResourceTypes.ACTIVE_QUIZ,
      ownerLearnerId: 'learner-1'
    }),
    true
  );
  assert.equal(
    access.canAccess(student, access.Capabilities.viewOwnProgress, {
      type: access.ResourceTypes.LEARNER_PROGRESS,
      learnerId: 'learner-2'
    }),
    false
  );
  assert.equal(
    access.canAccess(student, access.Capabilities.viewAssignments, {
      type: access.ResourceTypes.ASSIGNMENT,
      learnerId: 'learner-1'
    }),
    true
  );
});

test('parent guardian access is linked-learner scoped and never operational', () => {
  const guardian = access.normalizeActor({
    id: 'guardian-1',
    role: access.Roles.PARENT_GUARDIAN,
    linkedLearnerIds: ['learner-1']
  });

  assert.equal(
    access.canAccess(guardian, access.Capabilities.viewLinkedLearnerReports, {
      type: access.ResourceTypes.SAVED_SESSION,
      learnerId: 'learner-1'
    }),
    true
  );
  assert.equal(
    access.canAccess(guardian, access.Capabilities.viewLinkedLearnerReports, {
      type: access.ResourceTypes.QUESTION_REPORT,
      learnerId: 'learner-2'
    }),
    false
  );
  [
    access.Capabilities.manageUsers,
    access.Capabilities.manageContent,
    access.Capabilities.manageFeatureFlags,
    access.Capabilities.viewAuditLogs,
    access.Capabilities.manageSystemSettings
  ].forEach(action => {
    assert.equal(access.canAccess(guardian, action, { type: access.ResourceTypes.SYSTEM_SETTING }), false);
  });
});

test('teacher access is assigned learner scoped and not system admin access', () => {
  const teacher = access.normalizeActor({
    id: 'teacher-1',
    role: access.Roles.TEACHER,
    assignedLearnerIds: ['learner-2'],
    assignedClassIds: ['class-a']
  });

  assert.equal(
    access.canAccess(teacher, access.Capabilities.viewAssignedLearnerReports, {
      type: access.ResourceTypes.LEARNER_PROGRESS,
      learnerId: 'learner-2'
    }),
    true
  );
  assert.equal(
    access.canAccess(teacher, access.Capabilities.viewAssignedLearnerReports, {
      type: access.ResourceTypes.LEARNER_PROGRESS,
      learnerId: 'learner-3'
    }),
    false
  );
  assert.equal(
    access.canAccess(teacher, access.Capabilities.manageAssignments, {
      type: access.ResourceTypes.ASSIGNMENT,
      classId: 'class-a'
    }),
    true
  );
  assert.equal(
    access.canAccess(teacher, access.Capabilities.manageAssignments, {
      type: access.ResourceTypes.ASSIGNMENT,
      learnerId: 'learner-2'
    }),
    true
  );
  assert.equal(
    access.canAccess(teacher, access.Capabilities.manageAssignments, {
      type: access.ResourceTypes.ASSIGNMENT,
      learnerId: 'learner-3'
    }),
    false
  );
  assert.equal(
    access.canAccess(teacher, access.Capabilities.manageFeatureFlags, {
      type: access.ResourceTypes.FEATURE_FLAG,
      id: 'server-selection'
    }),
    false
  );
});

test('system admin operational capabilities do not imply learner data access', () => {
  const admin = access.normalizeActor({
    id: 'admin-1',
    role: access.Roles.SYSTEM_ADMIN
  });

  assert.equal(
    access.canAccess(admin, access.Capabilities.manageFeatureFlags, {
      type: access.ResourceTypes.FEATURE_FLAG,
      id: 'server-selection'
    }),
    true
  );
  assert.equal(
    access.canAccess(admin, access.Capabilities.manageContent, {
      type: access.ResourceTypes.CONTENT_ARTIFACT,
      id: 'question-manifest'
    }),
    true
  );
  assert.equal(
    access.canAccess(admin, access.Capabilities.viewAuditLogs, {
      type: access.ResourceTypes.AUDIT_LOG
    }),
    true
  );
  assert.equal(
    access.canAccess(admin, access.Capabilities.viewOwnProgress, {
      type: access.ResourceTypes.LEARNER_PROGRESS,
      learnerId: 'learner-1'
    }),
    false
  );
});

test('content reviewer can approve publication without system admin learner powers', () => {
  const reviewer = access.normalizeActor({
    id: 'reviewer-1',
    role: access.Roles.CONTENT_REVIEWER
  });

  assert.equal(access.canAccess(reviewer, access.Capabilities.reviewContentPublication, {
    type: access.ResourceTypes.CONTENT_PUBLICATION,
    id: 'pub-1'
  }), true);
  assert.equal(access.canAccess(reviewer, access.Capabilities.approveContentPublication, {
    type: access.ResourceTypes.CONTENT_PUBLICATION,
    id: 'pub-1'
  }), true);
  assert.equal(access.canAccess(reviewer, access.Capabilities.publishContentPublication, {
    type: access.ResourceTypes.CONTENT_PUBLICATION,
    id: 'pub-1'
  }), true);
  assert.equal(access.canAccess(reviewer, access.Capabilities.manageUsers, {
    type: access.ResourceTypes.SYSTEM_SETTING
  }), false);
  assert.equal(access.canAccess(reviewer, access.Capabilities.viewOwnProgress, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), false);
});

test('unknown roles and unknown actions deny by default', () => {
  const actor = access.normalizeActor({ id: 'mystery', role: 'principal' });

  assert.deepEqual(access.getRoleCapabilities('principal'), []);
  assert.equal(
    access.canAccess(actor, 'deleteEverything', { type: access.ResourceTypes.SYSTEM_SETTING }),
    false
  );
  assert.throws(
    () => access.requireCapability(actor, 'deleteEverything', { type: access.ResourceTypes.SYSTEM_SETTING }),
    /access_denied/
  );
});

test('visible actions are capability based for a resource', () => {
  const guardian = access.normalizeActor({
    id: 'guardian-1',
    role: access.Roles.PARENT_GUARDIAN,
    linkedLearnerIds: ['learner-1']
  });
  const actions = access.getVisibleActions(guardian, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  });

  assert.ok(actions.includes(access.Capabilities.viewLinkedLearnerReports));
  assert.equal(actions.includes(access.Capabilities.manageUsers), false);
});

test('question report triage is reviewer scoped and parent can only view own status', () => {
  const teacher = access.normalizeActor({ role: access.Roles.TEACHER, assignedLearnerIds: ['learner-1'] });
  const guardian = access.normalizeActor({ role: access.Roles.PARENT_GUARDIAN, linkedLearnerIds: ['learner-1'] });

  assert.equal(access.canAccess(teacher, access.Capabilities.triageQuestionReport, {
    type: access.ResourceTypes.QUESTION_REPORT,
    learnerId: 'learner-1'
  }), true);
  assert.equal(access.canAccess(teacher, access.Capabilities.resolveQuestionReport, {
    type: access.ResourceTypes.QUESTION_REPORT,
    learnerId: 'learner-2'
  }), false);
  assert.equal(access.canAccess(guardian, access.Capabilities.viewOwnQuestionReportStatus, {
    type: access.ResourceTypes.QUESTION_REPORT,
    learnerId: 'learner-1'
  }), true);
  assert.equal(access.canAccess(guardian, access.Capabilities.triageQuestionReport, {
    type: access.ResourceTypes.QUESTION_REPORT,
    learnerId: 'learner-1'
  }), false);
});

test('learner progress import export is learner scoped and denies system admin by default', () => {
  const student = access.normalizeActor({ role: access.Roles.STUDENT, learnerId: 'learner-1' });
  const guardian = access.normalizeActor({ role: access.Roles.PARENT_GUARDIAN, linkedLearnerIds: ['learner-1'] });
  const teacher = access.normalizeActor({ role: access.Roles.TEACHER, assignedLearnerIds: ['learner-2'], classroomProgressTransferEnabled: true });
  const admin = access.normalizeActor({ role: access.Roles.SYSTEM_ADMIN });

  assert.equal(access.canAccess(student, access.Capabilities.exportOwnLearnerProgress, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), true);
  assert.equal(access.canAccess(guardian, access.Capabilities.importLinkedLearnerProgress, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), true);
  assert.equal(access.canAccess(teacher, access.Capabilities.exportAssignedLearnerProgress, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-2'
  }), true);
  assert.equal(access.canAccess(admin, access.Capabilities.exportAssignedLearnerProgress, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-2'
  }), false);
});

test('learner data lifecycle capabilities are scoped and operationally approved', () => {
  const student = access.normalizeActor({ role: access.Roles.STUDENT, learnerId: 'learner-1' });
  const guardian = access.normalizeActor({ role: access.Roles.PARENT_GUARDIAN, linkedLearnerIds: ['learner-1'] });
  const teacher = access.normalizeActor({ role: access.Roles.TEACHER, assignedLearnerIds: ['learner-2'], learnerDataDeletionEnabled: true });
  const admin = access.normalizeActor({ role: access.Roles.SYSTEM_ADMIN });

  assert.equal(access.canAccess(student, access.Capabilities.requestLearnerDataDeletion, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), true);
  assert.equal(access.canAccess(guardian, access.Capabilities.requestLearnerDataDeletion, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), true);
  assert.equal(access.canAccess(teacher, access.Capabilities.requestLearnerDataDeletion, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-2'
  }), true);
  assert.equal(access.canAccess(admin, access.Capabilities.approveLearnerDataDeletion, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), true);
  assert.equal(access.canAccess(admin, access.Capabilities.restoreLearnerDataBackup, {
    type: access.ResourceTypes.LEARNER_PROGRESS,
    learnerId: 'learner-1'
  }), true);
});
