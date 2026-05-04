(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingMarketReadinessMatrix = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REDACTED = '[REDACTED]';
  const REQUIRED_MARKET_READINESS_FIELDS = Object.freeze([
    'market',
    'currency',
    'taxOwner',
    'receiptCopyKey',
    'refundPolicyKey',
    'walletAvailability',
    'localization',
    'launchBlockers',
    'evidenceOwner'
  ]);
  const SUPPORTED_MARKETS = Object.freeze(['US', 'CA', 'DE']);
  const WALLET_METHODS = Object.freeze(['major_cards', 'apple_pay', 'paypal', 'venmo']);
  const sensitivePattern = /^(rawProviderPayload|providerPayload|providerCustomerId|providerPaymentMethodId|paymentCredential|walletCredential|cardNumber|cvv|cvc|authToken|token|secret|privateKey)$/i;
  const learnerPattern = /^(learnerId|studentId|studentName|learnerEmail|learnerProgress)$/i;

  const DEFAULT_BILLING_MARKET_READINESS_MATRIX = Object.freeze({
    schemaVersion: 1,
    markets: Object.freeze([
      market({
        market: 'US',
        currency: 'USD',
        locale: 'en-US',
        launchStatus: 'billing_preview',
        launchBlockers: ['tax_collection_owner_not_approved', 'provider_market_evidence_pending'],
        localizedStrings: {
          priceLabel: 'USD 123.45 per year including estimated taxes and local fees',
          renewalLabel: 'Renews on December 31, 2030 after local billing review',
          cancellationLabel: 'Cancel renewal at period end'
        },
        wallets: {
          major_cards: wallet('preview_ready', 'major_cards_available_copy', true),
          apple_pay: wallet('requires_evidence', 'apple_pay_unavailable_copy', true),
          paypal: wallet('requires_evidence', 'paypal_unavailable_copy', true),
          venmo: wallet('requires_evidence', 'venmo_unavailable_copy', true)
        }
      }),
      market({
        market: 'CA',
        currency: 'CAD',
        locale: 'en-CA',
        launchStatus: 'planned',
        launchBlockers: ['localized_receipt_copy_not_approved', 'tax_collection_owner_not_approved'],
        localizedStrings: {
          priceLabel: 'CAD 123.45 per year with estimated taxes and provincial fees',
          renewalLabel: 'Renews on December 31, 2030 after Canadian billing review',
          cancellationLabel: 'Cancel renewal at period end'
        },
        wallets: {
          major_cards: wallet('requires_evidence', 'major_cards_available_copy', true),
          apple_pay: wallet('requires_evidence', 'apple_pay_unavailable_copy', true),
          paypal: wallet('requires_evidence', 'paypal_unavailable_copy', true),
          venmo: wallet('not_available', 'venmo_not_available_in_market_copy', false)
        }
      }),
      market({
        market: 'DE',
        currency: 'EUR',
        locale: 'de-DE',
        launchStatus: 'planned',
        launchBlockers: ['localized_refund_terms_not_approved', 'tax_collection_owner_not_approved'],
        localizedStrings: {
          priceLabel: '123,45 EUR pro Jahr inklusive geschatzter Steuern',
          renewalLabel: 'Verlangerung am 31. Dezember 2030 nach lokaler Prufung',
          cancellationLabel: 'Verlangerung zum Laufzeitende kundigen'
        },
        wallets: {
          major_cards: wallet('requires_evidence', 'major_cards_available_copy', true),
          apple_pay: wallet('requires_evidence', 'apple_pay_unavailable_copy', true),
          paypal: wallet('requires_evidence', 'paypal_unavailable_copy', true),
          venmo: wallet('not_available', 'venmo_not_available_in_market_copy', false)
        }
      })
    ])
  });

  function market(overrides) {
    return Object.freeze({
      market: overrides.market,
      currency: overrides.currency,
      launchStatus: overrides.launchStatus,
      taxOwner: 'billing_policy_owner',
      receiptCopyKey: `billing_receipt_${overrides.market.toLowerCase()}`,
      refundPolicyKey: `billing_refund_${overrides.market.toLowerCase()}`,
      walletAvailability: Object.freeze(overrides.wallets),
      localization: Object.freeze({
        locale: overrides.locale,
        maxBillingStringLength: 112,
        priceLabel: overrides.localizedStrings.priceLabel,
        renewalLabel: overrides.localizedStrings.renewalLabel,
        cancellationLabel: overrides.localizedStrings.cancellationLabel
      }),
      launchBlockers: Object.freeze(overrides.launchBlockers.slice()),
      evidenceOwner: 'billing_policy_owner',
      evidenceStatus: 'needs_review'
    });
  }

  function wallet(status, fallbackCopyKey, evidenceRequired) {
    return Object.freeze({ status, fallbackCopyKey, evidenceRequired });
  }

  function validateBillingMarketReadinessMatrix(matrix = DEFAULT_BILLING_MARKET_READINESS_MATRIX) {
    const input = matrix && typeof matrix === 'object' ? matrix : {};
    const markets = (Array.isArray(input.markets) ? input.markets : []).map(normalizeMarketRow);
    const errors = [];
    if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    SUPPORTED_MARKETS.forEach(marketCode => {
      if (!markets.some(row => row.market === marketCode)) errors.push(`market missing:${marketCode}`);
    });
    markets.forEach(row => {
      validateBillingMarketReadinessRecord(row).errors.forEach(error => errors.push(`${row.market || 'market'}: ${error}`));
    });
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)), matrix: { schemaVersion: 1, markets } };
  }

  function validateBillingMarketReadinessRecord(record = {}) {
    const row = normalizeMarketRow(record);
    const errors = [];
    if (!SUPPORTED_MARKETS.includes(row.market)) errors.push('market must be explicitly supported');
    if (!/^[A-Z]{3}$/.test(row.currency)) errors.push('currency must be ISO 4217');
    if (!row.taxOwner) errors.push('tax owner is required');
    if (!row.receiptCopyKey) errors.push('receipt copy key is required');
    if (!row.refundPolicyKey) errors.push('refund policy key is required');
    WALLET_METHODS.forEach(method => {
      if (!row.walletAvailability[method]) errors.push(`wallet availability missing:${method}`);
      else if (!['preview_ready', 'requires_evidence', 'not_available'].includes(row.walletAvailability[method].status)) {
        errors.push(`wallet availability status invalid:${method}`);
      }
    });
    if (!row.localization.locale) errors.push('localization locale is required');
    if (row.localization.maxBillingStringLength < 72) errors.push('localization length must support long billing strings');
    ['priceLabel', 'renewalLabel', 'cancellationLabel'].forEach(field => {
      if (!row.localization[field]) errors.push(`localized ${field} is required`);
      if (row.localization[field] && row.localization[field].length > row.localization.maxBillingStringLength) {
        errors.push(`localized ${field} exceeds max length`);
      }
    });
    if (!Array.isArray(row.launchBlockers)) errors.push('launch blockers are required');
    if (!row.evidenceOwner) errors.push('evidence owner is required');
    if (row.launchStatus === 'production_approved' && (row.launchBlockers.length || row.evidenceStatus !== 'approved')) {
      errors.push('production market claims require no blockers and approved evidence');
    }
    if (containsKey(record, learnerPattern)) errors.push('market readiness record must not include learner identity');
    if (containsKey(record, sensitivePattern)) errors.push('market readiness record must not include provider payloads credentials tokens or secrets');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function getWalletAvailabilityForMarket(matrix, marketCode) {
    const row = validateBillingMarketReadinessMatrix(matrix).matrix.markets.find(item => item.market === safeString(marketCode).toUpperCase());
    return row ? row.walletAvailability : {};
  }

  function buildCatalogMarketPriceReview(catalog = {}, matrix = DEFAULT_BILLING_MARKET_READINESS_MATRIX) {
    const markets = validateBillingMarketReadinessMatrix(matrix).matrix.markets;
    const plans = Array.isArray(catalog.plans) ? catalog.plans : [];
    const rows = [];
    plans.forEach(plan => {
      const planPrices = Array.isArray(plan.prices) ? plan.prices : [];
      markets.forEach(marketRow => {
        const matchingPrice = planPrices.find(price => safeString(price.currency).toUpperCase() === marketRow.currency);
        rows.push({
          planId: safeString(plan.planId),
          market: marketRow.market,
          currency: marketRow.currency,
          displayAmount: safeString(matchingPrice && matchingPrice.displayAmount || 'Market review required'),
          priceStatus: matchingPrice ? safeString(matchingPrice.priceStatus || 'placeholder') : 'market_review_required',
          taxOwner: marketRow.taxOwner,
          receiptCopyKey: marketRow.receiptCopyKey,
          refundPolicyKey: marketRow.refundPolicyKey
        });
      });
    });
    return {
      catalogId: safeString(catalog.catalogId),
      mutatesCatalogPrices: false,
      rows
    };
  }

  function buildMarketUxRegressionFixtures(matrix = DEFAULT_BILLING_MARKET_READINESS_MATRIX) {
    return validateBillingMarketReadinessMatrix(matrix).matrix.markets.map(row => ({
      scenarioId: 'mobile-long-localized-price',
      market: row.market,
      locale: row.localization.locale,
      priceLabel: row.localization.priceLabel,
      renewalLabel: row.localization.renewalLabel,
      cancellationLabel: row.localization.cancellationLabel,
      maxBillingStringLength: row.localization.maxBillingStringLength,
      privacySafe: true
    }));
  }

  function sanitizeBillingMarketReadinessRecord(value) {
    if (Array.isArray(value)) return value.map(item => sanitizeBillingMarketReadinessRecord(item));
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((sanitized, key) => {
      sanitized[key] = isSensitiveKey(key) ? REDACTED : sanitizeBillingMarketReadinessRecord(value[key]);
      return sanitized;
    }, {});
  }

  function normalizeMarketRow(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const localization = input.localization && typeof input.localization === 'object' ? input.localization : {};
    const walletAvailability = input.walletAvailability && typeof input.walletAvailability === 'object' ? input.walletAvailability : {};
    return {
      market: safeString(input.market).toUpperCase(),
      currency: safeString(input.currency).toUpperCase(),
      launchStatus: safeString(input.launchStatus || 'planned'),
      taxOwner: safeString(input.taxOwner),
      receiptCopyKey: safeString(input.receiptCopyKey),
      refundPolicyKey: safeString(input.refundPolicyKey),
      walletAvailability: WALLET_METHODS.reduce((result, method) => {
        const walletRow = walletAvailability[method] && typeof walletAvailability[method] === 'object' ? walletAvailability[method] : {};
        if (Object.keys(walletRow).length) {
          result[method] = {
            status: safeString(walletRow.status),
            fallbackCopyKey: safeString(walletRow.fallbackCopyKey),
            evidenceRequired: walletRow.evidenceRequired === true
          };
        }
        return result;
      }, {}),
      localization: {
        locale: safeString(localization.locale),
        maxBillingStringLength: Number(localization.maxBillingStringLength) || 0,
        priceLabel: safeString(localization.priceLabel),
        renewalLabel: safeString(localization.renewalLabel),
        cancellationLabel: safeString(localization.cancellationLabel)
      },
      launchBlockers: Array.isArray(input.launchBlockers) ? input.launchBlockers.map(safeString).filter(Boolean) : [],
      evidenceOwner: safeString(input.evidenceOwner),
      evidenceStatus: safeString(input.evidenceStatus || 'needs_review')
    };
  }

  function isSensitiveKey(key) {
    return learnerPattern.test(key) || sensitivePattern.test(key);
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_BILLING_MARKET_READINESS_MATRIX,
    REQUIRED_MARKET_READINESS_FIELDS,
    buildCatalogMarketPriceReview,
    buildMarketUxRegressionFixtures,
    getWalletAvailabilityForMarket,
    sanitizeBillingMarketReadinessRecord,
    validateBillingMarketReadinessMatrix,
    validateBillingMarketReadinessRecord
  };
});
