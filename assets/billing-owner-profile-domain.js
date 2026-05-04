(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingOwnerProfileDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BILLING_OWNER_REQUIRED_FIELDS = Object.freeze([
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
  const PARENT_GUARDIAN_ROLE = 'parent_guardian';
  const REGION_DEFAULT_CURRENCIES = Object.freeze({
    US: 'USD',
    CA: 'CAD',
    GB: 'GBP',
    AU: 'AUD',
    NZ: 'NZD'
  });

  function normalizeBillingOwnerProfile(raw = {}) {
    const input = raw && typeof raw === 'object' ? raw : {};
    const countryRegion = normalizeRegion(input.countryRegion || input.country || input.region);
    const currency = normalizeCurrency(input.currency || input.currencyPreference || deriveCurrency(countryRegion, input.currencyPolicy));
    return {
      actorId: safeString(input.actorId || input.parentGuardianActorId || input.userId),
      role: safeString(input.role),
      signedIn: input.signedIn === true,
      parentPreview: input.parentPreview === true || safeString(input.sessionMode) === 'parent-preview',
      verifiedEmail: input.verifiedEmail === true || input.emailVerified === true,
      recoveryStatus: safeString(input.recoveryStatus || input.recoveryPathStatus),
      countryRegion,
      currency,
      currencyPolicy: safeString(input.currencyPolicy || (currency ? 'explicit_or_region_default' : '')),
      notificationPreferences: normalizeNotificationPreferences(input.notificationPreferences),
      supportVerification: normalizeSupportVerification(input.supportVerification),
      displayName: normalizeDisplayName(input.displayName || input.name),
      providerCustomerId: '',
      providerMetadata: null,
      linkedLearnerIds: [],
      learnerId: '',
      activeStudent: null,
      studentName: ''
    };
  }

  function evaluateBillingOwnerEligibility(profile) {
    const normalized = normalizeBillingOwnerProfile(profile);
    const result = validateBillingOwnerProfile(profile);
    return {
      eligible: result.errors.length === 0,
      blockers: Object.freeze(result.errors.slice()),
      warnings: Object.freeze(result.warnings.slice()),
      profile: normalized
    };
  }

  function validateBillingOwnerProfile(profile) {
    const input = profile && typeof profile === 'object' ? profile : {};
    const normalized = normalizeBillingOwnerProfile(input);
    const errors = [];
    const warnings = [];

    if (!normalized.signedIn || normalized.role !== PARENT_GUARDIAN_ROLE) errors.push('authenticated_parent_guardian_required');
    if (normalized.parentPreview) errors.push('parent_preview_cannot_manage_billing');
    if (safeString(input.learnerId) || safeString(input.studentName) || input.activeStudent) {
      errors.push('learner_identity_must_not_be_billing_owner');
    }
    if (!normalized.actorId) errors.push('actor_id_required');
    if (normalized.verifiedEmail !== true) errors.push('verified_email_required');
    if (!['verified', 'active'].includes(normalized.recoveryStatus)) errors.push('recovery_path_required');
    if (!normalized.countryRegion) errors.push('country_region_required');
    if (!normalized.currency) errors.push('currency_required_or_detectable');
    if (normalized.notificationPreferences.transactionalBilling !== true) errors.push('transactional_billing_notices_required');
    if (normalized.supportVerification.status !== 'verified') errors.push('support_verification_required');
    if (!normalized.displayName) errors.push('privacy_safe_display_name_required');
    if (safeString(input.providerCustomerId)) warnings.push('provider_customer_id_ignored_by_profile_contract');

    return {
      valid: errors.length === 0,
      errors: Object.freeze(dedupe(errors)),
      warnings: Object.freeze(dedupe(warnings)),
      profile: normalized
    };
  }

  function buildProviderSafeBillingOwnerMetadata(profile) {
    const normalized = normalizeBillingOwnerProfile(profile);
    return {
      billingOwnerRef: normalized.actorId ? `billing-owner:${normalized.actorId}` : '',
      role: normalized.role,
      countryRegion: normalized.countryRegion,
      currency: normalized.currency
    };
  }

  function normalizeNotificationPreferences(preferences) {
    const input = preferences && typeof preferences === 'object' ? preferences : {};
    return {
      transactionalBilling: input.transactionalBilling === true,
      renewalReminder: input.renewalReminder === true,
      failedPayment: input.failedPayment === true,
      marketing: input.marketing === true
    };
  }

  function normalizeSupportVerification(verification) {
    const input = verification && typeof verification === 'object' ? verification : {};
    return {
      status: safeString(input.status),
      method: safeString(input.method)
    };
  }

  function deriveCurrency(countryRegion, policy) {
    if (safeString(policy) !== 'region_default') return '';
    return REGION_DEFAULT_CURRENCIES[countryRegion] || '';
  }

  function normalizeCurrency(value) {
    const currency = safeString(value).toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : '';
  }

  function normalizeRegion(value) {
    const region = safeString(value).toUpperCase();
    return /^[A-Z]{2}$/.test(region) ? region : '';
  }

  function normalizeDisplayName(value) {
    const displayName = safeString(value).replace(/\s+/g, ' ').slice(0, 80);
    if (!displayName || /@|learner|student/i.test(displayName)) return '';
    return displayName;
  }

  function dedupe(values) {
    return [...new Set(values)];
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_OWNER_REQUIRED_FIELDS,
    buildProviderSafeBillingOwnerMetadata,
    evaluateBillingOwnerEligibility,
    normalizeBillingOwnerProfile,
    validateBillingOwnerProfile
  };
});
