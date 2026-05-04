const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_TRANSACTIONAL_COMMUNICATION_CONTRACT,
  REQUIRED_TRANSACTIONAL_MESSAGE_TYPES,
  evaluateTransactionalDelivery,
  validateTransactionalCommunicationContract,
  validateTransactionalMessage
} = require('../assets/transactional-communication-contract');

const repoRoot = path.resolve(__dirname, '..');

test('transactional communication contract defines every required billing and account message', () => {
  assert.deepEqual(REQUIRED_TRANSACTIONAL_MESSAGE_TYPES, [
    'checkout_started',
    'payment_pending',
    'receipt',
    'upcoming_renewal',
    'failed_renewal',
    'payment_method_update',
    'cancellation',
    'cancellation_effective_date',
    'one_time_access_expiration',
    'refund',
    'dispute',
    'terms_change',
    'account_recovery',
    'support_handoff'
  ]);

  const result = validateTransactionalCommunicationContract(DEFAULT_TRANSACTIONAL_COMMUNICATION_CONTRACT);

  assert.deepEqual(result.errors, []);
  assert.equal(result.contract.providerNeutral, true);
  assert.equal(result.contract.messages.length, REQUIRED_TRANSACTIONAL_MESSAGE_TYPES.length);
});

test('message validation requires trigger audience localization delivery policy and audit metadata', () => {
  const result = validateTransactionalMessage({
    type: 'receipt',
    trigger: '',
    audience: '',
    requiredFields: [],
    forbiddenFields: [],
    deliveryChannels: [],
    policyRequirement: '',
    localizationKey: 'Receipt Copy!',
    retentionClass: '',
    audit: {}
  });

  assert.ok(result.errors.includes('receipt trigger is required'));
  assert.ok(result.errors.includes('receipt audience is required'));
  assert.ok(result.errors.includes('receipt requiredFields are required'));
  assert.ok(result.errors.includes('receipt forbiddenFields must include sensitive defaults'));
  assert.ok(result.errors.includes('receipt deliveryChannels are required'));
  assert.ok(result.errors.includes('receipt policyRequirement is required'));
  assert.ok(result.errors.includes('receipt localizationKey must be localization-ready'));
  assert.ok(result.errors.includes('receipt retentionClass is required'));
  assert.ok(result.errors.includes('receipt audit metadata is required'));
});

test('message payload validation rejects sensitive learner provider and credential fields', () => {
  const result = validateTransactionalMessage({
    type: 'receipt',
    trigger: 'invoice_paid',
    audience: 'billing_owner',
    requiredFields: ['billingOwnerRef', 'planId', 'amountDisplay'],
    forbiddenFields: ['learnerId', 'studentName', 'email', 'providerCustomerId', 'paymentCredential', 'rawProviderPayload'],
    deliveryChannels: ['email', 'in_app'],
    policyRequirement: 'required_transactional_notice',
    localizationKey: 'billing.receipt.ready',
    retentionClass: 'billing_transactional',
    audit: { eventType: 'transactional_message_queued', actorRef: 'system', redaction: 'required' },
    samplePayload: {
      billingOwnerRef: 'billing-owner:guardian-1',
      planId: 'premium_annual',
      amountDisplay: 'Pending approval',
      learnerId: 'learner-1',
      providerCustomerId: 'cus_123',
      paymentCredential: 'card number'
    }
  });

  assert.ok(result.errors.includes('receipt samplePayload includes forbidden field learnerId'));
  assert.ok(result.errors.includes('receipt samplePayload includes forbidden field providerCustomerId'));
  assert.ok(result.errors.includes('receipt samplePayload includes forbidden field paymentCredential'));
});

test('required transactional notices are separate from marketing consent', () => {
  assert.deepEqual(evaluateTransactionalDelivery({
    messageType: 'receipt',
    channel: 'email',
    marketingConsent: false,
    transactionalRequired: true,
    notificationPreferences: { transactionalBilling: true, marketing: false }
  }), {
    allowed: true,
    reason: 'required_transactional_notice',
    channel: 'email'
  });

  assert.deepEqual(evaluateTransactionalDelivery({
    messageType: 'billing_discount_offer',
    channel: 'email',
    marketingConsent: false,
    transactionalRequired: false,
    notificationPreferences: { transactionalBilling: true, marketing: false }
  }), {
    allowed: false,
    reason: 'marketing_consent_required',
    channel: 'email'
  });
});

test('transactional communication docs and compliance wiring are provider agnostic', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'transactional-communications.md'), 'utf8');
  const compliance = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'checkout started',
    'payment pending',
    'receipt',
    'upcoming renewal',
    'failed renewal',
    'payment method update',
    'cancellation',
    'one-time access expiration',
    'refund',
    'dispute',
    'terms change',
    'account recovery',
    'support handoff',
    'marketing consent',
    'provider adapter',
    'localization key'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(compliance, /transactional-communications\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/transactional-communication-contract\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
