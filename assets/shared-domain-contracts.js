(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSharedDomainContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const selectionCore = root.GrammarQuestSelectionCore ||
    (typeof require === 'function' ? require('./quiz-selection-core') : null);
  const learnerState = root.GrammarQuestLearnerStateRepository ||
    (typeof require === 'function' ? require('./learner-state-repository') : null);
  const assignmentDomain = root.GrammarQuestAssignmentDomain ||
    (typeof require === 'function' ? require('./assignment-domain') : null);
  const adaptiveReview = root.GrammarQuestAdaptiveReviewDomain ||
    (typeof require === 'function' ? require('./adaptive-review-domain') : null);
  const spacedRepetition = root.GrammarQuestSpacedRepetitionDomain ||
    (typeof require === 'function' ? require('./spaced-repetition-domain') : null);
  const goalsDomain = root.GrammarQuestLearnerGoalsDomain ||
    (typeof require === 'function' ? require('./learner-goals-domain') : null);
  const masteryProjection = root.GrammarQuestMasteryProjectionDomain ||
    (typeof require === 'function' ? require('./mastery-projection-domain') : null);
  const recommendations = root.GrammarQuestWeakSkillRecommendationDomain ||
    (typeof require === 'function' ? require('./weak-skill-recommendation-domain') : null);
  const privacyPreferences = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);
  const billingEntitlementProjection = root.GrammarQuestBillingEntitlementProjection ||
    (typeof require === 'function' ? require('./billing-entitlement-projection') : null);
  const appTelemetry = root.GrammarQuestAppTelemetryDomain ||
    (typeof require === 'function' ? require('./app-telemetry-domain') : null);
  const selectionTelemetryDomain = root.GrammarQuestSelectionTelemetryDomain ||
    (typeof require === 'function' ? require('./selection-telemetry-domain') : null);

  const SHARED_DOMAIN_CONTRACT_VERSION = 1;
  const PROVIDER_SDK_PREFIXES = [
    '@aws-sdk/',
    '@firebase/',
    '@google-cloud/',
    '@stripe/',
    '@supabase/',
    'aws-sdk',
    'firebase',
    'firebase/',
    'stripe',
    'supabase'
  ];
  const BROWSER_API_PATTERN = /\b(?:window\.|document\b|localStorage\b|sessionStorage\b|indexedDB\b|DOMParser\b|CustomEvent\b|EventTarget\b|addEventListener\b|removeEventListener\b|navigator\.)/;
  const SERVICE_WORKER_PATTERN = /\bserviceWorker\b|service-worker|ServiceWorker/i;
  const UNSAFE_PAYLOAD_KEYS = new Set([
    'answer',
    'answers',
    'choices',
    'email',
    'explanation',
    'explanations',
    'learnerAnswer',
    'paymentToken',
    'providerPayload',
    'question',
    'questionSnapshots',
    'rawProviderRecord',
    'stack',
    'studentName',
    'subscriptionId',
    'token'
  ]);

  function getSharedDomainContractInventory() {
    return {
      schemaVersion: SHARED_DOMAIN_CONTRACT_VERSION,
      purpose: 'portable_domain_kernel_contracts',
      contracts: [
        contract('quiz_selection', 'assets/quiz-selection-core.js', ['selection.request', 'selection.response'], ['assets/quiz-engine.js', 'server/question-selection-runtime.js']),
        contract('active_quiz_ref', 'assets/learner-state-sync-domain.js', ['activeQuiz'], ['assets/learner-state-repository.js', 'assets/quiz-engine.js', 'assets/progress-store.js']),
        contract('saved_session', 'assets/learner-state-sync-domain.js', ['savedSession'], ['assets/learner-state-repository.js', 'assets/quiz-engine.js', 'assets/progress-store.js']),
        contract('progress_normalization', 'assets/learner-state-sync-domain.js', ['progress'], ['assets/learner-state-repository.js', 'assets/progress-store.js', 'assets/progress-transfer-ui.js']),
        contract('assignment', 'assets/assignment-domain.js', ['assignment'], ['assets/assignments-page.js', 'assets/assignment-repository.js']),
        contract('adaptive_review', 'assets/adaptive-review-domain.js', ['reviewQueue'], ['assets/adaptive-review-entry.js', 'assets/quiz-engine.js']),
        contract('spaced_repetition', 'assets/spaced-repetition-domain.js', ['spacedRepetition'], ['assets/quiz-engine.js', 'assets/progress-store.js']),
        contract('learner_goal', 'assets/learner-goals-domain.js', ['goals', 'goalProgress'], ['assets/reports-dashboard.js', 'assets/quiz-engine.js']),
        contract('mastery_projection', 'assets/mastery-projection-domain.js', ['mastery'], ['assets/reports-dashboard.js', 'assets/learning-dashboard-domain.js']),
        contract('weak_skill_recommendation', 'assets/weak-skill-recommendation-domain.js', ['recommendations'], ['assets/reports-dashboard.js', 'assets/recommendation-route-resolver.js']),
        contract('privacy_preferences', 'assets/privacy-preferences-domain.js', ['privacyPreferences'], ['assets/settings-page.js', 'assets/app-telemetry.js']),
        contract('entitlement_projection', 'assets/billing-entitlement-projection.js', ['entitlementProjection'], ['assets/feature-flag-domain.js', 'server/backend-policy-rules.js']),
        contract('app_telemetry', 'assets/app-telemetry-domain.js', ['appTelemetry'], ['assets/app-telemetry.js']),
        contract('selection_telemetry', 'assets/selection-telemetry-domain.js', ['selectionTelemetry'], ['assets/question-selection-telemetry.js', 'assets/quiz-engine.js', 'scripts/telemetry/summarize-selection-events.js'])
      ]
    };
  }

  function contract(domain, kernelPath, fixtures, browserAdapters) {
    return {
      domain,
      kernelPath,
      portable: true,
      fixtures,
      browserAdapters,
      forbiddenAssumptions: [
        'window_runtime_state',
        'document_or_dom_events',
        'localStorage_or_indexedDB',
        'service_worker_lifecycle',
        'provider_sdk_payloads'
      ]
    };
  }

  function validateSharedDomainContractInventory(inventory) {
    const errors = [];
    const input = inventory && typeof inventory === 'object' ? inventory : {};
    if (input.schemaVersion !== SHARED_DOMAIN_CONTRACT_VERSION) errors.push('shared_domain_contract_schema_version_required');
    if (!Array.isArray(input.contracts) || !input.contracts.length) errors.push('shared_domain_contracts_required');
    const seen = new Set();
    (Array.isArray(input.contracts) ? input.contracts : []).forEach((item, index) => {
      const prefix = `shared_domain_contract_${index}`;
      if (!safeString(item && item.domain)) errors.push(`${prefix}_domain_required`);
      if (seen.has(item.domain)) errors.push(`${prefix}_domain_duplicate`);
      seen.add(item && item.domain);
      if (!safeString(item && item.kernelPath)) errors.push(`${prefix}_kernel_path_required`);
      if (item && item.portable !== true) errors.push(`${prefix}_must_be_portable`);
      if (!Array.isArray(item && item.fixtures) || !item.fixtures.length) errors.push(`${prefix}_fixtures_required`);
      if (!Array.isArray(item && item.browserAdapters) || !item.browserAdapters.length) errors.push(`${prefix}_browser_adapters_required`);
      if (item && Array.isArray(item.browserAdapters) && item.browserAdapters.includes(item.kernelPath)) {
        errors.push(`${prefix}_kernel_must_not_be_adapter`);
      }
    });
    return errors;
  }

  function buildSharedDomainFixtures(options = {}) {
    const now = safeIso(options.now) || '2030-04-29T12:00:00.000Z';
    const questionRef = {
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: 'sha256:grammar-sentence-types-q0001',
      sequence: 1
    };
    const question = {
      id: questionRef.id,
      version: questionRef.version,
      contentHash: questionRef.contentHash,
      metadata: {
        sourceSet: questionRef.sourceSet,
        sequence: questionRef.sequence,
        skillIds: ['grammar.sentence_types'],
        gradeLevels: [4],
        difficultyByGrade: { 4: 'medium' }
      }
    };
    const selectionRequest = selectionCore.normalizeSelectionRequest({
      mode: 'subtopic',
      domain: 'grammar',
      setIds: [questionRef.sourceSet],
      grade: '4',
      difficulty: 'medium',
      count: 1
    }, { maxCount: 10 });
    const selectionResponse = {
      schemaVersion: 1,
      requestHash: 'sha256:shared-domain-request',
      responseDigest: 'sha256:shared-domain-response',
      expiresAt: addMinutes(now, 5),
      questionRefs: selectionCore.buildQuestionRefs([question], { id: questionRef.sourceSet })
    };
    const assignment = assignmentDomain.normalizeAssignment({
      id: 'assignment-shared-domain-1',
      title: 'Sentence type practice',
      assignedTo: { learnerIds: ['learner-portable'] },
      scope: { setIds: [questionRef.sourceSet], skillIds: ['grammar.sentence_types'] },
      quizOptions: { count: 1, grade: '4', difficulty: 'medium' },
      createdAt: now
    });
    const savedSession = {
      id: 'session-shared-domain-1',
      completedAt: now,
      attempts: [{
        questionId: questionRef.id,
        questionHash: questionRef.contentHash,
        sourceSet: questionRef.sourceSet,
        version: questionRef.version,
        skillIds: ['grammar.sentence_types'],
        correct: false,
        difficulty: 'medium',
        gradeLevel: 4,
        attemptedAt: now
      }, {
        questionId: 'grammar-sentence-types-q0002',
        questionHash: 'sha256:grammar-sentence-types-q0002',
        sourceSet: questionRef.sourceSet,
        version: questionRef.version,
        skillIds: ['grammar.sentence_types'],
        correct: false,
        difficulty: 'medium',
        gradeLevel: 4,
        attemptedAt: now
      }, {
        questionId: 'grammar-sentence-types-q0003',
        questionHash: 'sha256:grammar-sentence-types-q0003',
        sourceSet: questionRef.sourceSet,
        version: questionRef.version,
        skillIds: ['grammar.sentence_types'],
        correct: true,
        difficulty: 'medium',
        gradeLevel: 4,
        attemptedAt: now
      }]
    };
    const reviewQueue = adaptiveReview.buildReviewQueue({
      now,
      maxItems: 1,
      sessions: [savedSession],
      manifest: { sets: [{ id: questionRef.sourceSet, questions: [question] }] }
    });
    const spacedSchedules = spacedRepetition.applyReviewOutcomes([], [{
      questionRef,
      skillIds: ['grammar.sentence_types'],
      correct: false
    }], { now });
    const goals = goalsDomain.normalizeLearnerGoals({ updatedAt: now, updatedBy: 'learner-portable' });
    const goalProgress = goalsDomain.buildLearnerGoalProgress({
      now,
      goals,
      sessions: [savedSession],
      assignments: [assignment],
      reviewQueue,
      reviewSchedules: spacedSchedules
    });
    const mastery = {
      generatedAt: now,
      skills: Object.fromEntries(masteryProjection.projectMasteryBySkill({
        now,
        sessions: [savedSession],
        reviewSchedules: spacedSchedules,
        assignments: [assignment]
      }).map(item => [item.skillId, {
        attempts: item.attempts,
        band: ['insufficient_evidence', 'needs_practice'].includes(item.masteryBand) ? 'developing' : item.masteryBand,
        recentAccuracy: item.recentAccuracy,
        weightedAccuracy: item.weightedAccuracy
      }]))
    };
    const recommendationResult = recommendations.generateWeakSkillRecommendations({
      now,
      recentSessions: [savedSession],
      reviewSchedule: spacedSchedules,
      taxonomy: { skills: { 'grammar.sentence_types': { label: 'Sentence types', standards: ['L.4.1'] } } },
      manifest: { sets: [{ id: questionRef.sourceSet, questions: [question] }] }
    });
    const privacy = privacyPreferences.normalizePrivacyPreferences();
    const appEvent = appTelemetry.normalizeAppTelemetryEvent({
      type: 'page_performance_summary',
      route: '/practice.html?learner=hidden',
      category: 'load',
      severity: 'info',
      timing: { loadMs: 42 },
      occurredAt: now
    }, { now: () => new Date(now) });
    const selectionEvent = selectionTelemetryDomain.normalizeSelectionTelemetryEvent('grammarquest:question-selection-completed', {
      domain: 'grammar',
      source: 'shared-domain-contract',
      requestHash: selectionResponse.requestHash,
      responseDigest: selectionResponse.responseDigest
    }, { now: () => new Date(now) });
    const progress = learnerState.normalizeLearnerState({
      activeQuiz: {
        id: 'active-shared-domain-quiz',
        startedAt: now,
        mode: 'subtopic',
        request: selectionRequest,
        questionRefs: selectionResponse.questionRefs
      },
      reports: { sessions: [savedSession] },
      assignments: [assignment],
      reviewQueue,
      reviewSchedules: spacedSchedules,
      learnerGoals: goals,
      privacyPreferences: privacy,
      lastUpdatedAt: now
    });

    return {
      selection: { request: selectionRequest, response: selectionResponse },
      activeQuiz: progress.activeQuiz,
      savedSession,
      progress,
      assignment,
      reviewQueue,
      spacedRepetition: spacedSchedules,
      goals,
      goalProgress,
      mastery,
      recommendations: recommendationResult,
      privacyPreferences: privacy,
      entitlementProjection: normalizeEntitlementProjection({
        billingAccountId: 'billing-account-shared-domain',
        accessState: 'free',
        accessLevel: 'free',
        featureEntitlements: ['core_practice', 'local_progress'],
        source: 'static_default',
        evaluatedAt: now,
        currentPeriodEnd: '',
        billingOwnerRef: ''
      }),
      appTelemetry: appEvent,
      selectionTelemetry: selectionEvent
    };
  }

  function validateSharedDomainFixtures(fixtures) {
    const errors = [];
    const input = fixtures && typeof fixtures === 'object' ? fixtures : {};
    if (hasUnsafePayload(input)) errors.push('shared_domain_fixtures_must_not_include_unsafe_payloads');
    if (!input.selection || !input.selection.request || !input.selection.response) errors.push('selection_fixture_required');
    if (!input.activeQuiz || !Array.isArray(input.activeQuiz.questionRefs)) errors.push('active_quiz_ref_fixture_required');
    if (!input.savedSession || !Array.isArray(input.savedSession.attempts)) errors.push('saved_session_fixture_required');
    if (!input.progress || input.progress.schemaVersion !== 2) errors.push('progress_fixture_schema_version_required');
    if (!input.assignment || !input.assignment.scope) errors.push('assignment_fixture_required');
    if (!input.reviewQueue || !Array.isArray(input.reviewQueue.items)) errors.push('review_queue_fixture_required');
    if (!Array.isArray(input.spacedRepetition)) errors.push('spaced_repetition_fixture_required');
    if (!input.goals || input.goals.schemaVersion !== 1) errors.push('goals_fixture_required');
    if (!input.mastery || !input.mastery.skills) errors.push('mastery_fixture_required');
    if (!input.recommendations || !Array.isArray(input.recommendations.recommendations)) errors.push('recommendations_fixture_required');
    if (!input.privacyPreferences || input.privacyPreferences.telemetryEnabled !== false) errors.push('privacy_preferences_fixture_required');
    validateEntitlementProjectionContract(input.entitlementProjection).forEach(error => errors.push(error));
    if (!input.appTelemetry || input.appTelemetry.route !== '/practice.html') errors.push('app_telemetry_fixture_required');
    if (!input.selectionTelemetry || !safeString(input.selectionTelemetry.eventName)) errors.push('selection_telemetry_fixture_required');
    return Array.from(new Set(errors));
  }

  function normalizeEntitlementProjection(value) {
    return billingEntitlementProjection.deriveBillingEntitlementProjection({
      billingAccountId: safeString(value && value.billingAccountId) || 'billing-account-shared-domain',
      ledgerEvents: [],
      now: safeIso(value && value.evaluatedAt) || '2030-04-29T12:00:00.000Z'
    });
  }

  function validateEntitlementProjectionContract(value) {
    const validation = billingEntitlementProjection.validateBillingEntitlementProjection(value);
    const errors = validation.errors.map(error => `entitlement_projection_${error.replace(/\s+/g, '_')}`);
    if (hasProviderPayload(value)) errors.push('entitlement_projection_must_not_include_provider_payload');
    return Array.from(new Set(errors));
  }

  function auditPortableDomainSources(sources) {
    const entries = sources && typeof sources === 'object' ? Object.entries(sources) : [];
    return entries.flatMap(([file, source]) => auditPortableDomainSource(file, source));
  }

  function auditPortableDomainSource(file, source) {
    const text = stripPortableUmdExport(String(source || ''));
    const violations = [];
    if (BROWSER_API_PATTERN.test(text)) {
      violations.push(violation('browser_api_in_portable_domain', file, 'Portable domain kernels must not use browser globals, DOM events, localStorage, sessionStorage, or IndexedDB.'));
    }
    if (SERVICE_WORKER_PATTERN.test(text)) {
      violations.push(violation('service_worker_in_portable_domain', file, 'Portable domain kernels must not assume a service-worker lifecycle.'));
    }
    for (const match of text.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      if (isProviderSdk(match[1])) {
        violations.push(violation('provider_sdk_in_portable_domain', file, 'Provider SDKs must stay behind adapters outside portable domain kernels.'));
      }
    }
    return violations;
  }

  function stripPortableUmdExport(source) {
    return source
      .replace(/\}\)\(typeof window !== 'undefined' \? window : globalThis,\s*function[^{]*\{/g, 'function __portableFactory() {')
      .replace(/root\.GrammarQuest[A-Za-z0-9_]+\s*=\s*api;?/g, '')
      .replace(/root\.GrammarQuest[A-Za-z0-9_]+/g, '__portableDependency');
  }

  function hasUnsafePayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (UNSAFE_PAYLOAD_KEYS.has(key)) return unsafeValueHasContent(value[key]);
      const child = value[key];
      return child && typeof child === 'object' && hasUnsafePayload(child);
    });
  }

  function unsafeValueHasContent(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return safeString(value) !== '';
  }

  function hasProviderPayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (/providerPayload|rawProvider|subscriptionId|paymentToken|customerId|token|secret/i.test(key)) return true;
      const child = value[key];
      return child && typeof child === 'object' && hasProviderPayload(child);
    });
  }

  function isProviderSdk(specifier) {
    return PROVIDER_SDK_PREFIXES.some(prefix => String(specifier || '').startsWith(prefix));
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function addMinutes(iso, minutes) {
    const date = new Date(iso);
    date.setTime(date.getTime() + Math.max(1, Number(minutes) || 1) * 60 * 1000);
    return date.toISOString();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function violation(code, file, message) {
    return { code, file, message };
  }

  return {
    SHARED_DOMAIN_CONTRACT_VERSION,
    auditPortableDomainSource,
    auditPortableDomainSources,
    buildSharedDomainFixtures,
    getSharedDomainContractInventory,
    normalizeEntitlementProjection,
    validateEntitlementProjectionContract,
    validateSharedDomainContractInventory,
    validateSharedDomainFixtures
  };
});
