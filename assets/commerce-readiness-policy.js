(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCommerceReadinessPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const fs = typeof require === 'function' ? require('node:fs') : null;
  const path = typeof require === 'function' ? require('node:path') : null;
  const repoRoot = path ? path.resolve(__dirname, '..') : '';

  const APPROVED_STATUS = 'approved';
  const PROVIDER_NEUTRAL_DECISIONS = new Set(['provider_neutral', 'deferred', 'not_selected']);
  const COMMERCE_READINESS_REQUIRED_DOMAINS = Object.freeze([
    'account_identity',
    'product_catalog',
    'pricing',
    'legal_terms',
    'refund_cancellation',
    'support_ownership',
    'pci_scope',
    'provider_capability_matrix',
    'native_app_store_policy',
    'billing_rollback'
  ]);

  const DEFAULT_COMMERCE_READINESS_POLICY = Object.freeze({
    id: 'commerce-readiness-launch-gate-v1',
    providerDecision: 'deferred',
    noRealPaymentsUntilApproved: true,
    items: Object.freeze([
      item('account_identity', 'identity_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('product_catalog', 'commerce_catalog_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('pricing', 'pricing_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('legal_terms', 'legal_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('refund_cancellation', 'support_policy_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('support_ownership', 'support_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('pci_scope', 'security_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('provider_capability_matrix', 'commerce_platform_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('native_app_store_policy', 'platform_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30'),
      item('billing_rollback', 'operations_owner', 'docs/commerce-readiness-launch-gate.md', 'pending', '2026-09-30')
    ])
  });

  function item(domain, owner, evidenceLink, status, reviewDate) {
    return Object.freeze({
      domain,
      owner,
      evidenceLink,
      status,
      requiredStatus: APPROVED_STATUS,
      reviewDate,
      releaseBlocker: true,
      providerDecision: 'provider_neutral'
    });
  }

  function buildCommerceLaunchGate(policy = DEFAULT_COMMERCE_READINESS_POLICY, options = {}) {
    const result = validateCommerceReadinessPolicy(policy, options);
    const requestedMode = safeString(options.requestedMode || 'readiness_review');
    const canCollectRealPayments = result.valid && result.providerNeutral && result.releaseBlockersComplete;
    const blockers = result.blockers.slice();
    if (requestedMode === 'real_payment_collection' && !canCollectRealPayments && !blockers.includes('real_payments_blocked_until_commerce_readiness_passes')) {
      blockers.unshift('real_payments_blocked_until_commerce_readiness_passes');
    }

    return {
      valid: result.valid,
      canCollectRealPayments,
      providerNeutral: result.providerNeutral,
      blockers,
      warnings: result.warnings.slice(),
      summary: Object.freeze({
        requiredDomains: result.summary.requiredDomains,
        approvedReleaseBlockers: result.summary.approvedReleaseBlockers,
        releaseBlockers: result.summary.releaseBlockers
      })
    };
  }

  function validateCommerceReadinessPolicy(policy = DEFAULT_COMMERCE_READINESS_POLICY, options = {}) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const items = Array.isArray(input.items) ? input.items : [];
    const now = parseDate(options.now) || new Date();
    const blockers = [];
    const warnings = [];
    const domains = new Set(items.map(row => safeString(row.domain)));

    COMMERCE_READINESS_REQUIRED_DOMAINS.forEach(domain => {
      if (!domains.has(domain)) blockers.push(`missing domain ${domain}`);
    });

    const providerDecision = safeString(input.providerDecision || 'provider_neutral') || 'provider_neutral';
    let providerNeutral = PROVIDER_NEUTRAL_DECISIONS.has(providerDecision);
    if (!providerNeutral) blockers.push('commerce readiness provider decision must remain provider-neutral');

    let releaseBlockers = 0;
    let approvedReleaseBlockers = 0;
    items.forEach(row => {
      const domain = safeString(row.domain) || 'commerce_readiness';
      const status = safeString(row.status);
      const requiredStatus = safeString(row.requiredStatus || APPROVED_STATUS);
      const rowProviderDecision = safeString(row.providerDecision || 'provider_neutral') || 'provider_neutral';
      if (!safeString(row.owner)) blockers.push(`${domain} owner is required`);
      if (!safeString(row.evidenceLink)) {
        blockers.push(`${domain} evidence link is required`);
      } else if (!linkExists(row.evidenceLink)) {
        blockers.push(`${domain} evidence link does not exist: ${safeString(row.evidenceLink)}`);
      }
      if (row.releaseBlocker !== true) blockers.push(`${domain} must be a release blocker`);
      if (row.releaseBlocker === true) releaseBlockers += 1;
      if (status !== requiredStatus) blockers.push(`${domain} evidence status must be ${requiredStatus}`);
      if (row.releaseBlocker === true && status === requiredStatus) approvedReleaseBlockers += 1;
      if (!reviewDateIsFuture(row.reviewDate, now)) blockers.push(`${domain} reviewDate must be in the future`);
      if (!PROVIDER_NEUTRAL_DECISIONS.has(rowProviderDecision)) {
        blockers.push(`${domain} provider decision must remain provider-neutral`);
        providerNeutral = false;
      }
    });

    const releaseBlockersComplete = releaseBlockers === COMMERCE_READINESS_REQUIRED_DOMAINS.length &&
      approvedReleaseBlockers === COMMERCE_READINESS_REQUIRED_DOMAINS.length;
    const canCollectRealPayments = blockers.length === 0 && providerNeutral && releaseBlockersComplete;
    if (input.noRealPaymentsUntilApproved !== false && !canCollectRealPayments) {
      blockers.unshift('real_payments_blocked_until_commerce_readiness_passes');
    }

    return {
      valid: blockers.length === 0,
      canCollectRealPayments,
      providerNeutral,
      releaseBlockersComplete,
      blockers: Object.freeze(dedupe(blockers)),
      warnings: Object.freeze(warnings),
      summary: Object.freeze({
        requiredDomains: COMMERCE_READINESS_REQUIRED_DOMAINS.length,
        releaseBlockers,
        approvedReleaseBlockers
      })
    };
  }

  function reviewDateIsFuture(value, now) {
    const date = parseDate(value);
    return Boolean(date && date.getTime() > now.getTime());
  }

  function parseDate(value) {
    const raw = safeString(value);
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function linkExists(link) {
    if (!fs || !path) return true;
    return fs.existsSync(path.join(repoRoot, safeString(link).split('#')[0]));
  }

  function dedupe(values) {
    return [...new Set(values)];
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    COMMERCE_READINESS_REQUIRED_DOMAINS,
    DEFAULT_COMMERCE_READINESS_POLICY,
    buildCommerceLaunchGate,
    validateCommerceReadinessPolicy
  };
});
