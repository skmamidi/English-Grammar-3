const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeLearnerState } = require('../assets/learner-state-repository');
const assignment = require('../assets/assignment-domain');
const telemetry = require('../assets/app-telemetry-domain');
const selectionTelemetry = require('../assets/question-selection-telemetry');
const contracts = require('../assets/domain-type-contracts');

test('typed domain contracts document learner state and question ref shapes', () => {
  const state = normalizeLearnerState({
    reviewQueue: {
      queueId: 'queue-1',
      items: [{
        questionRef: {
          id: 'grammar-sentence-types-q0001',
          sourceSet: 'grammar-sentence-types',
          version: 1,
          contentHash: 'sha256:abc',
          sequence: 1
        }
      }]
    }
  });

  assert.deepEqual(contracts.validateLearnerStateContract(state), []);
  assert.deepEqual(contracts.validateQuestionRefContract(state.reviewQueue.items[0].questionRef), []);
  assert.deepEqual(contracts.validateQuestionRefContract({
    sourceSet: 'grammar-sentence-types',
    version: 1
  }), ['question_ref_id_required', 'question_ref_content_hash_required']);
  assert.deepEqual(contracts.validateQuestionRefContract({
    id: 'grammar-sentence-types-q0001',
    sourceSet: 'grammar-sentence-types',
    contentHash: 'sha256:abc'
  }), ['question_ref_version_required']);
  assert.ok(contracts.validateLearnerStateContract({
    schemaVersion: 2,
    reports: { sessions: [{ id: 'session-1', attempts: [{ question: 'raw prompt' }] }] },
    privacyPreferences: { telemetryEnabled: false }
  }).includes('learner_state_must_not_include_question_payload'));
});

test('typed domain contracts document sessions reports reviews assignments and telemetry events', () => {
  const normalizedAssignment = assignment.normalizeAssignment({
    id: 'assignment-1',
    title: 'Sentence tune-up',
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { setIds: ['grammar-sentence-types'] },
    quizOptions: { count: 1 }
  });
  const appEvent = telemetry.normalizeAppTelemetryEvent({
    type: 'page_performance_summary',
    route: '/settings.html',
    category: 'load',
    timing: { loadMs: 42 }
  }, { now: () => new Date('2030-04-29T12:00:00.000Z') });
  const selectionEvent = selectionTelemetry.normalizeSelectionTelemetry('grammarquest:question-selection-completed', {
    domain: 'grammar',
    source: 'api'
  }, { now: () => new Date('2030-04-29T12:00:00.000Z') });

  assert.deepEqual(contracts.validateAssignmentContract(normalizedAssignment), []);
  assert.deepEqual(contracts.validateSavedSessionContract({
    id: 'session-1',
    completedAt: '2030-04-29T12:00:00.000Z',
    attempts: [{ questionId: 'grammar-sentence-types-q0001', questionHash: 'sha256:abc' }]
  }), []);
  assert.deepEqual(contracts.validateQuestionReportContract({
    id: 'report-1',
    questionId: 'grammar-sentence-types-q0001',
    status: 'open'
  }), []);
  assert.deepEqual(contracts.validateReviewItemContract({
    questionRef: {
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: 'sha256:abc'
    },
    status: 'queued'
  }), []);
  assert.deepEqual(contracts.validateAppTelemetryEventContract(appEvent), []);
  assert.deepEqual(contracts.validateSelectionTelemetryEventContract(selectionEvent), []);
  assert.ok(contracts.validateAppTelemetryEventContract(Object.assign({}, appEvent, {
    question: 'raw prompt'
  })).includes('app_telemetry_must_not_include_payload'));
});

test('typed domain contracts validate selection responses and release manifests', () => {
  assert.deepEqual(contracts.validateSelectionResponseContract({
    schemaVersion: 1,
    requestHash: 'sha256:request',
    responseDigest: 'sha256:response',
    expiresAt: '2030-04-29T12:05:00.000Z',
    questionRefs: [{
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: 'sha256:abc'
    }]
  }), []);
  assert.ok(contracts.validateSelectionResponseContract({
    schemaVersion: 1,
    questionRefs: [{ id: 'q1', question: 'raw prompt' }]
  }).includes('selection_response_must_not_include_payload'));

  assert.deepEqual(contracts.validateReleaseManifestContract({
    schemaVersion: 1,
    appVersion: '1.0.0',
    releaseId: 'release-2030-04-29',
    generatedAt: '2030-04-29T12:00:00.000Z',
    questionManifest: { sourceHash: 'sha256:manifest' },
    serviceWorker: { cacheName: 'grammar-cache-v1' }
  }), []);
  assert.ok(contracts.validateReleaseManifestContract({
    schemaVersion: 1,
    appVersion: '1.0.0',
    releaseId: 'release-2030-04-29',
    generatedAt: '2030-04-29T12:00:00.000Z',
    privateKey: '-----BEGIN PRIVATE KEY-----'
  }).includes('release_manifest_must_not_include_secret_material'));
});

test('typed domain contracts document future entitlement projections without provider payloads', () => {
  assert.deepEqual(contracts.validateEntitlementProjectionContract({
    schemaVersion: 1,
    accessState: 'free',
    featureEntitlements: ['core_practice', 'local_progress'],
    source: 'static_default',
    evaluatedAt: '2030-04-29T12:00:00.000Z'
  }), []);
  assert.ok(contracts.validateEntitlementProjectionContract({
    schemaVersion: 1,
    accessState: 'premium',
    featureEntitlements: ['core_practice'],
    source: 'provider_redirect',
    providerPayload: { subscriptionId: 'sub_123' }
  }).includes('entitlement_projection_must_not_include_provider_payload'));
});

test('typed domain contracts document provider-neutral billing records', () => {
  assert.deepEqual(contracts.validateBillingDomainRecordContract({
    schemaVersion: 1,
    recordType: 'payment',
    billingAccountId: 'billing-account-1',
    paymentId: 'payment-1',
    amountMinor: 1200,
    currency: 'USD',
    status: 'succeeded',
    sourceLedgerEventId: 'ledger-payment-succeeded'
  }), []);
  assert.ok(contracts.validateBillingDomainRecordContract({
    schemaVersion: 1,
    recordType: 'subscription',
    billingAccountId: 'billing-account-1',
    providerPayload: { providerSubscriptionId: 'provider-subscription-placeholder' }
  }).includes('billing_domain_record_must_not_include_provider_payload'));
  assert.ok(contracts.validateBillingDomainRecordContract({
    schemaVersion: 1,
    recordType: 'billing_account',
    billingAccountId: 'billing-account-1',
    learnerId: 'learner-1'
  }).includes('billing_domain_record_must_not_include_learner_payload'));
});
