(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingLaunchChecklistPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_BILLING_LAUNCH_EVIDENCE = Object.freeze([
    'pci_scope',
    'hosted_checkout_or_provider_elements',
    'major_cards',
    'apple_pay_display_rules',
    'paypal_display_rules',
    'venmo_display_rules',
    'sca_3ds',
    'provider_account_approval',
    'education_acceptable_use',
    'target_markets',
    'evidence_ownership'
  ]);

  const BILLING_LAUNCH_FORBIDDEN_PATTERN = /\b(providerCredential|paymentCredential|walletCredential|rawProviderPayload|learnerId|studentId|studentName|authToken|provider_live_[A-Za-z0-9_-]+|customer_live_[A-Za-z0-9_-]+|subscription_live_[A-Za-z0-9_-]+)\b|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i;

  const DEFAULT_BILLING_LAUNCH_CHECKLIST = Object.freeze([
    item('pci_scope', 'security_owner', 'Prove the app remains in the lowest feasible PCI scope and makes no PCI certification claim.', 'node --test tests/commerce-security-policy.test.js tests/billing-launch-checklist-policy.test.js', ['docs/security/commerce-security-policy.md', 'docs/billing-launch-checklist.md'], false),
    item('hosted_checkout_or_provider_elements', 'billing_platform', 'Use provider-hosted checkout or provider elements for every payment collection path.', 'node --test tests/checkout-method-policy.test.js tests/commerce-security-policy.test.js', ['docs/checkout-method-policy.md', 'docs/security/commerce-security-policy.md'], false),
    item('major_cards', 'billing_platform', 'Major cards must use provider-hosted checkout or provider elements with no app-owned raw card form.', 'node --test tests/checkout-method-policy.test.js tests/billing-launch-checklist-policy.test.js', ['docs/checkout-method-policy.md', 'docs/billing-provider-capability-matrix.json'], false),
    item('apple_pay_display_rules', 'billing_policy_owner', 'Apple Pay display, eligibility, browser, device, merchant, and fallback rules are launch-blocking evidence.', 'node --test tests/checkout-method-policy.test.js tests/checkout-launch-availability-policy.test.js', ['docs/checkout-method-policy.md', 'docs/checkout-launch-availability-policy.md'], false),
    item('paypal_display_rules', 'billing_policy_owner', 'PayPal display, recurring support, region, fallback, and dispute-routing rules are launch-blocking evidence.', 'node --test tests/checkout-method-policy.test.js tests/checkout-launch-availability-policy.test.js', ['docs/checkout-method-policy.md', 'docs/checkout-launch-availability-policy.md'], false),
    item('venmo_display_rules', 'billing_policy_owner', 'Venmo display, region, device, recurrence, fallback, and support-copy rules are launch-blocking evidence.', 'node --test tests/checkout-method-policy.test.js tests/checkout-launch-availability-policy.test.js', ['docs/checkout-method-policy.md', 'docs/checkout-launch-availability-policy.md'], false),
    item('sca_3ds', 'billing_platform', 'SCA and 3DS support evidence is required for applicable regions before checkout can launch.', 'node --test tests/billing-provider-capability-matrix.test.js tests/billing-launch-checklist-policy.test.js', ['docs/billing-provider-capability-matrix.json', 'docs/billing-launch-checklist.md'], false),
    item('provider_account_approval', 'billing_policy_owner', 'Provider account approval must confirm education product, billing model, target regions, and support obligations.', 'node --test tests/billing-provider-capability-matrix.test.js tests/commerce-readiness-policy.test.js', ['docs/commerce-readiness-launch-gate.md', 'docs/billing-launch-checklist.md'], false),
    item('education_acceptable_use', 'billing_policy_owner', 'Education acceptable use approval must be recorded separately from provider selection and checkout rendering.', 'node --test tests/commerce-readiness-policy.test.js tests/billing-launch-checklist-policy.test.js', ['docs/commerce-readiness-launch-gate.md', 'docs/billing-launch-checklist.md'], false),
    item('target_markets', 'finance_owner', 'Target markets must have currency, tax, wallet, SCA, refund, and consumer-disclosure readiness evidence.', 'node --test tests/billing-provider-capability-matrix.test.js tests/billing-launch-checklist-policy.test.js', ['docs/billing-provider-capability-matrix.json', 'docs/billing-launch-checklist.md'], false),
    item('evidence_ownership', 'billing_policy_owner', 'Every launch evidence row has an owner, review command, evidence links, and rollback implication.', 'node --test tests/compliance-release-checklist.test.js tests/ci-contract.test.js', ['docs/compliance-release-checklist.md', 'docs/billing-launch-checklist.md'], false)
  ]);

  function item(id, owner, requirement, reviewCommand, evidenceLinks, certificationClaim) {
    return Object.freeze({
      id,
      owner,
      requirement,
      launchBlocking: true,
      certificationClaim,
      reviewCommand,
      evidenceLinks: Object.freeze(evidenceLinks.slice())
    });
  }

  function buildBillingLaunchChecklistMap(items) {
    return normalizeItems(items).reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  }

  function validateBillingLaunchChecklist(items = DEFAULT_BILLING_LAUNCH_CHECKLIST) {
    const normalized = normalizeItems(items);
    const errors = [];
    const ids = new Set(normalized.map(item => item.id));
    REQUIRED_BILLING_LAUNCH_EVIDENCE.forEach(id => {
      if (!ids.has(id)) errors.push(`${id} launch evidence is required`);
    });
    normalized.forEach(item => errors.push(...validateBillingLaunchChecklistItem(item).errors));
    return { valid: errors.length === 0, errors };
  }

  function validateBillingLaunchChecklistItem(raw) {
    const item = raw && typeof raw === 'object' ? raw : {};
    const id = safeString(item.id) || 'billing_launch_item';
    const errors = [];
    if (!safeString(item.owner)) errors.push(`${id} owner is required`);
    if (!safeString(item.requirement)) errors.push(`${id} requirement is required`);
    if (item.launchBlocking !== true) errors.push(`${id} must be launch blocking`);
    if (item.certificationClaim === true) errors.push(`${id} must not claim PCI certification`);
    if (!/^npm run [\w:.-]+$|^node --test /.test(safeString(item.reviewCommand))) {
      errors.push(`${id} reviewCommand must use npm run or node --test`);
    }
    if (!Array.isArray(item.evidenceLinks) || item.evidenceLinks.length < 2) {
      errors.push(`${id} evidenceLinks must include at least two links`);
    }
    if (BILLING_LAUNCH_FORBIDDEN_PATTERN.test(JSON.stringify(item.examples || []))) {
      errors.push(`${id} examples contain sensitive launch material`);
    }
    if (BILLING_LAUNCH_FORBIDDEN_PATTERN.test(JSON.stringify(item))) {
      errors.push(`${id} contains sensitive launch material`);
    }
    return { valid: errors.length === 0, errors };
  }

  function normalizeItems(items) {
    return Array.isArray(items) ? items : [];
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_LAUNCH_FORBIDDEN_PATTERN,
    DEFAULT_BILLING_LAUNCH_CHECKLIST,
    REQUIRED_BILLING_LAUNCH_EVIDENCE,
    buildBillingLaunchChecklistMap,
    validateBillingLaunchChecklist,
    validateBillingLaunchChecklistItem
  };
});
