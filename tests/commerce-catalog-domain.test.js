const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const contracts = require('../assets/domain-type-contracts');
const {
  DEFAULT_COMMERCE_CATALOG,
  buildCatalogEntitlementProjection,
  normalizeCommerceCatalog,
  validateCommerceCatalog
} = require('../assets/commerce-catalog-domain');
const {
  DEFAULT_BILLING_MARKET_READINESS_MATRIX,
  buildCatalogMarketPriceReview
} = require('../assets/billing-market-readiness-matrix');

const repoRoot = path.resolve(__dirname, '..');

test('default commerce catalog defines free monthly annual one-time and retired plans', () => {
  const catalog = normalizeCommerceCatalog(DEFAULT_COMMERCE_CATALOG);
  const result = validateCommerceCatalog(catalog);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(catalog.plans.map(plan => plan.planId), [
    'free',
    'premium_monthly',
    'premium_annual',
    'premium_one_time_90_day',
    'legacy_founder_annual'
  ]);
  assert.equal(catalog.plans.find(plan => plan.planId === 'free').entitlementLevel, 'free');
  assert.equal(catalog.plans.find(plan => plan.planId === 'premium_monthly').interval, 'month');
  assert.equal(catalog.plans.find(plan => plan.planId === 'premium_annual').interval, 'year');
  assert.equal(catalog.plans.find(plan => plan.planId === 'premium_one_time_90_day').accessWindowDays, 90);
  assert.equal(catalog.plans.find(plan => plan.planId === 'legacy_founder_annual').status, 'retired');
});

test('catalog validation rejects incomplete or provider-owned product truth', () => {
  const result = validateCommerceCatalog({
    products: [{ productId: 'family', status: 'active' }],
    plans: [
      {
        planId: 'bad-monthly',
        productId: 'family',
        planType: 'subscription',
        interval: 'weekly',
        entitlementLevel: '',
        featureGates: [],
        taxCategory: '',
        prices: [{ currency: 'usdollars', displayAmount: '$9.99' }],
        providerMappings: [{ provider: 'stripe', providerPriceId: 'price_123' }],
        status: 'active'
      }
    ]
  });

  assert.ok(result.errors.includes('bad-monthly interval is invalid'));
  assert.ok(result.errors.includes('bad-monthly entitlementLevel is required'));
  assert.ok(result.errors.includes('bad-monthly featureGates are required'));
  assert.ok(result.errors.includes('bad-monthly taxCategory is required'));
  assert.ok(result.errors.includes('bad-monthly price 0 currency is invalid'));
  assert.ok(result.errors.includes('bad-monthly provider mappings must remain placeholders'));
});

test('retired and grandfathered plans require explicit replacement and constraints', () => {
  const result = validateCommerceCatalog({
    products: [{ productId: 'family', status: 'active' }],
    plans: [
      {
        planId: 'legacy',
        productId: 'family',
        planType: 'subscription',
        interval: 'year',
        entitlementLevel: 'premium',
        featureGates: ['premium_practice'],
        taxCategory: 'digital_service',
        prices: [{ currency: 'USD', priceStatus: 'placeholder', displayAmount: 'Pending approval' }],
        status: 'retired',
        grandfathering: { allowed: true },
        planChangePolicy: {}
      }
    ]
  });

  assert.ok(result.errors.includes('legacy retired plan requires replacementPlanId'));
  assert.ok(result.errors.includes('legacy grandfathering requires owner and reviewDate'));
  assert.ok(result.errors.includes('legacy planChangePolicy requires upgrade downgrade and cancel rules'));
});

test('catalog can produce provider-neutral entitlement projections', () => {
  const projection = buildCatalogEntitlementProjection(DEFAULT_COMMERCE_CATALOG, {
    planId: 'premium_annual',
    evaluatedAt: '2030-04-29T12:00:00.000Z'
  });

  assert.deepEqual(projection, {
    schemaVersion: 1,
    accessState: 'premium',
    featureEntitlements: ['core_practice', 'local_progress', 'premium_practice', 'family_dashboard'],
    source: 'commerce_catalog',
    evaluatedAt: '2030-04-29T12:00:00.000Z'
  });
  assert.deepEqual(contracts.validateEntitlementProjectionContract(projection), []);
});

test('commerce catalog feeds market price readiness review without provider configuration', () => {
  const review = buildCatalogMarketPriceReview(DEFAULT_COMMERCE_CATALOG, DEFAULT_BILLING_MARKET_READINESS_MATRIX);

  assert.equal(review.mutatesCatalogPrices, false);
  assert.ok(review.rows.some(row => row.planId === 'free' && row.market === 'US' && row.priceStatus === 'approved'));
  assert.ok(review.rows.some(row => row.planId === 'premium_monthly' && row.market === 'CA' && row.currency === 'CAD'));
  assert.ok(review.rows.every(row => !Object.hasOwn(row, 'providerPriceId')));
});

test('domain type contracts validate commerce catalog shape without provider payloads', () => {
  assert.deepEqual(contracts.validateCommerceCatalogContract(DEFAULT_COMMERCE_CATALOG), []);
  assert.ok(contracts.validateCommerceCatalogContract({
    schemaVersion: 1,
    plans: [{ planId: 'provider-owned', providerPriceId: 'price_123' }]
  }).includes('commerce_catalog_must_not_include_provider_payload'));
});

test('commerce catalog docs define ownership release and provider mapping rules', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'commerce-catalog.md'), 'utf8');
  const readiness = fs.readFileSync(path.join(repoRoot, 'docs', 'commerce-readiness-launch-gate.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'provider-neutral',
    'free access',
    'monthly subscription',
    'annual subscription',
    'one-time access',
    'premium feature gates',
    'trial',
    'promotion',
    'tax ownership',
    'currency display',
    'grandfathering',
    'plan-change',
    'native/App Store',
    'institutional pricing'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(readiness, /product catalog/i);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-catalog-domain\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
