const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const access = require('../assets/access-control');
const {
  BILLING_OWNER_REQUIRED_FIELDS,
  buildProviderSafeBillingOwnerMetadata,
  evaluateBillingOwnerEligibility,
  normalizeBillingOwnerProfile,
  validateBillingOwnerProfile
} = require('../assets/billing-owner-profile-domain');

const repoRoot = path.resolve(__dirname, '..');

test('billing owner profile is separate from learner and provider customer records', () => {
  assert.deepEqual(BILLING_OWNER_REQUIRED_FIELDS, [
    'actorId',
    'role',
    'verifiedEmail',
    'recoveryStatus',
    'countryRegion',
    'currency',
    'notificationPreferences',
    'supportVerification',
    'displayName'
  ]);

  const profile = normalizeBillingOwnerProfile({
    actorId: 'guardian-1',
    role: 'parent_guardian',
    verifiedEmail: true,
    recoveryStatus: 'verified',
    countryRegion: 'US',
    currencyPreference: 'USD',
    notificationPreferences: { transactionalBilling: true, marketing: false },
    supportVerification: { status: 'verified', method: 'support_pin' },
    displayName: 'K. Parent',
    linkedLearnerIds: ['learner-1'],
    activeStudent: { id: 'learner-1', name: 'Maya' },
    providerCustomerId: 'cus_123'
  });

  assert.equal(profile.actorId, 'guardian-1');
  assert.equal(profile.role, access.Roles.PARENT_GUARDIAN);
  assert.equal(profile.currency, 'USD');
  assert.equal(profile.providerCustomerId, '');
  assert.deepEqual(profile.linkedLearnerIds, []);
  assert.equal(profile.activeStudent, null);
});

test('verified parent guardian with recovery, region, currency, and notices is eligible', () => {
  const result = evaluateBillingOwnerEligibility({
    actorId: 'guardian-1',
    signedIn: true,
    role: access.Roles.PARENT_GUARDIAN,
    verifiedEmail: true,
    recoveryStatus: 'verified',
    countryRegion: 'US',
    currencyPreference: 'USD',
    notificationPreferences: {
      transactionalBilling: true,
      renewalReminder: true,
      failedPayment: true,
      marketing: false
    },
    supportVerification: { status: 'verified', method: 'support_pin' },
    displayName: 'K. Parent'
  });

  assert.equal(result.eligible, true);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.profile.notificationPreferences, {
    transactionalBilling: true,
    renewalReminder: true,
    failedPayment: true,
    marketing: false
  });
});

test('parent preview and learner identity cannot satisfy billing owner requirements', () => {
  const result = evaluateBillingOwnerEligibility({
    actorId: 'preview-parent',
    signedIn: false,
    parentPreview: true,
    role: 'parent_preview',
    verifiedEmail: true,
    recoveryStatus: 'verified',
    countryRegion: 'US',
    currencyPreference: 'USD',
    notificationPreferences: { transactionalBilling: true },
    supportVerification: { status: 'verified' },
    displayName: 'Preview Parent',
    learnerId: 'learner-1',
    studentName: 'Maya'
  });

  assert.equal(result.eligible, false);
  assert.ok(result.blockers.includes('authenticated_parent_guardian_required'));
  assert.ok(result.blockers.includes('parent_preview_cannot_manage_billing'));
  assert.ok(result.blockers.includes('learner_identity_must_not_be_billing_owner'));
});

test('validation blocks unverified contact missing recovery and unsafe notification preferences', () => {
  const result = validateBillingOwnerProfile({
    actorId: 'guardian-2',
    signedIn: true,
    role: access.Roles.PARENT_GUARDIAN,
    verifiedEmail: false,
    recoveryStatus: 'missing',
    countryRegion: '',
    currencyPreference: '',
    currencyPolicy: 'region_default',
    notificationPreferences: { transactionalBilling: false, marketing: true },
    supportVerification: { status: 'unverified' },
    displayName: ''
  });

  assert.ok(result.errors.includes('verified_email_required'));
  assert.ok(result.errors.includes('recovery_path_required'));
  assert.ok(result.errors.includes('country_region_required'));
  assert.ok(result.errors.includes('currency_required_or_detectable'));
  assert.ok(result.errors.includes('transactional_billing_notices_required'));
  assert.ok(result.errors.includes('support_verification_required'));
  assert.ok(result.errors.includes('privacy_safe_display_name_required'));
});

test('provider-safe metadata excludes learner ids student names contact addresses and provider ids', () => {
  const metadata = buildProviderSafeBillingOwnerMetadata({
    actorId: 'guardian-1',
    role: access.Roles.PARENT_GUARDIAN,
    verifiedEmail: true,
    email: 'grownup@example.test',
    recoveryStatus: 'verified',
    countryRegion: 'US',
    currencyPreference: 'USD',
    displayName: 'K. Parent',
    learnerId: 'learner-1',
    studentName: 'Maya',
    providerCustomerId: 'cus_123'
  });

  assert.deepEqual(metadata, {
    billingOwnerRef: 'billing-owner:guardian-1',
    role: 'parent_guardian',
    countryRegion: 'US',
    currency: 'USD'
  });
});

test('billing owner docs describe support, privacy, native, and guardian boundaries', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-owner-profile.md'), 'utf8');
  const roles = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'roles-and-permissions.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'billing owner profile',
    'verified email',
    'recovery path',
    'country/region',
    'currency',
    'notification preferences',
    'support verification',
    'parent preview',
    'learner identity',
    'provider customer',
    'iPhone',
    'iPadOS'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(roles, /billing owner/i);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-owner-profile-domain\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
