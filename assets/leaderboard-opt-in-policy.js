(function (root, factory) {
  'use strict';

  const access = root.GrammarQuestAccessControl ||
    (typeof require === 'function' ? require('./access-control') : null);
  const institutionalPolicy = root.GrammarQuestInstitutionalPolicyDomain ||
    (typeof require === 'function' ? require('./institutional-policy-domain') : null);
  const leaderboardDomain = root.GrammarQuestLeaderboardDomain ||
    (typeof require === 'function' ? require('./leaderboard-domain') : null);
  const api = factory(access, institutionalPolicy, leaderboardDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLeaderboardOptInPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (access, institutionalPolicy, leaderboardDomain) {
  'use strict';

  const VALID_SCOPES = new Set(['global', 'class']);
  const UNSAFE_ALIAS_PATTERN = /@|(^|\b)(student|learner|user|email|account|id)\b|[-_]?(learner|student)[-_]?[a-z0-9]+/i;
  const COMMON_REAL_NAME_PATTERN = /^(jane|john|mary|maria|michael|david|sarah|robert)\s+[a-z]+$/i;

  function normalizeLeaderboardProfile(profile) {
    const input = profile && typeof profile === 'object' ? profile : {};
    const aliasResult = input.leaderboardOptIn === true ? validateLeaderboardAlias(input.leaderboardAlias || input.alias) : { valid: false, alias: '', errors: [] };
    const participantRef = input.leaderboardOptIn === true ? normalizeParticipantRef(input.participantRef) : '';
    return {
      schemaVersion: 1,
      leaderboardOptIn: input.leaderboardOptIn === true && aliasResult.valid && !!participantRef,
      leaderboardAlias: aliasResult.valid ? aliasResult.alias : '',
      leaderboardScope: VALID_SCOPES.has(input.leaderboardScope) ? input.leaderboardScope : 'global',
      participantRef,
      personalXpProjectionRef: safeProjectionRef(input.personalXpProjectionRef),
      consent: sanitizeConsent(input.consent),
      removalIntent: normalizeRemovalIntent(input.removalIntent)
    };
  }

  function canManageLeaderboardOptIn(input = {}) {
    const actor = access.normalizeActor(input.actor);
    if (access.canOpenParentPreview(input.actor || input)) return decision(false, 'parent_preview_read_only');
    if (actor.role === access.Roles.STUDENT) return decision(false, 'guardian_or_teacher_authorization_required');
    if (![access.Roles.PARENT_GUARDIAN, access.Roles.TEACHER].includes(actor.role)) return decision(false, 'guardian_or_teacher_authorization_required');
    const resource = {
      type: access.ResourceTypes.LEADERBOARD_PARTICIPATION,
      learnerId: safeString(input.learnerId),
      ownerLearnerId: safeString(input.learnerId),
      classId: safeString(input.classId)
    };
    const capability = actor.role === access.Roles.PARENT_GUARDIAN
      ? access.Capabilities.manageLinkedLearnerLeaderboardOptIn
      : access.Capabilities.manageAssignedLearnerLeaderboardOptIn;
    const actorWithPolicy = Object.assign({}, actor, { leaderboardManagementEnabled: true });
    if (!access.canAccess(actorWithPolicy, capability, resource)) return decision(false, 'relationship_scope_denied');
    const policyResult = institutionalPolicy.resolveInstitutionalPolicy(Object.assign({}, input, {
      actor,
      featureIntent: institutionalPolicy.FeatureIntents.LEADERBOARD_PARTICIPATION
    }));
    if (!policyResult.allowed) return decision(false, policyResult.reason);
    return decision(true, 'allowed');
  }

  function applyLeaderboardOptInChange(input = {}) {
    const authorization = canManageLeaderboardOptIn(input);
    const current = normalizeLeaderboardProfile(input.currentProfile);
    if (!authorization.allowed) return { allowed: false, reason: authorization.reason, profile: current };
    const action = safeString(input.action);
    if (action === 'enable' || action === 'edit') {
      const alias = validateLeaderboardAlias(input.alias || input.leaderboardAlias);
      if (!alias.valid) return { allowed: false, reason: alias.errors[0] || 'leaderboard_alias_invalid', profile: current };
      const participantRef = current.participantRef || `leaderboardParticipants/${stableParticipantId(input.learnerId, alias.alias)}`;
      return {
        allowed: true,
        reason: 'allowed',
        profile: normalizeLeaderboardProfile(Object.assign({}, current, {
          leaderboardOptIn: true,
          leaderboardAlias: alias.alias,
          participantRef,
          leaderboardScope: input.leaderboardScope || current.leaderboardScope,
          consent: consentFrom(input),
          removalIntent: null
        }))
      };
    }
    if (action === 'disable') {
      return {
        allowed: true,
        reason: 'allowed',
        profile: normalizeLeaderboardProfile(Object.assign({}, current, {
          leaderboardOptIn: false,
          leaderboardAlias: '',
          participantRef: '',
          consent: consentFrom(input),
          removalIntent: createLeaderboardRemovalIntent({
            participantRef: current.participantRef,
            personalXpProjectionRef: current.personalXpProjectionRef,
            requestedAt: input.now,
            requestedBy: actorRef(input.actor)
          })
        }))
      };
    }
    return { allowed: false, reason: 'leaderboard_action_unknown', profile: current };
  }

  function buildLeaderboardOptInDashboardProjection(input = {}) {
    const profile = normalizeLeaderboardProfile(input.profile);
    const authorization = canManageLeaderboardOptIn(input);
    return {
      schemaVersion: 1,
      state: profile.leaderboardOptIn ? 'opted_in' : 'opted_out',
      displayAlias: profile.leaderboardAlias,
      leaderboardScope: profile.leaderboardScope,
      participantRef: profile.leaderboardOptIn ? profile.participantRef : '',
      canEnable: authorization.allowed && !profile.leaderboardOptIn,
      canEditAlias: authorization.allowed && profile.leaderboardOptIn,
      canDisable: authorization.allowed && profile.leaderboardOptIn,
      disabledReason: authorization.allowed ? '' : authorization.reason,
      removalPending: profile.removalIntent.removeFromFutureMaterializations === true
    };
  }

  function validateLeaderboardAlias(alias) {
    const normalized = safeString(alias).replace(/\s+/g, ' ');
    const errors = [];
    if (!normalized) errors.push('leaderboard_alias_required');
    if (normalized.length < 3 || normalized.length > 24) errors.push('leaderboard_alias_length_invalid');
    if (!/^[A-Za-z][A-Za-z0-9 ]*$/.test(normalized)) errors.push('leaderboard_alias_characters_invalid');
    if (UNSAFE_ALIAS_PATTERN.test(normalized) || COMMON_REAL_NAME_PATTERN.test(normalized)) errors.push('leaderboard_alias_identity_bearing');
    if (leaderboardDomain) {
      try {
        leaderboardDomain.normalizeLeaderboardEntry({
          participantRef: 'leaderboardParticipants/alias-check',
          displayAlias: normalized,
          score: 1,
          optedIn: true
        });
      } catch (error) {
        errors.push(error && error.message || 'leaderboard_alias_invalid');
      }
    }
    return { valid: errors.length === 0, alias: errors.length ? '' : normalized, errors: Array.from(new Set(errors)) };
  }

  function createLeaderboardRemovalIntent(input = {}) {
    return {
      schemaVersion: 1,
      participantRef: normalizeParticipantRef(input.participantRef),
      removeFromFutureMaterializations: true,
      preservePersonalXpProjectionRef: safeProjectionRef(input.personalXpProjectionRef),
      requestedAt: safeIso(input.requestedAt) || '',
      requestedBy: safeActorRef(input.requestedBy)
    };
  }

  function normalizeRemovalIntent(intent) {
    const input = intent && typeof intent === 'object' ? intent : {};
    if (input.removeFromFutureMaterializations !== true) {
      return {
        schemaVersion: 1,
        participantRef: '',
        removeFromFutureMaterializations: false,
        preservePersonalXpProjectionRef: '',
        requestedAt: '',
        requestedBy: ''
      };
    }
    return createLeaderboardRemovalIntent(input);
  }

  function consentFrom(input) {
    const actor = access.normalizeActor(input.actor);
    return sanitizeConsent({
      authorizedByRef: actorRef(actor),
      authorizedByRole: actor.role,
      authorizedAt: input.now,
      policyVersion: input.policyVersion || 1,
      scope: input.leaderboardScope || 'global'
    });
  }

  function sanitizeConsent(consent) {
    const input = consent && typeof consent === 'object' ? consent : {};
    return {
      schemaVersion: 1,
      authorizedByRef: safeActorRef(input.authorizedByRef),
      authorizedByRole: [access.Roles.PARENT_GUARDIAN, access.Roles.TEACHER].includes(input.authorizedByRole) ? input.authorizedByRole : '',
      authorizedAt: safeIso(input.authorizedAt) || '',
      policyVersion: Math.max(1, Math.round(Number(input.policyVersion) || 1)),
      scope: VALID_SCOPES.has(input.scope) ? input.scope : 'global'
    };
  }

  function actorRef(actor) {
    const normalized = access.normalizeActor(actor);
    if (normalized.role === access.Roles.PARENT_GUARDIAN) return `guardians/${normalized.id}`;
    if (normalized.role === access.Roles.TEACHER) return `teachers/${normalized.id}`;
    return '';
  }

  function stableParticipantId(learnerId, alias) {
    let hash = 0;
    const input = `${safeString(learnerId)}:${safeString(alias)}`;
    for (let index = 0; index < input.length; index += 1) {
      hash = ((hash << 5) - hash + input.charCodeAt(index)) >>> 0;
    }
    return `participant-${hash.toString(16).padStart(8, '0')}`;
  }

  function decision(allowed, reason) {
    return { allowed, reason };
  }

  function normalizeParticipantRef(value) {
    const ref = safeString(value);
    return /^leaderboardParticipants\/[A-Za-z0-9_-]+$/.test(ref) ? ref : '';
  }

  function safeProjectionRef(value) {
    const ref = safeString(value);
    return /^xpProjections\/[A-Za-z0-9_-]+$/.test(ref) ? ref : '';
  }

  function safeActorRef(value) {
    const ref = safeString(value);
    return /^(guardians|teachers)\/[A-Za-z0-9_-]+$/.test(ref) ? ref : '';
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    applyLeaderboardOptInChange,
    buildLeaderboardOptInDashboardProjection,
    canManageLeaderboardOptIn,
    createLeaderboardRemovalIntent,
    normalizeLeaderboardProfile,
    validateLeaderboardAlias
  };
});
