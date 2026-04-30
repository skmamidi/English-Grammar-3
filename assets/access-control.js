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
    SYSTEM_ADMIN: 'system_admin'
  });

  const Capabilities = Object.freeze({
    takeQuiz: 'takeQuiz',
    viewAssignments: 'viewAssignments',
    viewOwnProgress: 'viewOwnProgress',
    resumeOwnQuiz: 'resumeOwnQuiz',
    viewLinkedLearnerReports: 'viewLinkedLearnerReports',
    viewAssignedLearnerReports: 'viewAssignedLearnerReports',
    manageAssignments: 'manageAssignments',
    manageContent: 'manageContent',
    manageUsers: 'manageUsers',
    manageUserRoles: 'manageUserRoles',
    manageFeatureFlags: 'manageFeatureFlags',
    manageSelectionRollout: 'manageSelectionRollout',
    manageContentArtifacts: 'manageContentArtifacts',
    managePublicSigningKeys: 'managePublicSigningKeys',
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
    CONTENT_ARTIFACT: 'contentArtifact',
    FEATURE_FLAG: 'featureFlag',
    AUDIT_LOG: 'auditLog',
    SYSTEM_SETTING: 'systemSetting'
  });

  const roleCapabilities = Object.freeze({
    [Roles.STUDENT]: Object.freeze([
      Capabilities.takeQuiz,
      Capabilities.viewAssignments,
      Capabilities.viewOwnProgress,
      Capabilities.resumeOwnQuiz
    ]),
    [Roles.PARENT_GUARDIAN]: Object.freeze([
      Capabilities.viewAssignments,
      Capabilities.viewLinkedLearnerReports
    ]),
    [Roles.TEACHER]: Object.freeze([
      Capabilities.viewAssignments,
      Capabilities.viewAssignedLearnerReports,
      Capabilities.manageAssignments
    ]),
    [Roles.SYSTEM_ADMIN]: Object.freeze([
      Capabilities.manageAssignments,
      Capabilities.manageContent,
      Capabilities.manageContentArtifacts,
      Capabilities.manageUsers,
      Capabilities.manageUserRoles,
      Capabilities.manageFeatureFlags,
      Capabilities.manageSelectionRollout,
      Capabilities.managePublicSigningKeys,
      Capabilities.viewOperationalHealth,
      Capabilities.viewAuditLogs,
      Capabilities.manageSystemSettings
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
      assignedClassIds: normalizeIdList(input.assignedClassIds)
    };
  }

  function normalizeResource(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
      type: safeString(input.type || input.resourceType),
      id: safeString(input.id || input.resourceId),
      learnerId: safeString(input.learnerId || input.ownerLearnerId),
      ownerLearnerId: safeString(input.ownerLearnerId || input.learnerId),
      classId: safeString(input.classId)
    };
  }

  function canAccess(rawActor, action, rawResource) {
    const actor = normalizeActor(rawActor);
    const capability = safeString(action);
    const resource = normalizeResource(rawResource);
    if (!getRoleCapabilities(actor.role).includes(capability)) return false;

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
    if (action === Capabilities.resumeOwnQuiz) {
      return resource.type === ResourceTypes.ACTIVE_QUIZ && sameId(actor.learnerId, resource.ownerLearnerId);
    }
    return false;
  }

  function canGuardianAccess(actor, action, resource) {
    if (action === Capabilities.viewAssignments) {
      return resource.type === ResourceTypes.ASSIGNMENT && actor.linkedLearnerIds.includes(resource.learnerId || resource.ownerLearnerId);
    }
    if (action !== Capabilities.viewLinkedLearnerReports) return false;
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
    if (action === Capabilities.viewAssignedLearnerReports) {
      if (![ResourceTypes.LEARNER_PROGRESS, ResourceTypes.SAVED_SESSION, ResourceTypes.QUESTION_REPORT].includes(resource.type)) return false;
      return actor.assignedLearnerIds.includes(resource.learnerId);
    }
    if (action === Capabilities.manageAssignments) {
      return resource.type === ResourceTypes.ASSIGNMENT &&
        (actor.assignedClassIds.includes(resource.classId) || actor.assignedLearnerIds.includes(resource.learnerId));
    }
    return false;
  }

  function canSystemAdminAccess(action, resource) {
    if (action === Capabilities.manageContent || action === Capabilities.manageContentArtifacts) return resource.type === ResourceTypes.CONTENT_ARTIFACT;
    if (action === Capabilities.manageUsers || action === Capabilities.manageUserRoles) return resource.type === ResourceTypes.SYSTEM_SETTING || resource.type === '';
    if (action === Capabilities.manageFeatureFlags || action === Capabilities.manageSelectionRollout) return resource.type === ResourceTypes.FEATURE_FLAG;
    if (action === Capabilities.managePublicSigningKeys || action === Capabilities.viewOperationalHealth) return resource.type === ResourceTypes.SYSTEM_SETTING;
    if (action === Capabilities.viewAuditLogs) return resource.type === ResourceTypes.AUDIT_LOG;
    if (action === Capabilities.manageSystemSettings) return resource.type === ResourceTypes.SYSTEM_SETTING;
    if (action === Capabilities.manageAssignments) return false;
    return false;
  }

  function normalizeIdList(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
      .map(safeString)
      .filter(Boolean)));
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
