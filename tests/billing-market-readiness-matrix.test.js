const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_BILLING_MARKET_READINESS_MATRIX,
  REQUIRED_MARKET_READINESS_FIELDS,
  buildCatalogMarketPriceReview,
  buildMarketUxRegressionFixtures,
  getWalletAvailabilityForMarket,
  sanitizeBillingMarketReadinessRecord,
  validateBillingMarketReadinessMatrix,
  validateBillingMarketReadinessRecord
} = require('../assets/billing-market-readiness-matrix');
const { DEFAULT_COMMERCE_CATALOG } = require('../assets/commerce-catalog-domain');

const repoRoot = path.resolve(__dirname, '..');

test('billing market readiness matrix covers required commerce launch fields', () => {
  assert.deepEqual(REQUIRED_MARKET_READINESS_FIELDS, [
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

  const result = validateBillingMarketReadinessMatrix(DEFAULT_BILLING_MARKET_READINESS_MATRIX);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.matrix.markets.map(row => row.market), ['US', 'CA', 'DE']);
  result.matrix.markets.forEach(row => {
    assert.ok(row.currency.match(/^[A-Z]{3}$/));
    assert.ok(row.taxOwner);
    assert.ok(row.receiptCopyKey);
    assert.ok(row.refundPolicyKey);
    assert.ok(row.evidenceOwner);
    assert.ok(row.localization.maxBillingStringLength >= 72);
    assert.ok(Array.isArray(row.launchBlockers));
  });
});

test('market rows keep wallet availability and launch blockers explicit', () => {
  const usWallets = getWalletAvailabilityForMarket(DEFAULT_BILLING_MARKET_READINESS_MATRIX, 'US');
  const deWallets = getWalletAvailabilityForMarket(DEFAULT_BILLING_MARKET_READINESS_MATRIX, 'DE');

  assert.deepEqual(Object.keys(usWallets).sort(), ['apple_pay', 'major_cards', 'paypal', 'venmo'].sort());
  assert.equal(usWallets.major_cards.status, 'preview_ready');
  assert.equal(usWallets.apple_pay.evidenceRequired, true);
  assert.equal(deWallets.venmo.status, 'not_available');
  assert.ok(deWallets.venmo.fallbackCopyKey);

  const de = DEFAULT_BILLING_MARKET_READINESS_MATRIX.markets.find(row => row.market === 'DE');
  assert.ok(de.launchBlockers.includes('localized_refund_terms_not_approved'));
  assert.ok(de.launchBlockers.includes('tax_collection_owner_not_approved'));
});

test('catalog price review ties plan currencies to market readiness without changing prices', () => {
  const review = buildCatalogMarketPriceReview(DEFAULT_COMMERCE_CATALOG, DEFAULT_BILLING_MARKET_READINESS_MATRIX);

  assert.deepEqual(review.catalogId, 'grammarquest-commerce-catalog-v1');
  assert.ok(review.rows.some(row => row.planId === 'premium_monthly' && row.market === 'US' && row.currency === 'USD'));
  assert.ok(review.rows.some(row => row.planId === 'premium_annual' && row.market === 'CA' && row.priceStatus === 'market_review_required'));
  assert.ok(review.rows.some(row => row.planId === 'premium_one_time_90_day' && row.market === 'DE' && row.priceStatus === 'market_review_required'));
  assert.equal(review.mutatesCatalogPrices, false);
});

test('localized market strings feed billing UX regression fixtures', () => {
  const fixtures = buildMarketUxRegressionFixtures(DEFAULT_BILLING_MARKET_READINESS_MATRIX);

  assert.ok(fixtures.length >= 3);
  fixtures.forEach(fixture => {
    assert.equal(fixture.scenarioId, 'mobile-long-localized-price');
    assert.ok(fixture.priceLabel.length <= fixture.maxBillingStringLength);
    assert.ok(fixture.renewalLabel.length <= fixture.maxBillingStringLength);
    assert.ok(fixture.cancellationLabel.length <= fixture.maxBillingStringLength);
    assert.equal(fixture.privacySafe, true);
  });
  assert.ok(fixtures.some(fixture => fixture.locale === 'de-DE' && /Verlangerung/.test(fixture.renewalLabel)));
});

test('market readiness validation rejects unsupported claims and unsafe payment data', () => {
  const unsafe = sanitizeBillingMarketReadinessRecord({
    market: 'ZZ',
    currency: 'US',
    launchStatus: 'production_approved',
    taxOwner: '',
    receiptCopyKey: '',
    refundPolicyKey: '',
    walletAvailability: { major_cards: { status: 'available' } },
    localization: { locale: 'en-US', maxBillingStringLength: 30 },
    launchBlockers: [],
    evidenceOwner: '',
    rawProviderPayload: { nested: true },
    paymentCredential: 'credential',
    learnerId: 'learner-1',
    token: 'unsafe'
  });

  assert.equal(unsafe.rawProviderPayload, '[REDACTED]');
  assert.equal(unsafe.paymentCredential, '[REDACTED]');
  assert.equal(unsafe.learnerId, '[REDACTED]');

  const result = validateBillingMarketReadinessRecord({
    market: 'ZZ',
    currency: 'US',
    launchStatus: 'production_approved',
    taxOwner: '',
    receiptCopyKey: '',
    refundPolicyKey: '',
    walletAvailability: { major_cards: { status: 'available' } },
    localization: { locale: 'en-US', maxBillingStringLength: 30 },
    launchBlockers: [],
    evidenceOwner: '',
    rawProviderPayload: { nested: true },
    paymentCredential: 'credential',
    learnerId: 'learner-1'
  });

  assert.ok(result.errors.includes('market must be explicitly supported'));
  assert.ok(result.errors.includes('currency must be ISO 4217'));
  assert.ok(result.errors.includes('production market claims require no blockers and approved evidence'));
  assert.ok(result.errors.includes('tax owner is required'));
  assert.ok(result.errors.includes('receipt copy key is required'));
  assert.ok(result.errors.includes('refund policy key is required'));
  assert.ok(result.errors.includes('localization length must support long billing strings'));
  assert.ok(result.errors.includes('market readiness record must not include learner identity'));
  assert.ok(result.errors.includes('market readiness record must not include provider payloads credentials tokens or secrets'));
});

test('market readiness docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-market-readiness-matrix.md'), 'utf8');
  const catalogDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'commerce-catalog.md'), 'utf8');
  const checkoutDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'checkout-method-policy.md'), 'utf8');
  const uxDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-ux-regression-matrix.md'), 'utf8');
  const complianceDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'supported markets',
    'currencies',
    'tax owner',
    'receipt copy',
    'refund policy',
    'wallet availability',
    'localization length',
    'launch blockers',
    'evidence owner'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(catalogDocs, /billing-market-readiness-matrix\.md/);
  assert.match(checkoutDocs, /billing-market-readiness-matrix\.md/);
  assert.match(uxDocs, /billing-market-readiness-matrix\.md/);
  assert.match(complianceDocs, /billing-market-readiness-matrix\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-market-readiness-matrix\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
