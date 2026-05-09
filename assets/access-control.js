(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAccessControl = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const Roles = Object.freeze({
    STUDENT: 'student',
    PARENT_GUARDIAN: 'parent_guardian',
    TEACHER: 'teacher',
    SYSTEM_ADMIN: 'system_admin',
    CONTENT_REVIEWER: 'content_reviewer'
  });

  const Capabilities = Object.freeze({
    takeQuiz: 'takeQuiz',
    viewAssignments: 'viewAssignments',
    viewOwnProgress: 'viewOwnProgress',
    resumeOwnQuiz: 'resumeOwnQuiz',
    viewLinkedLearnerReports: 'viewLinkedLearnerReports',
    viewAssignedLearnerReports: 'viewAssignedLearnerReports',
    viewLinkedLearnerDashboard: 'dashboard:view-linked-learner',
    viewAssignedLearnerDashboard: 'dashboard:view-assigned-learner',
    viewClassDashboardSummary: 'dashboard:view-class-summary',
    triageQuestionReport: 'question-report:triage',
    assignQuestionReport: 'question-report:assign',
    resolveQuestionReport: 'question-report:resolve',
    viewOwnQuestionReportStatus: 'question-report:view-own-status',
    exportOwnLearnerProgress: 'learner-progress:export-own',
    exportLinkedLearnerProgress: 'learner-progress:export-linked',
    exportAssignedLearnerProgress: 'learner-progress:export-assigned',
    importOwnLearnerProgress: 'learner-progress:import-own',
    importLinkedLearnerProgress: 'learner-progress:import-linked',
    importAssignedLearnerProgress: 'learner-progress:import-assigned',
    viewOwnPrivacyPreferences: 'privacy-preferences:view-own',
    manageOwnPrivacyPreferences: 'privacy-preferences:manage-own',
    viewLinkedLearnerPrivacyPreferences: 'privacy-preferences:view-linked',
    manageLinkedLearnerPrivacyPreferences: 'privacy-preferences:manage-linked',
    manageLinkedLearnerMissionReminders: 'mission-reminders:manage-linked',
    manageLinkedLearnerLeaderboardOptIn: 'leaderboard:manage-linked-opt-in',
    manageAssignedLearnerLeaderboardOptIn: 'leaderboard:manage-assigned-opt-in',
    assignGuidedMission: 'guided-mission:assign',
    requestLearnerDataDeletion: 'learner-data:request-delete',
    approveLearnerDataDeletion: 'learner-data:approve-delete',
    exportLearnerDataBackup: 'learner-data:export-backup',
    restoreLearnerDataBackup: 'learner-data:restore-backup',
    manageAssignments: 'manageAssignments',
    manageContent: 'manageContent',
    manageUsers: 'manageUsers',
    manageUserRoles: 'manageUserRoles',
    manageFeatureFlags: 'manageFeatureFlags',
    updateFeatureFlags: 'feature-flag:update',
    manageSelectionRollout: 'manageSelectionRollout',
    manageContentArtifacts: 'manageContentArtifacts',
    reviewContentPublication: 'content-publication:review',
    approveContentPublication: 'content-publication:approve',
    publishContentPublication: 'content-publication:publish',
    managePublicSigningKeys: 'managePublicSigningKeys',
    viewAdminConsole: 'admin-console:view',
    viewReleaseManifest: 'release-manifest:view',
    viewTelemetrySummary: 'telemetry-summary:view',
    viewAuditSummary: 'audit-summary:view',
    viewOperationalHealth: 'viewOperationalHealth',
    viewAuditLogs: 'viewAuditLogs',
    manageSystemSettings: 'manageSystemSettings',
    updateLearnerProgress: 'updateLearnerProgress',
    supportImpersonation: 'supportImpersonation'
  });

  const ResourceTypes = Object.freeze({
    LEARNER_PROGRESS: 'learnerProgress',
    ACTIVE_QUIZ: 'activeQuiz',
    SAVED_SESSION: 'savedSession',
    QUESTION_REPORT: 'questionReport',
    ASSIGNMENT: 'assignment',
    CLASS_SUMMARY: 'classSummary',
    CONTENT_ARTIFACT: 'contentArtifact',
    CONTENT_PUBLICATION: 'contentPublication',
    FEATURE_FLAG: 'featureFlag',
    RELEASE_MANIFEST: 'releaseManifest',
    TELEMETRY_SUMMARY: 'telemetrySummary',
    ADMIN_CONSOLE: 'adminConsole',
    AUDIT_LOG: 'auditLog',
    SYSTEM_SETTING: 'systemSetting',
    PRIVACY_PREFERENCES: 'privacyPreferences',
    MISSION_REMINDER_PREFERENCES: 'missionReminderPreferences',
    LEADERBOARD_PARTICIPATION: 'leaderboardParticipation'
  });

  const roleCapabilities = Object.freeze({
    [Roles.STUDENT]: Object.freeze([
      Capabilities.takeQuiz,
      Capabilities.viewAssignments,
      Capabilities.viewOwnProgress,
      Capabilities.resumeOwnQuiz,
      Capabilities.exportOwnLearnerProgress,
      Capabilities.importOwnLearnerProgress,
      Capabilities.viewOwnPrivacyPreferences,
      Capabilities.manageOwnPrivacyPreferences,
      Capabilities.requestLearnerDataDeletion,
      Capabilities.exportLearnerDataBackup
    ]),
    [Roles.PARENT_GUARDIAN]: Object.freeze([
      Capabilities.viewAssignments,
      Capabilities.viewLinkedLearnerReports,
      Capabilities.viewLinkedLearnerDashboard,
      Capabilities.viewOwnQuestionReportStatus,
      Capabilities.exportLinkedLearnerProgress,
      Capabilities.importLinkedLearnerProgress,
      Capabilities.viewLinkedLearnerPrivacyPreferences,
      Capabilities.manageLinkedLearnerPrivacyPreferences,
      Capabilities.manageLinkedLearnerMissionReminders,
      Capabilities.manageLinkedLearnerLeaderboardOptIn,
      Capabilities.assignGuidedMission,
      Capabilities.requestLearnerDataDeletion,
      Capabilities.exportLearnerDataBackup
    ]),
    [Roles.TEACHER]: Object.freeze([
      Capabilities.viewAssignments,
      Capabilities.viewAssignedLearnerReports,
      Capabilities.viewAssignedLearnerDashboard,
      Capabilities.viewClassDashboardSummary,
      Capabilities.triageQuestionReport,
      Capabilities.assignQuestionReport,
      Capabilities.resolveQuestionReport,
      Capabilities.exportAssignedLearnerProgress,
      Capabilities.importAssignedLearnerProgress,
      Capabilities.requestLearnerDataDeletion,
      Capabilities.exportLearnerDataBackup,
      Capabilities.manageAssignments,
      Capabilities.assignGuidedMission,
      Capabilities.manageAssignedLearnerLeaderboardOptIn
    ]),
    [Roles.SYSTEM_ADMIN]: Object.freeze([
      Capabilities.manageAssignments,
      Capabilities.manageContent,
      Capabilities.manageContentArtifacts,
      Capabilities.manageUsers,
      Capabilities.manageUserRoles,
      Capabilities.manageFeatureFlags,
      Capabilities.updateFeatureFlags,
      Capabilities.manageSelectionRollout,
      Capabilities.managePublicSigningKeys,
      Capabilities.viewAdminConsole,
      Capabilities.viewReleaseManifest,
      Capabilities.viewTelemetrySummary,
      Capabilities.viewAuditSummary,
      Capabilities.approveLearnerDataDeletion,
      Capabilities.restoreLearnerDataBackup,
      Capabilities.viewOperationalHealth,
      Capabilities.viewAuditLogs,
      Capabilities.manageSystemSettings
    ]),
    [Roles.CONTENT_REVIEWER]: Object.freeze([
      Capabilities.reviewContentPublication,
      Capabilities.approveContentPublication,
      Capabilities.publishContentPublication
    ])
  });

  function getRoleCapabilities(role) {
    return Array.from(roleCapabilities[String(role || '')] || []);
  }

  function normalizeActor(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
      id: safeString(input.id || input.actorId || input.userId),
      role: safeString(input.role),
      learnerId: safeString(input.learnerId),
      linkedLearnerIds: normalizeIdList(input.linkedLearnerIds),
      assignedLearnerIds: normalizeIdList(input.assignedLearnerIds),
      assignedClassIds: normalizeIdList(input.assignedClassIds),
      tenantMemberships: normalizeTenantMemberships(input.tenantMemberships),
      serviceTenantIds: normalizeIdList(input.serviceTenantIds),
      classroomProgressTransferEnabled: input.classroomProgressTransferEnabled === true,
      learnerDataDeletionEnabled: input.learnerDataDeletionEnabled === true,
      privacyPreferenceManagementEnabled: input.privacyPreferenceManagementEnabled === true,
      missionReminderManagementEnabled: input.missionReminderManagementEnabled === true,
      leaderboardManagementEnabled: input.leaderboardManagementEnabled === true,
      missionAssignmentManagementEnabled: input.missionAssignmentManagementEnabled === true
    };
  }

  function normalizeResource(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
      type: safeString(input.type || input.resourceType),
      id: safeString(input.id || input.resourceId),
      learnerId: safeString(input.learnerId || input.ownerLearnerId),
      ownerLearnerId: safeString(input.ownerLearnerId || input.learnerId),
      classId: safeString(input.classId),
      tenantId: safeString(input.tenantId || input.partitionKey && input.partitionKey.tenantId),
      tenantType: safeString(input.tenantType || input.partitionKey && input.partitionKey.tenantType),
      partitionKey: normalizePartitionKey(input.partitionKey)
    };
  }

  function canAccess(rawActor, action, rawResource) {
    const actor = normalizeActor(rawActor);
    const capability = safeString(action);
    const resource = normalizeResource(rawResource);
    if (!getRoleCapabilities(actor.role).includes(capability)) return false;
    if (!hasTenantAccess(actor, resource)) return false;

    if (actor.role === Roles.STUDENT) {
      return canStudentAccess(actor, capability, resource);
    }
    if (actor.role === Roles.PARENT_GUARDIAN) {
      return canGuardianAccess(actor, capability, resource);
    }
    if (actor.role === Roles.TEACHER) {
      return canTeacherAccess(actor, capability, resource);
    }
    if (actor.role === Roles.SYSTEM_ADMIN) {
      return canSystemAdminAccess(capability, resource);
    }
    if (actor.role === Roles.CONTENT_REVIEWER) {
      return canContentReviewerAccess(capability, resource);
    }
    return false;
  }

  function createGuardianActor(guardianId, links) {
    return normalizeActor({
      id: guardianId,
      role: Roles.PARENT_GUARDIAN,
      linkedLearnerIds: normalizeGuardianLinks(links)
        .filter(link => link.guardianId === safeString(guardianId) && link.status === 'active')
        .map(link => link.learnerId)
    });
  }

  function normalizeGuardianLinks(links) {
    return (Array.isArray(links) ? links : []).map(link => {
      const input = link && typeof link === 'object' ? link : {};
      return {
        guardianId: safeString(input.guardianId),
        learnerId: safeString(input.learnerId),
        relationship: safeString(input.relationship || 'guardian'),
        status: safeString(input.status || 'pending'),
        createdAt: safeString(input.createdAt)
      };
    }).filter(link => link.guardianId && link.learnerId);
  }

  function canViewLearnerProgress(actor, learnerId) {
    const normalized = normalizeActor(actor);
    const resource = { type: ResourceTypes.LEARNER_PROGRESS, learnerId };
    return canAccess(normalized, Capabilities.viewOwnProgress, resource)
      || canAccess(normalized, Capabilities.viewLinkedLearnerReports, resource)
      || canAccess(normalized, Capabilities.viewAssignedLearnerReports, resource);
  }

  function canViewLearnerReports(actor, learnerId) {
    const normalized = normalizeActor(actor);
    const resource = { type: ResourceTypes.SAVED_SESSION, learnerId };
    return canAccess(normalized, Capabilities.viewLinkedLearnerReports, resource)
      || canAccess(normalized, Capabilities.viewAssignedLearnerReports, resource);
  }

  function canViewQuestionReports(actor, learnerId) {
    const normalized = normalizeActor(actor);
    const resource = { type: ResourceTypes.QUESTION_REPORT, learnerId };
    return canAccess(normalized, Capabilities.viewLinkedLearnerReports, resource)
      || canAccess(normalized, Capabilities.viewAssignedLearnerReports, resource);
  }

  function canViewAssignments(actor, learnerId) {
    const normalized = normalizeActor(actor);
    const resource = { type: ResourceTypes.ASSIGNMENT, learnerId };
    return canAccess(normalized, Capabilities.viewAssignments, resource);
  }

  function canAssignGuidedMission(actor, resource) {
    return canAccess(actor, Capabilities.assignGuidedMission, Object.assign({ type: ResourceTypes.ASSIGNMENT }, resource || {}));
  }

  function canViewLearnerDashboard(actor, learnerId) {
    const normalized = normalizeActor(actor);
    const resource = { type: ResourceTypes.LEARNER_PROGRESS, learnerId };
    return canAccess(normalized, Capabilities.viewOwnProgress, resource)
      || canAccess(normalized, Capabilities.viewLinkedLearnerDashboard, resource)
      || canAccess(normalized, Capabilities.viewAssignedLearnerDashboard, resource);
  }

  function canOpenParentPreview(mode) {
    if (mode === 'parentBrowse' || mode === 'parent_preview') return true;
    const input = mode && typeof mode === 'object' ? mode : {};
    return input.parentBrowse === true || input.parentMode === true || input.previewMode === 'parent';
  }

  function filterGuardianVisibleReports(actor, records) {
    const normalized = normalizeActor(actor);
    return (Array.isArray(records) ? records : []).filter(record => {
      const learnerId = record && (record.learnerId || record.ownerLearnerId);
      return canViewLearnerReports(normalized, learnerId) || canViewQuestionReports(normalized, learnerId);
    });
  }

  function requireCapability(actor, action, resource) {
    if (canAccess(actor, action, resource)) return true;
    throw new Error(`access_denied:${safeString(action)}`);
  }

  function getVisibleActions(actor, resource) {
    const normalized = normalizeActor(actor);
    return getRoleCapabilities(normalized.role).filter(action => canAccess(normalized, action, resource));
  }

  function canStudentAccess(actor, action, resource) {
    if (action === Capabilities.takeQuiz) return resource.type === ResourceTypes.ACTIVE_QUIZ || resource.type === '';
    if (action === Capabilities.viewAssignments) {
      return resource.type === ResourceTypes.ASSIGNMENT && sameId(actor.learnerId, resource.learnerId);
    }
    if (action === Capabilities.viewOwnProgress) {
      return resource.type === ResourceTypes.LEARNER_PROGRESS && sameId(actor.learnerId, resource.learnerId);
    }
    if ([Capabilities.exportOwnLearnerProgress, Capabilities.importOwnLearnerProgress, Capabilities.requestLearnerDataDeletion, Capabilities.exportLearnerDataBackup].includes(action)) {
      return resource.type === ResourceTypes.LEARNER_PROGRESS && sameId(actor.learnerId, resource.learnerId);
    }
    if ([Capabilities.viewOwnPrivacyPreferences, Capabilities.manageOwnPrivacyPreferences].includes(action)) {
      return resource.type === ResourceTypes.PRIVACY_PREFERENCES && sameId(actor.learnerId, resource.learnerId);
    }
    if (action === Capabilities.resumeOwnQuiz) {
      return resource.type === ResourceTypes.ACTIVE_QUIZ && sameId(actor.learnerId, resource.ownerLearnerId);
    }
    return false;
  }

  function canGuardianAccess(actor, action, resource) {
    if (action === Capabilities.viewAssignments) {
      return resource.type === ResourceTypes.ASSIGNMENT && actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (action === Capabilities.viewOwnQuestionReportStatus) {
      return resource.type === ResourceTypes.QUESTION_REPORT && actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if ([Capabilities.exportLinkedLearnerProgress, Capabilities.importLinkedLearnerProgress, Capabilities.requestLearnerDataDeletion, Capabilities.exportLearnerDataBackup].includes(action)) {
      return resource.type === ResourceTypes.LEARNER_PROGRESS && actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (action === Capabilities.viewLinkedLearnerPrivacyPreferences) {
      return resource.type === ResourceTypes.PRIVACY_PREFERENCES && actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (action === Capabilities.manageLinkedLearnerPrivacyPreferences) {
      return resource.type === ResourceTypes.PRIVACY_PREFERENCES &&
        actor.privacyPreferenceManagementEnabled === true &&
        actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (action === Capabilities.manageLinkedLearnerLeaderboardOptIn) {
      return resource.type === ResourceTypes.LEADERBOARD_PARTICIPATION &&
        actor.leaderboardManagementEnabled === true &&
        actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (action === Capabilities.manageLinkedLearnerMissionReminders) {
      return resource.type === ResourceTypes.MISSION_REMINDER_PREFERENCES &&
        actor.missionReminderManagementEnabled === true &&
        actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (action === Capabilities.assignGuidedMission) {
      return resource.type === ResourceTypes.ASSIGNMENT &&
        actor.missionAssignmentManagementEnabled === true &&
        !resource.classId &&
        actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (![Capabilities.viewLinkedLearnerReports, Capabilities.viewLinkedLearnerDashboard].includes(action)) return false;
    if (![
      ResourceTypes.LEARNER_PROGRESS,
      ResourceTypes.SAVED_SESSION,
      ResourceTypes.QUESTION_REPORT,
      ResourceTypes.ACTIVE_QUIZ
    ].includes(resource.type)) return false;
    return actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
  }

  function canTeacherAccess(actor, action, resource) {
    if (action === Capabilities.viewAssignments) {
      return resource.type === ResourceTypes.ASSIGNMENT &&
        (actor.assignedLearnerIds.includes(resource.learnerId) || actor.assignedClassIds.includes(resource.classId));
    }
    if (action === Capabilities.viewAssignedLearnerReports || action === Capabilities.viewAssignedLearnerDashboard) {
      if (![ResourceTypes.LEARNER_PROGRESS, ResourceTypes.SAVED_SESSION, ResourceTypes.QUESTION_REPORT].includes(resource.type)) return false;
      return actor.assignedLearnerIds.includes(resource.learnerId);
    }
    if (action === Capabilities.viewClassDashboardSummary) {
      return resource.type === ResourceTypes.CLASS_SUMMARY && actor.assignedClassIds.includes(resource.classId);
    }
    if ([Capabilities.triageQuestionReport, Capabilities.assignQuestionReport, Capabilities.resolveQuestionReport].includes(action)) {
      return resource.type === ResourceTypes.QUESTION_REPORT && actor.assignedLearnerIds.includes(resource.learnerId);
    }
    if ([Capabilities.exportAssignedLearnerProgress, Capabilities.importAssignedLearnerProgress, Capabilities.exportLearnerDataBackup].includes(action)) {
      return resource.type === ResourceTypes.LEARNER_PROGRESS &&
        actor.classroomProgressTransferEnabled === true &&
        actor.assignedLearnerIds.includes(resource.learnerId);
    }
    if (action === Capabilities.requestLearnerDataDeletion) {
      return resource.type === ResourceTypes.LEARNER_PROGRESS &&
        actor.learnerDataDeletionEnabled === true &&
        actor.assignedLearnerIds.includes(resource.learnerId);
    }
    if (action === Capabilities.manageAssignments) {
      return resource.type === ResourceTypes.ASSIGNMENT &&
        (actor.assignedClassIds.includes(resource.classId) || actor.assignedLearnerIds.includes(resource.learnerId));
    }
    if (action === Capabilities.assignGuidedMission) {
      return resource.type === ResourceTypes.ASSIGNMENT &&
        (actor.assignedClassIds.includes(resource.classId) || actor.assignedLearnerIds.includes(resource.learnerId));
    }
    if (action === Capabilities.manageAssignedLearnerLeaderboardOptIn) {
      return resource.type === ResourceTypes.LEADERBOARD_PARTICIPATION &&
        actor.leaderboardManagementEnabled === true &&
        (actor.assignedClassIds.includes(resource.classId) || actor.assignedLearnerIds.includes(resource.learnerId));
    }
    return false;
  }

  function canSystemAdminAccess(action, resource) {
    if (action === Capabilities.manageContent || action === Capabilities.manageContentArtifacts) return resource.type === ResourceTypes.CONTENT_ARTIFACT;
    if (action === Capabilities.manageUsers || action === Capabilities.manageUserRoles) return resource.type === ResourceTypes.SYSTEM_SETTING || resource.type === '';
    if ([Capabilities.manageFeatureFlags, Capabilities.updateFeatureFlags, Capabilities.manageSelectionRollout].includes(action)) return resource.type === ResourceTypes.FEATURE_FLAG;
    if (action === Capabilities.viewAdminConsole) return resource.type === ResourceTypes.ADMIN_CONSOLE;
    if (action === Capabilities.viewReleaseManifest) return resource.type === ResourceTypes.RELEASE_MANIFEST;
    if (action === Capabilities.viewTelemetrySummary) return resource.type === ResourceTypes.TELEMETRY_SUMMARY;
    if (action === Capabilities.managePublicSigningKeys || action === Capabilities.viewOperationalHealth) return resource.type === ResourceTypes.SYSTEM_SETTING;
    if (action === Capabilities.approveLearnerDataDeletion || action === Capabilities.restoreLearnerDataBackup) return resource.type === ResourceTypes.LEARNER_PROGRESS;
    if (action === Capabilities.viewAuditLogs || action === Capabilities.viewAuditSummary) return resource.type === ResourceTypes.AUDIT_LOG;
    if (action === Capabilities.manageSystemSettings) return resource.type === ResourceTypes.SYSTEM_SETTING;
    if (action === Capabilities.manageAssignments) return false;
    return false;
  }

  function canContentReviewerAccess(action, resource) {
    return [
      Capabilities.reviewContentPublication,
      Capabilities.approveContentPublication,
      Capabilities.publishContentPublication
    ].includes(action) && resource.type === ResourceTypes.CONTENT_PUBLICATION;
  }

  function normalizeIdList(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
      .map(safeString)
      .filter(Boolean)));
  }

  function normalizeTenantMemberships(value) {
    return (Array.isArray(value) ? value : []).map(item => {
      const input = item && typeof item === 'object' ? item : {};
      return {
        tenantId: safeString(input.tenantId),
        tenantType: safeString(input.tenantType),
        role: safeString(input.role),
        status: safeString(input.status || 'pending'),
        learnerIds: normalizeIdList(input.learnerIds || input.linkedLearnerIds || input.assignedLearnerIds),
        classIds: normalizeIdList(input.classIds || input.assignedClassIds)
      };
    }).filter(item => item.tenantId && item.tenantType);
  }

  function normalizePartitionKey(value) {
    const input = value && typeof value === 'object' ? value : {};
    if (!input.tenantId && !input.tenantType) return null;
    return {
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      resourceType: safeString(input.resourceType),
      ownerType: safeString(input.ownerType),
      ownerId: safeString(input.ownerId),
      learnerId: safeString(input.learnerId),
      classId: safeString(input.classId),
      accessBoundary: safeString(input.accessBoundary)
    };
  }

  function hasTenantAccess(actor, resource) {
    if (!resource.tenantId) return true;
    return actor.tenantMemberships.some(membership =>
      membership.status === 'active' &&
      membership.tenantId === resource.tenantId &&
      membership.tenantType === resource.tenantType
    );
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function sameId(left, right) {
    return !!left && !!right && left === right;
  }

  return {
    Capabilities,
    ResourceTypes,
    Roles,
    canAccess,
    canOpenParentPreview,
    canViewLearnerProgress,
    canViewLearnerReports,
    canViewQuestionReports,
    canViewAssignments,
    canAssignGuidedMission,
    canViewLearnerDashboard,
    createGuardianActor,
    filterGuardianVisibleReports,
    getRoleCapabilities,
    getVisibleActions,
    normalizeActor,
    normalizeGuardianLinks,
    normalizeResource,
    requireCapability
  };
});
