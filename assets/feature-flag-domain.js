(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestFeatureFlagDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const crypto = typeof require === 'function' ? require('node:crypto') : null;
  const institutionalPolicy = root.GrammarQuestInstitutionalPolicyDomain ||
    (typeof require === 'function' ? require('./institutional-policy-domain') : null);
  const privacy = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);
  const ALLOWED_DOMAINS = ['grammar', 'capitalization', 'punctuation', 'reading-comprehension', 'reference-skills', 'vocabulary'];
  const ALLOWED_STAGES = ['off', 'local', 'pilot', 'staged', 'full'];
  const POLICY_AWARE_FEATURES = Object.freeze([
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
  const DEFAULT_FEATURE_FLAGS = Object.freeze({
    coreLocalPracticeEnabled: true,
    serverSelectionEnabled: false,
    serverSelectionPilotDomains: [],
    serverSelectionPilotSubtopics: [],
    snapshotFallbackEnabled: false,
    telemetryEnabled: false,
    experimentsEnabled: false,
    aiAssistedAuthoringEnabled: false,
    preloadingEnabled: false,
    syncEnabled: false,
    xpLocalPreviewEnabled: false,
    xpServerAwardingEnabled: false,
    leaderboardMaterializationEnabled: false,
    leaderboardDisplayEnabled: false,
    xpTelemetryEnabled: false,
    missionCatalogEnabled: false,
    missionLearnerRouteEnabled: false,
    missionRecommendationsEnabled: false,
    missionAssignmentWorkflowsEnabled: false,
    missionRemindersEnabled: false,
    missionRewardsEnabled: false,
    missionTelemetryEnabled: false,
    sparseQuestionDeliveryPilot: false,
    granularOfflineQuestionStore: false,
    serverAdjudicatedLearningPilot: false,
    personalizationFeatureStorePilot: false,
    dynamicQuizAssemblyPilot: false,
    learningExperimentPilot: false,
    personalizationDisplayEnabled: false,
    personalizationTelemetryEnabled: false,
    optionalPersonalizationEnabled: false,
    notificationDeliveryEnabled: false,
    nativeContentBundleEnabled: false,
    futureBillingDisplayEnabled: false,
    futureBillingCheckoutEnabled: false,
    strictVisualPerfMode: false,
    rolloutStage: 'off'
  });

  function normalizeFeatureFlags(input = {}) {
    const flags = Object.assign({}, DEFAULT_FEATURE_FLAGS);
    flags.serverSelectionEnabled = input.serverSelectionEnabled === true || input.enableServerQuestionSelection === true;
    flags.serverSelectionPilotDomains = normalizeDomainList(input.serverSelectionPilotDomains || input.serverQuestionSelectionPilotDomains);
    flags.serverSelectionPilotSubtopics = normalizeStringList(input.serverSelectionPilotSubtopics || input.serverQuestionSelectionPilotSubtopics);
    flags.snapshotFallbackEnabled = input.snapshotFallbackEnabled === true || input.allowServerSelectionSnapshots === true;
    flags.telemetryEnabled = input.telemetryEnabled === true;
    flags.experimentsEnabled = input.experimentsEnabled === true || input.experimentParticipationEnabled === true;
    flags.aiAssistedAuthoringEnabled = input.aiAssistedAuthoringEnabled === true;
    flags.preloadingEnabled = input.preloadingEnabled === true || input.enableQuestionChunkPreload === true;
    flags.syncEnabled = input.syncEnabled === true;
    flags.xpLocalPreviewEnabled = input.xpLocalPreviewEnabled === true;
    flags.xpServerAwardingEnabled = input.xpServerAwardingEnabled === true;
    flags.leaderboardMaterializationEnabled = input.leaderboardMaterializationEnabled === true;
    flags.leaderboardDisplayEnabled = input.leaderboardDisplayEnabled === true;
    flags.xpTelemetryEnabled = input.xpTelemetryEnabled === true;
    flags.missionCatalogEnabled = input.missionCatalogEnabled === true;
    flags.missionLearnerRouteEnabled = input.missionLearnerRouteEnabled === true;
    flags.missionRecommendationsEnabled = input.missionRecommendationsEnabled === true;
    flags.missionAssignmentWorkflowsEnabled = input.missionAssignmentWorkflowsEnabled === true;
    flags.missionRemindersEnabled = input.missionRemindersEnabled === true;
    flags.missionRewardsEnabled = input.missionRewardsEnabled === true;
    flags.missionTelemetryEnabled = input.missionTelemetryEnabled === true;
    flags.sparseQuestionDeliveryPilot = input.sparseQuestionDeliveryPilot === true;
    flags.granularOfflineQuestionStore = input.granularOfflineQuestionStore === true;
    flags.serverAdjudicatedLearningPilot = input.serverAdjudicatedLearningPilot === true;
    flags.personalizationFeatureStorePilot = input.personalizationFeatureStorePilot === true;
    flags.dynamicQuizAssemblyPilot = input.dynamicQuizAssemblyPilot === true;
    flags.learningExperimentPilot = input.learningExperimentPilot === true;
    flags.personalizationDisplayEnabled = input.personalizationDisplayEnabled === true;
    flags.personalizationTelemetryEnabled = input.personalizationTelemetryEnabled === true;
    flags.optionalPersonalizationEnabled = input.optionalPersonalizationEnabled === true;
    flags.notificationDeliveryEnabled = input.notificationDeliveryEnabled === true || input.notificationsEnabled === true;
    flags.nativeContentBundleEnabled = input.nativeContentBundleEnabled === true;
    flags.futureBillingDisplayEnabled = input.futureBillingDisplayEnabled === true;
    flags.futureBillingCheckoutEnabled = input.futureBillingCheckoutEnabled === true;
    flags.strictVisualPerfMode = input.strictVisualPerfMode === true;
    flags.rolloutStage = ALLOWED_STAGES.includes(input.rolloutStage) ? input.rolloutStage : DEFAULT_FEATURE_FLAGS.rolloutStage;
    return flags;
  }

  function validateFeatureFlags(input) {
    const flags = normalizeFeatureFlags(input);
    const errors = [];
    if (flags.serverSelectionPilotDomains.some(domain => !ALLOWED_DOMAINS.includes(domain))) errors.push('invalid server selection domain');
    if (!ALLOWED_STAGES.includes(flags.rolloutStage)) errors.push('invalid rollout stage');
    return errors;
  }

  function isFeatureEnabled(input, name) {
    const flags = normalizeFeatureFlags(input);
    return flags[name] === true;
  }

  function evaluatePolicyAwareFeatureFlag(input = {}) {
    const feature = safeString(input.feature || input.name);
    const diagnostics = buildDiagnostics(input);
    if (!POLICY_AWARE_FEATURES.includes(feature)) return decision(false, 'unknown_feature', feature, diagnostics);
    if (feature === 'coreLocalPractice') return decision(true, 'core_practice_available', feature, diagnostics);
    if (isPolicyStale(input.institutionPolicy || input.schoolPolicy, input.now)) {
      return decision(false, 'stale_policy_record', feature, diagnostics);
    }
    const flags = normalizeFeatureFlags(input.flags || input.featureFlags || input);
    const flagName = featureFlagName(feature);
    if (!flagName || flags[flagName] !== true) return decision(false, 'feature_flag_disabled', feature, diagnostics);
    if (feature === 'nativeContentBundle') {
      return evaluateNativeContentBundle(input, feature, diagnostics);
    }
    const policyDecision = institutionalPolicy.resolveInstitutionalPolicy({
      actor: input.actor,
      learnerId: input.learnerId,
      classId: input.classId,
      featureIntent: featureIntent(feature),
      institutionPolicy: input.institutionPolicy || input.schoolPolicy,
      schoolPolicy: input.schoolPolicy,
      guardianConsent: input.guardianConsent,
      learnerPrivacyPreferences: input.learnerPrivacyPreferences || input.privacyPreferences,
      featureFlags: institutionalFeatureFlags(flags),
      supportImpersonation: input.supportImpersonation,
      deletionOrRetentionRestriction: input.deletionOrRetentionRestriction,
      retentionRestricted: input.retentionRestricted,
      deletionPending: input.deletionPending
    });
    return decision(policyDecision.allowed === true, policyDecision.reason, feature, diagnostics);
  }

  function getFeatureFlagConfigHash(input) {
    const stable = stableStringify(normalizeFeatureFlags(input));
    if (crypto) return `sha256:${crypto.createHash('sha256').update(stable).digest('hex')}`;
    let hash = 0;
    for (let index = 0; index < stable.length; index += 1) hash = ((hash << 5) - hash + stable.charCodeAt(index)) | 0;
    return `sha256:${Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64)}`;
  }

  function evaluateNativeContentBundle(input, feature, diagnostics) {
    if (privacy.isParentPreview(input.actor || input)) return decision(false, 'parent_preview_read_only', feature, diagnostics);
    if (isDisabledByInstitution('nativeContentBundle', input.institutionPolicy || input.schoolPolicy)) {
      return decision(false, 'institution_policy_denied', feature, diagnostics);
    }
    const consent = input.guardianConsent && typeof input.guardianConsent === 'object' ? input.guardianConsent : {};
    const school = Object.assign({}, objectOrEmpty(input.institutionPolicy), objectOrEmpty(input.schoolPolicy));
    if (consent.nativeContentBundle !== true && school.nativeContentBundle !== true) {
      return decision(false, 'explicit_consent_required', feature, diagnostics);
    }
    return decision(true, 'eligible', feature, diagnostics);
  }

  function featureIntent(feature) {
    if (feature === 'telemetry') return institutionalPolicy.FeatureIntents.TELEMETRY;
    if (feature === 'experiments') return institutionalPolicy.FeatureIntents.EXPERIMENTS;
    if (feature === 'aiAssistedAuthoring') return institutionalPolicy.FeatureIntents.AI_ASSISTED_AUTHORING;
    if (feature === 'accountSync') return institutionalPolicy.FeatureIntents.ACCOUNT_SYNC;
    if (feature === 'optionalPersonalization') return institutionalPolicy.FeatureIntents.OPTIONAL_PERSONALIZATION;
    if (feature === 'notificationDelivery') return institutionalPolicy.FeatureIntents.NOTIFICATION_DELIVERY;
    if (feature === 'futureBillingDisplay' || feature === 'futureBillingCheckout') return institutionalPolicy.FeatureIntents.FUTURE_BILLING;
    return '';
  }

  function featureFlagName(feature) {
    return {
      telemetry: 'telemetryEnabled',
      experiments: 'experimentsEnabled',
      aiAssistedAuthoring: 'aiAssistedAuthoringEnabled',
      accountSync: 'syncEnabled',
      optionalPersonalization: 'optionalPersonalizationEnabled',
      notificationDelivery: 'notificationDeliveryEnabled',
      nativeContentBundle: 'nativeContentBundleEnabled',
      futureBillingDisplay: 'futureBillingDisplayEnabled',
      futureBillingCheckout: 'futureBillingCheckoutEnabled'
    }[feature] || '';
  }

  function institutionalFeatureFlags(flags) {
    return {
      telemetry: flags.telemetryEnabled,
      experiments: flags.experimentsEnabled,
      aiAssistedAuthoring: flags.aiAssistedAuthoringEnabled,
      accountSync: flags.syncEnabled,
      optionalPersonalization: flags.optionalPersonalizationEnabled,
      notificationDelivery: flags.notificationDeliveryEnabled,
      futureBilling: flags.futureBillingDisplayEnabled || flags.futureBillingCheckoutEnabled
    };
  }

  function isDisabledByInstitution(feature, policy) {
    const input = objectOrEmpty(policy);
    if (Array.isArray(input.disabledFeatures) && input.disabledFeatures.includes(feature)) return true;
    return input[feature] === false;
  }

  function isPolicyStale(policy, nowValue) {
    const input = objectOrEmpty(policy);
    if (!input.expiresAt) return false;
    const expiresAt = Date.parse(input.expiresAt);
    const now = Date.parse(nowValue || new Date().toISOString());
    return Number.isFinite(expiresAt) && Number.isFinite(now) && expiresAt < now;
  }

  function buildDiagnostics(input) {
    return {
      route: stripQuery(input.route || input.routeContext && input.routeContext.route || ''),
      environment: safeString(input.environment || 'local'),
      policyVersion: safeString((input.institutionPolicy || input.schoolPolicy || {}).policyVersion)
    };
  }

  function decision(enabled, reason, feature, diagnostics) {
    return { enabled, reason, feature, diagnostics };
  }

  function stripQuery(value) {
    const route = safeString(value);
    return route.split('?')[0].split('#')[0];
  }

  function objectOrEmpty(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function normalizeDomainList(values) {
    return normalizeStringList(values).filter(domain => ALLOWED_DOMAINS.includes(domain));
  }

  function normalizeStringList(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))).sort();
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    ALLOWED_DOMAINS,
    DEFAULT_FEATURE_FLAGS,
    POLICY_AWARE_FEATURES,
    evaluatePolicyAwareFeatureFlag,
    getFeatureFlagConfigHash,
    isFeatureEnabled,
    normalizeFeatureFlags,
    stableStringify,
    validateFeatureFlags
  };
});
