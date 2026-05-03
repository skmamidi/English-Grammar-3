(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestInstitutionalPolicyDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const access = root.GrammarQuestAccessControl ||
    (typeof require === 'function' ? require('./access-control') : null);
  const privacy = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);

  const FeatureIntents = Object.freeze({
    CORE_PRACTICE: 'core_practice',
    TELEMETRY: 'telemetry',
    EXPERIMENTS: 'experiments',
    AI_ASSISTED_AUTHORING: 'ai_assisted_authoring',
    ACCOUNT_SYNC: 'account_sync',
    OPTIONAL_PERSONALIZATION: 'optional_personalization',
    ASSIGNMENT_VISIBILITY: 'assignment_visibility',
    NOTIFICATION_DELIVERY: 'notification_delivery',
    FUTURE_BILLING: 'future_billing'
  });

  const POLICY_PRECEDENCE = Object.freeze([
    'legal_school_policy',
    'deletion_retention_restrictions',
    'guardian_consent',
    'learner_privacy_preferences',
    'feature_flags',
    'route_specific_ui_state'
  ]);

  const flagKeys = Object.freeze({
    [FeatureIntents.TELEMETRY]: 'telemetry',
    [FeatureIntents.EXPERIMENTS]: 'experiments',
    [FeatureIntents.AI_ASSISTED_AUTHORING]: 'aiAssistedAuthoring',
    [FeatureIntents.ACCOUNT_SYNC]: 'accountSync',
    [FeatureIntents.OPTIONAL_PERSONALIZATION]: 'optionalPersonalization',
    [FeatureIntents.ASSIGNMENT_VISIBILITY]: 'assignmentVisibility',
    [FeatureIntents.NOTIFICATION_DELIVERY]: 'notificationDelivery',
    [FeatureIntents.FUTURE_BILLING]: 'futureBilling'
  });

  function resolveInstitutionalPolicy(input = {}) {
    const featureIntent = safeString(input.featureIntent || input.intent || input.feature);
    const actor = access.normalizeActor(input.actor || input);
    const learnerId = safeString(input.learnerId || input.ownerLearnerId);

    if (featureIntent === FeatureIntents.CORE_PRACTICE) {
      return result(true, 'core_practice_available', featureIntent);
    }

    if (isParentPreview(input.actor || input)) return result(false, 'parent_preview_read_only', featureIntent);
    if (input.supportImpersonation === true || (input.actor && input.actor.supportImpersonation === true)) {
      return result(false, 'support_context_denied', featureIntent);
    }
    if (actor.role === access.Roles.SYSTEM_ADMIN || actor.role === access.Roles.CONTENT_REVIEWER || !actor.role) {
      return result(false, 'learner_policy_actor_denied', featureIntent);
    }
    if (input.deletionOrRetentionRestriction === true || input.retentionRestricted === true || input.deletionPending === true) {
      return result(false, 'deletion_or_retention_restriction', featureIntent);
    }
    if (isDisabledByInstitution(featureIntent, input.institutionPolicy || input.schoolPolicy)) {
      return result(false, 'institution_policy_denied', featureIntent);
    }
    if (!isRelationshipScoped(actor, learnerId, safeString(input.classId), featureIntent)) {
      return result(false, 'relationship_scope_denied', featureIntent);
    }
    if (!hasConsent(featureIntent, input)) return result(false, 'explicit_consent_required', featureIntent);
    if (!allowsLearnerPreference(featureIntent, input.learnerPrivacyPreferences || input.privacyPreferences)) {
      return result(false, 'learner_preference_denied', featureIntent);
    }
    if (!isFeatureFlagEnabled(featureIntent, input.featureFlags || input.flags)) {
      return result(false, 'feature_flag_disabled', featureIntent);
    }
    return result(true, 'eligible', featureIntent);
  }

  function isDisabledByInstitution(featureIntent, policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    if (Array.isArray(input.disabledFeatures) && input.disabledFeatures.includes(featureIntent)) return true;
    const key = flagKeys[featureIntent];
    return key && input[key] === false;
  }

  function isRelationshipScoped(actor, learnerId, classId, featureIntent) {
    if (!learnerId && featureIntent !== FeatureIntents.AI_ASSISTED_AUTHORING) return false;
    if (actor.role === access.Roles.STUDENT) return actor.learnerId === learnerId;
    if (actor.role === access.Roles.PARENT_GUARDIAN) return actor.linkedLearnerIds.includes(learnerId);
    if (actor.role === access.Roles.TEACHER) {
      if (featureIntent === FeatureIntents.AI_ASSISTED_AUTHORING) return true;
      return actor.assignedLearnerIds.includes(learnerId) || (!!classId && actor.assignedClassIds.includes(classId));
    }
    return false;
  }

  function hasConsent(featureIntent, input) {
    const guardianConsent = input.guardianConsent && typeof input.guardianConsent === 'object' ? input.guardianConsent : {};
    const schoolPolicy = Object.assign({}, objectOrEmpty(input.institutionPolicy), objectOrEmpty(input.schoolPolicy));
    const key = flagKeys[featureIntent];
    if (featureIntent === FeatureIntents.ASSIGNMENT_VISIBILITY) {
      return guardianConsent.assignmentVisibility === true || schoolPolicy.assignmentVisibility === true;
    }
    if (featureIntent === FeatureIntents.TELEMETRY) return guardianConsent.telemetry === true || schoolPolicy.telemetry === true;
    if (featureIntent === FeatureIntents.EXPERIMENTS) return guardianConsent.experiments === true || schoolPolicy.experiments === true;
    if (featureIntent === FeatureIntents.AI_ASSISTED_AUTHORING) return guardianConsent.aiAssistedAuthoring === true || schoolPolicy.aiAssistedAuthoring === true;
    if (featureIntent === FeatureIntents.ACCOUNT_SYNC) return guardianConsent.accountSync === true || schoolPolicy.accountSync === true;
    if (featureIntent === FeatureIntents.OPTIONAL_PERSONALIZATION) return guardianConsent.optionalPersonalization === true || schoolPolicy.optionalPersonalization === true;
    if (featureIntent === FeatureIntents.NOTIFICATION_DELIVERY) return guardianConsent.notificationDelivery === true || schoolPolicy.notificationDelivery === true;
    if (featureIntent === FeatureIntents.FUTURE_BILLING) return guardianConsent.futureBilling === true || schoolPolicy.futureBilling === true;
    return key ? guardianConsent[key] === true || schoolPolicy[key] === true : false;
  }

  function allowsLearnerPreference(featureIntent, preferences) {
    const normalized = privacy.normalizePrivacyPreferences(preferences);
    if (featureIntent === FeatureIntents.TELEMETRY) return normalized.telemetryEnabled === true;
    if (featureIntent === FeatureIntents.EXPERIMENTS) {
      return normalized.telemetryEnabled === true && normalized.experimentParticipationEnabled === true;
    }
    if (featureIntent === FeatureIntents.OPTIONAL_PERSONALIZATION) {
      return preferences && preferences.optionalPersonalizationEnabled !== false;
    }
    return true;
  }

  function isFeatureFlagEnabled(featureIntent, flags) {
    const key = flagKeys[featureIntent];
    if (!key) return false;
    const input = flags && typeof flags === 'object' ? flags : {};
    return input[key] === true;
  }

  function isParentPreview(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return privacy.isParentPreview(input);
  }

  function objectOrEmpty(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function result(allowed, reason, featureIntent) {
    return { allowed, reason, featureIntent, precedence: POLICY_PRECEDENCE };
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    FeatureIntents,
    POLICY_PRECEDENCE,
    resolveInstitutionalPolicy
  };
});
