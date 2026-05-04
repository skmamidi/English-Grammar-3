(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestComplianceReleaseChecklist = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const fs = typeof require === 'function' ? require('node:fs') : null;
  const path = typeof require === 'function' ? require('node:path') : null;
  const repoRoot = path ? path.resolve(__dirname, '..') : '';

  const REQUIRED_COMPLIANCE_DOMAINS = Object.freeze([
    'privacy',
    'security',
    'accessibility',
    'content_licensing',
    'data_lifecycle',
    'institutional_policy',
    'operations',
    'native_readiness',
    'billing_prerequisites'
  ]);

  const DEFAULT_COMPLIANCE_RELEASE_CHECKLIST = Object.freeze({
    items: Object.freeze([
      item('privacy', 'privacy_owner', 'node --test tests/privacy-docs.test.js tests/data-inventory-classification.test.js tests/analytics-release-policy.test.js', 'critical', ['staging', 'production'], 'every release', ['docs/security/data-inventory.md', 'docs/security/records-of-processing.md', 'docs/analytics-release-policy.md']),
      item('security', 'security_owner', 'npm run security:scan', 'critical', ['staging', 'production'], 'every release', ['docs/security/runtime-security-headers.md', 'docs/security/backend-storage-rules.md', 'docs/security/dependency-policy.md']),
      item('accessibility', 'accessibility_owner', 'npm run test:a11y', 'high', ['staging', 'production'], 'every release', ['tests/accessibility-engine-policy.test.js', 'tests/design-token-accessibility.test.js']),
      item('content_licensing', 'content_reviewer', 'npm run qa:source-license', 'high', ['staging', 'production'], 'content changes', ['docs/question-authoring.md', 'tests/source-license-qa.test.js']),
      item('data_lifecycle', 'learner_data_owner', 'node --test tests/data-access-request-domain.test.js tests/learner-data-lifecycle-domain.test.js tests/learner-data-retention-policy.test.js', 'critical', ['staging', 'production'], 'every release', ['docs/security/data-access-requests.md', 'docs/security/learner-data-lifecycle.md']),
      item('institutional_policy', 'privacy_owner', 'node --test tests/institutional-policy-domain.test.js tests/policy-aware-feature-flags.test.js', 'critical', ['staging', 'production'], 'every release', ['docs/security/institutional-policy.md', 'docs/feature-flags.md']),
      item('operations', 'operations_owner', 'node --test tests/operations-docs.test.js tests/incident-review-policy.test.js tests/backup-rollback-rehearsal-policy.test.js', 'high', ['staging', 'production'], 'every release', ['docs/operations/README.md', 'docs/release-checklist.md']),
      item('native_readiness', 'platform_owner', 'node --test tests/static-asset-qa.test.js tests/domain-type-contract.test.js', 'medium', ['staging', 'production', 'native-preview'], 'native-affecting releases', ['docs/security/records-of-processing.md', 'docs/feature-flags.md']),
      item('billing_prerequisites', 'billing_policy_owner', 'node --test tests/commerce-readiness-policy.test.js tests/subscription-ux-policy.test.js tests/transactional-communication-contract.test.js tests/commerce-security-policy.test.js tests/commerce-support-policy.test.js tests/billing-provider-capability-matrix.test.js tests/billing-domain-contracts.test.js tests/payment-provider-adapter-boundary.test.js tests/checkout-method-policy.test.js tests/billing-webhook-ledger-policy.test.js tests/billing-entitlement-projection.test.js tests/fake-provider-billing-fixtures.test.js tests/billing-ux-regression-policy.test.js tests/billing-data-inventory-policy.test.js tests/billing-launch-checklist-policy.test.js tests/billing-operations-job-policy.test.js tests/billing-support-workflow-policy.test.js tests/billing-observability-policy.test.js tests/billing-payment-rehearsal-policy.test.js tests/billing-rollback-policy.test.js tests/billing-market-readiness-matrix.test.js tests/data-inventory-classification.test.js tests/privacy-docs.test.js tests/policy-aware-feature-flags.test.js', 'critical', ['production', 'billing-preview'], 'billing-affecting releases', ['docs/commerce-readiness-launch-gate.md', 'docs/subscription-ux-standards.md', 'docs/transactional-communications.md', 'docs/security/commerce-security-policy.md', 'docs/checkout-method-policy.md', 'docs/commerce-support-policy.md', 'docs/billing-provider-capability-matrix.json', 'docs/billing-domain-contracts.md', 'docs/security/payment-provider-adapter-boundary.md', 'docs/billing-webhook-ledger-policy.md', 'docs/billing-entitlement-projection.md', 'docs/fake-provider-billing-fixtures.md', 'docs/billing-ux-regression-matrix.md', 'docs/billing-market-readiness-matrix.md', 'docs/security/records-of-processing.md', 'docs/security/data-inventory.md', 'docs/security/billing-data-inventory.md', 'docs/billing-launch-checklist.md', 'docs/billing-operations-jobs.md', 'docs/billing-support-workflows.md', 'docs/operations/billing-observability.md', 'docs/operations/production-slos.md', 'docs/operations/synthetic-monitors.md', 'docs/performance/operational-cost-budgets.md', 'docs/billing-payment-rehearsals.md', 'docs/operations/deployment-attestation.md', 'docs/billing-rollback-policy.md', 'docs/operations/runbook-billing-rollback.md', 'docs/feature-flags.md'])
    ])
  });

  function item(domain, owner, command, riskTier, releaseTypes, reviewCadence, evidenceLinks) {
    return Object.freeze({
      domain,
      owner,
      command,
      riskTier,
      releaseTypes: Object.freeze(releaseTypes.slice()),
      reviewCadence,
      evidenceLinks: Object.freeze(evidenceLinks.slice())
    });
  }

  function validateComplianceReleaseChecklist(checklist = DEFAULT_COMPLIANCE_RELEASE_CHECKLIST) {
    const input = checklist && typeof checklist === 'object' ? checklist : {};
    const items = Array.isArray(input.items) ? input.items : [];
    const errors = [];
    const domains = new Set(items.map(row => safeString(row.domain)));
    REQUIRED_COMPLIANCE_DOMAINS.forEach(domain => {
      if (!domains.has(domain)) errors.push(`missing domain ${domain}`);
    });
    items.forEach(row => {
      const domain = safeString(row.domain) || 'compliance';
      if (!safeString(row.owner)) errors.push(`${domain} owner is required`);
      if (!/^npm run [\w:.-]+$|^node --test /.test(safeString(row.command))) {
        errors.push(`${domain} command must use npm run or node --test`);
      }
      if (!['low', 'medium', 'high', 'critical'].includes(safeString(row.riskTier))) {
        errors.push(`${domain} riskTier is invalid`);
      }
      if (!Array.isArray(row.releaseTypes) || row.releaseTypes.length === 0) errors.push(`${domain} releaseTypes are required`);
      if (!safeString(row.reviewCadence)) errors.push(`${domain} reviewCadence is required`);
      if (!Array.isArray(row.evidenceLinks) || row.evidenceLinks.length === 0) {
        errors.push(`${domain} evidenceLinks are required`);
      } else {
        row.evidenceLinks.forEach(link => {
          if (!linkExists(link)) errors.push(`${domain} evidence link does not exist: ${link}`);
        });
      }
    });
    return { valid: errors.length === 0, errors };
  }

  function validateComplianceReviewException(exception = {}) {
    const input = exception && typeof exception === 'object' ? exception : {};
    const errors = [];
    if (!safeString(input.domain)) errors.push('domain is required');
    if (!safeString(input.owner)) errors.push('owner is required');
    if (!safeString(input.rationale)) errors.push('rationale is required');
    if (!safeString(input.expiresAt)) errors.push('expiresAt is required');
    if (!safeString(input.followUpEvidence)) errors.push('followUpEvidence is required');
    return { valid: errors.length === 0, errors };
  }

  function linkExists(link) {
    if (!fs || !path) return true;
    return fs.existsSync(path.join(repoRoot, safeString(link).split('#')[0]));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_COMPLIANCE_RELEASE_CHECKLIST,
    REQUIRED_COMPLIANCE_DOMAINS,
    validateComplianceReleaseChecklist,
    validateComplianceReviewException
  };
});
