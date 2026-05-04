(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingDataInventoryPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_BILLING_DATA_CATEGORIES = Object.freeze([
    'provider_customer_reference',
    'subscription_reference',
    'invoice_reference',
    'payment_status',
    'masked_payment_method_label',
    'refund_record',
    'dispute_record',
    'billing_audit_event',
    'entitlement_record'
  ]);

  const BILLING_DATA_FORBIDDEN_EXAMPLE_PATTERN = /\b(rawProviderPayload|paymentCredential|walletCredential|cardNumber|cvv|cvc|learnerId|studentId|studentName|authToken|providerToken|providerSecret|customer_live_[A-Za-z0-9_-]+|subscription_live_[A-Za-z0-9_-]+|invoice_live_[A-Za-z0-9_-]+)\b|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i;

  const DEFAULT_BILLING_DATA_INVENTORY = Object.freeze([
    entry('provider_customer_reference', 'Redacted provider customer reference', 'Maps parent billing owner to provider-held account reference', 'Retain while a billing relationship, refund, dispute, tax, or audit obligation remains active; store only redacted references in app evidence.', 'Delete where policy allows after billing closure; otherwise retain redacted reference for required financial records.', 'Export as redacted provider reference metadata only.', 'Future payment provider stores the source value; app docs and browser surfaces use redacted references only.', 'billing_policy_owner', 'finance_owner owns tax evidence; billing_policy_owner confirms the reference is sufficient for tax records without exposing live IDs.', 'billing_policy_owner owns refund lookup policy with support_owner for parent requests.', ['docs/security/billing-data-inventory.md', 'docs/security/records-of-processing.md']),
    entry('subscription_reference', 'Redacted subscription reference', 'Connects recurring plan state to entitlement projection', 'Retain for subscription lifecycle, cancellation evidence, refund windows, disputes, and tax review.', 'Delete or detach when allowed after subscription closure; preserve required redacted financial evidence.', 'Export plan, status, and redacted subscription reference only.', 'Future payment provider owns source subscription record; app keeps provider-neutral projection.', 'billing_policy_owner', 'finance_owner owns recurring tax evidence review.', 'billing_policy_owner owns cancellation and refund eligibility interpretation.', ['docs/billing-domain-contracts.md', 'docs/security/billing-data-inventory.md']),
    entry('invoice_reference', 'Redacted invoice or receipt reference', 'Supports parent receipts, tax evidence, refunds, and dispute lookup', 'Retain according to financial record and tax evidence policy.', 'Do not delete required tax or dispute records early; suppress or redact browser display after account closure where allowed.', 'Export receipt date, amount band, status, and redacted invoice reference.', 'Future payment provider owns invoice source; app stores app-owned receipt projection.', 'billing_policy_owner', 'finance_owner owns invoice tax evidence and localization requirements.', 'billing_policy_owner owns receipt refund status rules.', ['docs/billing-domain-contracts.md', 'docs/security/billing-data-inventory.md']),
    entry('payment_status', 'Payment and renewal status', 'Explains active, failed, grace, processing, canceled, refunded, and disputed billing states', 'Retain current status while account exists and historical status while required for audit, refund, dispute, or tax review.', 'Delete or anonymize status history when financial retention no longer applies.', 'Export parent-safe status labels and dates without provider payloads.', 'Future payment provider sends status through server-owned webhook and ledger policy.', 'billing_policy_owner', 'finance_owner owns tax-impacting status evidence.', 'billing_policy_owner owns refund and cancellation status policy.', ['docs/billing-state-presentation.md', 'docs/security/billing-data-inventory.md']),
    entry('masked_payment_method_label', 'Masked payment method label', 'Shows safe parent-facing method context such as card brand plus last-safe mask or wallet label', 'Retain only while useful for billing management, receipts, refunds, disputes, or support verification.', 'Delete masked label when method is removed unless required for financial evidence.', 'Export masked labels only; never export credentials or wallet tokens.', 'Future payment provider owns credentials; app receives masked display label only.', 'billing_policy_owner', 'finance_owner confirms masked labels satisfy receipt evidence without credential storage.', 'billing_policy_owner owns refund communication rules for masked labels.', ['docs/checkout-method-policy.md', 'docs/security/billing-data-inventory.md']),
    entry('refund_record', 'Refund record', 'Tracks refund eligibility, requested amount band, status, reason category, and parent-safe evidence', 'Retain for refund policy, accounting, dispute defense, and tax correction periods.', 'Do not delete active refund evidence; redact or minimize after retention expires.', 'Export refund status, dates, amount band, and redacted references.', 'Future payment provider owns money movement; app owns parent-safe refund workflow projection.', 'billing_policy_owner', 'finance_owner owns tax correction evidence for refunds.', 'billing_policy_owner owns refund policy and support_owner owns request handling.', ['docs/commerce-support-policy.md', 'docs/security/billing-data-inventory.md']),
    entry('dispute_record', 'Dispute or chargeback record', 'Tracks dispute status, reason category, evidence deadlines, and parent-safe resolution copy', 'Retain for dispute defense, audit, and financial record obligations.', 'Do not delete active dispute evidence; minimize after the dispute and retention window close.', 'Export dispute status, dates, reason category, and redacted references.', 'Future payment provider owns dispute event source; app owns safe support projection.', 'billing_policy_owner', 'finance_owner owns tax and accounting reconciliation for disputes.', 'billing_policy_owner owns chargeback and support response policy.', ['docs/commerce-support-policy.md', 'docs/security/billing-data-inventory.md']),
    entry('billing_audit_event', 'Billing audit event', 'Records server-mediated billing actions, webhook decisions, support adjustments, and policy overrides', 'Retain append-only audit evidence while needed for security, financial, support, and compliance review.', 'Prune only through approved audit retention process; never expose raw provider payloads.', 'Export operational audit summary with actor role, action category, and redacted references.', 'Server-side billing jobs and future provider webhooks produce sanitized audit events.', 'billing_policy_owner', 'finance_owner reviews tax-affecting audit categories.', 'billing_policy_owner owns refund and support override audit rules.', ['docs/billing-webhook-ledger-policy.md', 'docs/security/billing-data-inventory.md']),
    entry('entitlement_record', 'Billing entitlement record', 'Projects paid access state separately from learner progress', 'Retain current entitlement while access is active and history while required for billing audit, refund, or dispute review.', 'Delete or downgrade access projection when subscription ends, while retaining required financial evidence separately.', 'Export access state, plan family, and dates without learner progress or provider payloads.', 'Entitlement backend owns app projection; payment provider does not receive learner progress.', 'billing_policy_owner', 'finance_owner reviews entitlement dates used for tax and refund evidence.', 'billing_policy_owner owns access, refund, and cancellation entitlement policy.', ['docs/billing-entitlement-projection.md', 'docs/security/billing-data-inventory.md'])
  ]);

  function entry(id, label, purpose, retention, deletionBehavior, exportBehavior, subprocessorBoundary, owner, taxOwnership, refundPolicyOwnership, policyLinks) {
    return Object.freeze({
      id,
      label,
      purpose,
      retention,
      deletionBehavior,
      exportBehavior,
      subprocessorBoundary,
      owner,
      taxOwnership,
      refundPolicyOwnership,
      policyLinks: Object.freeze(policyLinks.slice())
    });
  }

  function buildBillingDataInventoryMap(entries) {
    return normalizeEntries(entries).reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  }

  function validateBillingDataInventory(entries = DEFAULT_BILLING_DATA_INVENTORY) {
    const normalized = normalizeEntries(entries);
    const errors = [];
    const ids = new Set(normalized.map(item => item.id));
    REQUIRED_BILLING_DATA_CATEGORIES.forEach(id => {
      if (!ids.has(id)) errors.push(`${id} billing data category is required`);
    });
    normalized.forEach(item => errors.push(...validateBillingDataInventoryEntry(item).errors));
    return { valid: errors.length === 0, errors };
  }

  function validateBillingDataInventoryEntry(raw) {
    const item = raw && typeof raw === 'object' ? raw : {};
    const id = safeString(item.id) || 'billing_data_entry';
    const errors = [];
    if (!safeString(item.label)) errors.push(`${id} label is required`);
    if (!safeString(item.retention)) errors.push(`${id} retention is required`);
    if (!safeString(item.deletionBehavior)) errors.push(`${id} deletionBehavior is required`);
    if (!safeString(item.exportBehavior)) errors.push(`${id} exportBehavior is required`);
    if (!safeString(item.subprocessorBoundary)) errors.push(`${id} subprocessorBoundary is required`);
    if (safeString(item.owner) !== 'billing_policy_owner') errors.push(`${id} owner must be billing_policy_owner`);
    if (!safeString(item.taxOwnership)) errors.push(`${id} taxOwnership is required`);
    if (!safeString(item.refundPolicyOwnership)) errors.push(`${id} refundPolicyOwnership is required`);
    if (!Array.isArray(item.policyLinks) || item.policyLinks.length < 2) errors.push(`${id} policyLinks must include at least two evidence links`);
    if (BILLING_DATA_FORBIDDEN_EXAMPLE_PATTERN.test(JSON.stringify(item.examples || []))) {
      errors.push(`${id} examples contain sensitive billing material`);
    }
    if (BILLING_DATA_FORBIDDEN_EXAMPLE_PATTERN.test(JSON.stringify(item))) {
      errors.push(`${id} contains sensitive billing material`);
    }
    return { valid: errors.length === 0, errors };
  }

  function normalizeEntries(entries) {
    return Array.isArray(entries) ? entries : [];
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_DATA_FORBIDDEN_EXAMPLE_PATTERN,
    DEFAULT_BILLING_DATA_INVENTORY,
    REQUIRED_BILLING_DATA_CATEGORIES,
    buildBillingDataInventoryMap,
    validateBillingDataInventory,
    validateBillingDataInventoryEntry
  };
});
