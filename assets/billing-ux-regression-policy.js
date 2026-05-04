(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingUxRegressionPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BILLING_UX_FORBIDDEN_FIELDS = Object.freeze([
    'providerCustomerId',
    'providerPaymentMethodId',
    'rawProviderPayload',
    'paymentCredential',
    'walletCredential',
    'cardNumber',
    'cvv',
    'cvc',
    'learnerId',
    'studentId',
    'studentName',
    'ledgerEvents',
    'authToken',
    'token',
    'secret'
  ]);

  const REQUIRED_BILLING_UX_SCENARIOS = Object.freeze([
    'mobile-long-localized-price',
    'billing-loading',
    'billing-empty',
    'billing-error-recovery',
    'checkout-method-fallbacks'
  ]);

  const DEFAULT_BILLING_UX_REGRESSION_MATRIX = Object.freeze({
    schemaVersion: 1,
    requiredScenarios: REQUIRED_BILLING_UX_SCENARIOS,
    scenarios: Object.freeze([
      scenario({
        id: 'mobile-long-localized-price',
        states: ['localized_price', 'renewal_countdown'],
        viewports: ['mobile', 'tablet', 'desktop'],
        expectations: ['no_text_overflow', 'parent_safe_copy', 'touch_targets', 'focus_visible']
      }),
      scenario({
        id: 'billing-loading',
        states: ['loading'],
        viewports: ['mobile', 'desktop'],
        expectations: ['aria_live_status', 'free_practice_visible', 'parent_safe_copy']
      }),
      scenario({
        id: 'billing-empty',
        states: ['no_subscription', 'no_receipts'],
        viewports: ['mobile', 'desktop'],
        expectations: ['empty_state_copy', 'free_practice_visible', 'parent_safe_copy']
      }),
      scenario({
        id: 'billing-error-recovery',
        states: ['provider_unavailable', 'payment_failed', 'webhook_delayed'],
        viewports: ['mobile', 'desktop'],
        expectations: ['non_destructive_recovery', 'aria_live_status', 'parent_safe_copy']
      }),
      scenario({
        id: 'checkout-method-fallbacks',
        states: ['apple_pay_unavailable', 'paypal_available', 'venmo_fallback_only'],
        viewports: ['mobile', 'desktop'],
        expectations: ['selected_plan_preserved', 'fallback_methods_visible', 'parent_safe_copy']
      })
    ]),
    coverage: Object.freeze({
      accessibilityPreferences: Object.freeze(['reduced_motion', 'forced_colors']),
      visualStateMatrixIds: Object.freeze([
        'subscription-route',
        'subscription-billing-loading',
        'subscription-billing-empty',
        'subscription-billing-error-recovery',
        'subscription-checkout-method-fallbacks'
      ]),
      routeComposition: Object.freeze(['subscription.html']),
      telemetryPrivacy: Object.freeze(['billing_ux_state_viewed', 'billing_ux_recovery_action_offered'])
    })
  });

  function validateBillingUxRegressionMatrix(matrix = DEFAULT_BILLING_UX_REGRESSION_MATRIX) {
    const input = matrix && typeof matrix === 'object' ? matrix : {};
    const scenarios = (Array.isArray(input.scenarios) ? input.scenarios : []).map(normalizeScenario);
    const coverage = normalizeCoverage(input.coverage);
    const errors = [];
    const ids = new Set();

    scenarios.forEach(item => {
      if (!item.id) errors.push('scenario id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!item.states.length) errors.push(`${item.id} states are required`);
      if (!item.viewports.includes('mobile')) errors.push(`${item.id} mobile viewport is required`);
      if (!item.expectations.includes('parent_safe_copy')) errors.push(`${item.id} parent safe copy expectation is required`);
    });

    REQUIRED_BILLING_UX_SCENARIOS.forEach(id => {
      if (!ids.has(id)) errors.push(`scenario ${id} is missing`);
    });
    ['reduced_motion', 'forced_colors'].forEach(preference => {
      if (!coverage.accessibilityPreferences.includes(preference)) errors.push(`accessibility preference ${preference} is missing`);
    });
    ['subscription-billing-loading', 'subscription-billing-error-recovery'].forEach(id => {
      if (!coverage.visualStateMatrixIds.includes(id)) errors.push(`visual state matrix id ${id} is missing`);
    });
    if (!coverage.routeComposition.includes('subscription.html')) errors.push('subscription route composition coverage is missing');
    if (!coverage.telemetryPrivacy.includes('billing_ux_state_viewed')) errors.push('billing UX telemetry privacy coverage is missing');

    return {
      valid: errors.length === 0,
      errors,
      matrix: {
        schemaVersion: 1,
        requiredScenarios: REQUIRED_BILLING_UX_SCENARIOS.slice(),
        scenarios,
        coverage
      }
    };
  }

  function buildBillingUxStateFixture(options = {}) {
    const input = options && typeof options === 'object' ? options : {};
    const projection = sanitizeProjection({
      state: inferFixtureState(input.scenarioId),
      locale: safeString(input.locale || 'en-US'),
      planFamily: 'premium',
      billingState: 'renewing',
      priceDisplay: safeString(input.priceLabel || '$12.99 per month'),
      renewalDisplay: safeString(input.renewalLabel || 'Renews June 1, 2030'),
      fallbackPaymentMethods: ['major_cards', 'paypal'],
      recoveryActions: [{
        action: 'update_payment_method',
        label: safeString(input.recoveryAction || 'Update payment method')
      }],
      providerCustomerId: input.providerCustomerId,
      learnerId: input.learnerId,
      studentName: input.studentName
    });

    assertBillingUxProjectionPrivacy(projection);

    const recoveryLabel = projection.recoveryActions[0].label;
    const html = [
      '<section class="billing-ux-fixture" aria-labelledby="billing-ux-title">',
      '<h2 id="billing-ux-title">Billing status</h2>',
      `<p>${escapeHtml(projection.priceDisplay)}</p>`,
      `<p aria-live="polite">${escapeHtml(projection.renewalDisplay)}</p>`,
      `<button type="button" class="focus-ring" data-min-target="44" aria-label="${escapeHtml(recoveryLabel)}">${escapeHtml(recoveryLabel)}</button>`,
      '</section>'
    ].join('');

    return {
      state: projection.state,
      privacySafe: true,
      html,
      projection
    };
  }

  function assertBillingUxProjectionPrivacy(projection) {
    scanProjection(projection, []);
    return true;
  }

  function scanProjection(value, path) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(key => {
      if (BILLING_UX_FORBIDDEN_FIELDS.includes(key)) {
        throw new Error(`unsafe_billing_ux_field:${path.concat(key).join('.')}`);
      }
      scanProjection(value[key], path.concat(key));
    });
  }

  function sanitizeProjection(value) {
    if (Array.isArray(value)) return value.map(sanitizeProjection);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (BILLING_UX_FORBIDDEN_FIELDS.includes(key)) return result;
      result[key] = sanitizeProjection(value[key]);
      return result;
    }, {});
  }

  function scenario(input) {
    return Object.freeze({
      id: input.id,
      states: Object.freeze((input.states || []).slice()),
      viewports: Object.freeze((input.viewports || []).slice()),
      expectations: Object.freeze((input.expectations || []).slice())
    });
  }

  function normalizeScenario(input) {
    const value = input && typeof input === 'object' ? input : {};
    return {
      id: safeString(value.id),
      states: normalizeStringArray(value.states),
      viewports: normalizeStringArray(value.viewports),
      expectations: normalizeStringArray(value.expectations)
    };
  }

  function normalizeCoverage(input) {
    const value = input && typeof input === 'object' ? input : {};
    return {
      accessibilityPreferences: normalizeStringArray(value.accessibilityPreferences),
      visualStateMatrixIds: normalizeStringArray(value.visualStateMatrixIds),
      routeComposition: normalizeStringArray(value.routeComposition),
      telemetryPrivacy: normalizeStringArray(value.telemetryPrivacy)
    };
  }

  function inferFixtureState(scenarioId) {
    if (scenarioId === 'mobile-long-localized-price') return 'localized_price';
    if (scenarioId === 'billing-loading') return 'loading';
    if (scenarioId === 'billing-empty') return 'no_subscription';
    if (scenarioId === 'billing-error-recovery') return 'provider_unavailable';
    if (scenarioId === 'checkout-method-fallbacks') return 'apple_pay_unavailable';
    return 'active';
  }

  function normalizeStringArray(value) {
    return (Array.isArray(value) ? value : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return safeString(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    BILLING_UX_FORBIDDEN_FIELDS,
    DEFAULT_BILLING_UX_REGRESSION_MATRIX,
    REQUIRED_BILLING_UX_SCENARIOS,
    assertBillingUxProjectionPrivacy,
    buildBillingUxStateFixture,
    validateBillingUxRegressionMatrix
  };
});
