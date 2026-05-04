(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCommerceCatalogDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const VALID_PLAN_TYPES = new Set(['free', 'subscription', 'one_time']);
  const VALID_INTERVALS = new Set(['none', 'month', 'year', 'one_time']);
  const VALID_ENTITLEMENT_LEVELS = new Set(['free', 'premium']);
  const VALID_STATUSES = new Set(['active', 'retired']);

  const DEFAULT_COMMERCE_CATALOG = Object.freeze({
    schemaVersion: 1,
    catalogId: 'grammarquest-commerce-catalog-v1',
    products: Object.freeze([
      Object.freeze({
        productId: 'grammarquest-family',
        label: 'GrammarQuest Family Access',
        status: 'active',
        owner: 'commerce_catalog_owner'
      })
    ]),
    plans: Object.freeze([
      plan({
        planId: 'free',
        planType: 'free',
        interval: 'none',
        entitlementLevel: 'free',
        featureGates: ['core_practice', 'local_progress'],
        prices: [price('USD', 'Free', 'approved')]
      }),
      plan({
        planId: 'premium_monthly',
        planType: 'subscription',
        interval: 'month',
        entitlementLevel: 'premium',
        featureGates: ['core_practice', 'local_progress', 'premium_practice', 'family_dashboard'],
        prices: [price('USD', 'Pending approval', 'placeholder')]
      }),
      plan({
        planId: 'premium_annual',
        planType: 'subscription',
        interval: 'year',
        entitlementLevel: 'premium',
        featureGates: ['core_practice', 'local_progress', 'premium_practice', 'family_dashboard'],
        prices: [price('USD', 'Pending approval', 'placeholder')]
      }),
      plan({
        planId: 'premium_one_time_90_day',
        planType: 'one_time',
        interval: 'one_time',
        accessWindowDays: 90,
        entitlementLevel: 'premium',
        featureGates: ['core_practice', 'local_progress', 'premium_practice'],
        prices: [price('USD', 'Pending approval', 'placeholder')]
      }),
      plan({
        planId: 'legacy_founder_annual',
        planType: 'subscription',
        interval: 'year',
        entitlementLevel: 'premium',
        featureGates: ['core_practice', 'local_progress', 'premium_practice', 'family_dashboard'],
        status: 'retired',
        replacementPlanId: 'premium_annual',
        grandfathering: { allowed: true, owner: 'commerce_catalog_owner', reviewDate: '2026-09-30' },
        prices: [price('USD', 'Retired', 'retired')]
      })
    ])
  });

  function plan(overrides) {
    return Object.freeze(Object.assign({
      productId: 'grammarquest-family',
      status: 'active',
      taxCategory: 'digital_service',
      currencyDisplay: 'localized',
      trialPolicy: { allowed: false, owner: 'commerce_catalog_owner' },
      promotionPolicy: { allowed: false, owner: 'commerce_catalog_owner' },
      grandfathering: { allowed: false, owner: 'commerce_catalog_owner', reviewDate: '2026-09-30' },
      planChangePolicy: { upgrade: 'allowed_after_checkout_exists', downgrade: 'end_of_period', cancel: 'self_service_required' },
      providerMappings: [{ provider: 'not_selected', mappingStatus: 'placeholder', providerPlanId: '', providerPriceId: '' }]
    }, overrides));
  }

  function price(currency, displayAmount, priceStatus) {
    return Object.freeze({
      currency,
      displayAmount,
      priceStatus,
      amountMinor: priceStatus === 'approved' && displayAmount === 'Free' ? 0 : null
    });
  }

  function normalizeCommerceCatalog(catalog = DEFAULT_COMMERCE_CATALOG) {
    const input = catalog && typeof catalog === 'object' ? catalog : {};
    return {
      schemaVersion: Number(input.schemaVersion) || 1,
      catalogId: safeString(input.catalogId || 'commerce-catalog'),
      products: normalizeArray(input.products).map(product => ({
        productId: safeString(product.productId || product.id),
        label: safeString(product.label || product.name),
        status: safeString(product.status || 'active'),
        owner: safeString(product.owner)
      })),
      plans: normalizeArray(input.plans).map(normalizePlan)
    };
  }

  function normalizePlan(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
      planId: safeString(input.planId || input.id),
      productId: safeString(input.productId),
      planType: safeString(input.planType || input.type),
      interval: safeString(input.interval),
      accessWindowDays: Number(input.accessWindowDays) || 0,
      entitlementLevel: safeString(input.entitlementLevel),
      featureGates: normalizeStringArray(input.featureGates),
      taxCategory: safeString(input.taxCategory),
      currencyDisplay: safeString(input.currencyDisplay || 'localized'),
      prices: normalizeArray(input.prices).map(price => ({
        currency: normalizeCurrency(price.currency),
        displayAmount: safeString(price.displayAmount),
        priceStatus: safeString(price.priceStatus || 'placeholder'),
        amountMinor: Number.isFinite(Number(price.amountMinor)) ? Number(price.amountMinor) : null
      })),
      status: safeString(input.status || 'active'),
      replacementPlanId: safeString(input.replacementPlanId),
      grandfathering: normalizeGrandfathering(input.grandfathering),
      trialPolicy: normalizePolicy(input.trialPolicy),
      promotionPolicy: normalizePolicy(input.promotionPolicy),
      planChangePolicy: normalizePlanChangePolicy(input.planChangePolicy),
      providerMappings: normalizeArray(input.providerMappings).map(mapping => ({
        provider: safeString(mapping.provider || 'not_selected'),
        mappingStatus: safeString(mapping.mappingStatus || 'placeholder'),
        providerPlanId: safeString(mapping.providerPlanId),
        providerPriceId: safeString(mapping.providerPriceId)
      }))
    };
  }

  function validateCommerceCatalog(catalog = DEFAULT_COMMERCE_CATALOG) {
    const normalized = normalizeCommerceCatalog(catalog);
    const errors = [];
    const productIds = new Set(normalized.products.map(product => product.productId).filter(Boolean));
    if (normalized.schemaVersion !== 1) errors.push('catalog schemaVersion must be 1');
    if (!normalized.products.length) errors.push('products are required');
    if (!normalized.plans.length) errors.push('plans are required');
    normalized.products.forEach(product => {
      if (!product.productId) errors.push('productId is required');
      if (!VALID_STATUSES.has(product.status)) errors.push(`${product.productId || 'product'} status is invalid`);
    });
    normalized.plans.forEach(plan => validatePlan(plan, productIds, errors));
    return { valid: errors.length === 0, errors: Object.freeze(dedupe(errors)), catalog: normalized };
  }

  function validatePlan(plan, productIds, errors) {
    const id = plan.planId || 'plan';
    if (!plan.planId) errors.push('planId is required');
    if (!productIds.has(plan.productId)) errors.push(`${id} productId must reference a catalog product`);
    if (!VALID_PLAN_TYPES.has(plan.planType)) errors.push(`${id} planType is invalid`);
    if (!VALID_INTERVALS.has(plan.interval)) errors.push(`${id} interval is invalid`);
    if (plan.planType === 'one_time' && plan.accessWindowDays <= 0) errors.push(`${id} one-time accessWindowDays is required`);
    if (!VALID_ENTITLEMENT_LEVELS.has(plan.entitlementLevel)) errors.push(`${id} entitlementLevel is required`);
    if (!plan.featureGates.length) errors.push(`${id} featureGates are required`);
    if (!plan.taxCategory) errors.push(`${id} taxCategory is required`);
    if (!plan.prices.length) errors.push(`${id} prices are required`);
    plan.prices.forEach((priceRow, index) => {
      if (!priceRow.currency) errors.push(`${id} price ${index} currency is invalid`);
      if (!priceRow.displayAmount) errors.push(`${id} price ${index} displayAmount is required`);
    });
    if (!VALID_STATUSES.has(plan.status)) errors.push(`${id} status is invalid`);
    if (plan.status === 'retired' && !plan.replacementPlanId) errors.push(`${id} retired plan requires replacementPlanId`);
    if (plan.grandfathering.allowed && (!plan.grandfathering.owner || !plan.grandfathering.reviewDate)) {
      errors.push(`${id} grandfathering requires owner and reviewDate`);
    }
    if (!plan.planChangePolicy.upgrade || !plan.planChangePolicy.downgrade || !plan.planChangePolicy.cancel) {
      errors.push(`${id} planChangePolicy requires upgrade downgrade and cancel rules`);
    }
    if (plan.providerMappings.some(mapping => mapping.mappingStatus !== 'placeholder' || mapping.provider !== 'not_selected' || mapping.providerPlanId || mapping.providerPriceId)) {
      errors.push(`${id} provider mappings must remain placeholders`);
    }
  }

  function buildCatalogEntitlementProjection(catalog, options = {}) {
    const normalized = normalizeCommerceCatalog(catalog);
    const planId = safeString(options.planId || 'free');
    const selected = normalized.plans.find(plan => plan.planId === planId && plan.status === 'active') ||
      normalized.plans.find(plan => plan.planId === 'free') ||
      normalized.plans[0];
    const accessState = selected && selected.entitlementLevel === 'premium' ? 'premium' : 'free';
    return {
      schemaVersion: 1,
      accessState,
      featureEntitlements: selected ? selected.featureGates.slice() : [],
      source: 'commerce_catalog',
      evaluatedAt: safeString(options.evaluatedAt) || new Date().toISOString()
    };
  }

  function normalizeGrandfathering(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      allowed: input.allowed === true,
      owner: safeString(input.owner),
      reviewDate: safeString(input.reviewDate)
    };
  }

  function normalizePolicy(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      allowed: input.allowed === true,
      owner: safeString(input.owner)
    };
  }

  function normalizePlanChangePolicy(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      upgrade: safeString(input.upgrade),
      downgrade: safeString(input.downgrade),
      cancel: safeString(input.cancel)
    };
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeStringArray(value) {
    return normalizeArray(value).map(safeString).filter(Boolean);
  }

  function normalizeCurrency(value) {
    const currency = safeString(value).toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : '';
  }

  function dedupe(values) {
    return [...new Set(values)];
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_COMMERCE_CATALOG,
    buildCatalogEntitlementProjection,
    normalizeCommerceCatalog,
    validateCommerceCatalog
  };
});
