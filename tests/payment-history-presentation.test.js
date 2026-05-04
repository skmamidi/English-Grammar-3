const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildPaymentHistoryRows,
  validatePaymentHistoryRow,
  validateReceiptOrInvoiceLink
} = require('../assets/payment-history-presentation');
const {
  normalizeBillingRecord,
  validateBillingRecord
} = require('../assets/billing-domain-contracts');

const repoRoot = path.resolve(__dirname, '..');

function record(overrides = {}) {
  return normalizeBillingRecord({
    recordType: 'payment',
    billingAccountId: 'billing-account-1',
    planId: 'premium_monthly',
    paymentId: 'payment-1',
    amountMinor: 1200,
    currency: 'USD',
    status: 'succeeded',
    paidAt: '2030-05-03T00:00:00.000Z',
    maskedPaymentMethodLabel: 'Card ending in 4242',
    receiptUrl: '/billing/receipts/payment-1',
    sourceLedgerEventId: 'ledger-payment-succeeded',
    ...overrides
  });
}

test('payment history rows expose parent-safe payment invoice refund and dispute details', () => {
  const rows = buildPaymentHistoryRows([
    record({
      recordType: 'invoice',
      invoiceId: 'invoice-1',
      invoiceStatus: 'paid',
      amountDueMinor: 1200,
      issuedAt: '2030-05-01T00:00:00.000Z',
      invoiceUrl: '/billing/invoices/invoice-1'
    }),
    record(),
    record({
      recordType: 'refund',
      refundId: 'refund-1',
      amountMinor: 1200,
      status: 'issued',
      reasonCode: 'support_approved',
      issuedAt: '2030-05-04T00:00:00.000Z'
    }),
    record({
      recordType: 'dispute',
      disputeId: 'dispute-1',
      amountMinor: 1200,
      status: 'opened',
      openedAt: '2030-05-05T00:00:00.000Z'
    })
  ]);

  assert.deepEqual(rows.map(row => row.rowType), ['dispute', 'refund', 'payment', 'invoice']);

  const payment = rows.find(row => row.rowType === 'payment');
  assert.equal(payment.date, '2030-05-03T00:00:00.000Z');
  assert.equal(payment.amountMinor, 1200);
  assert.equal(payment.amountDisplay, '$12.00');
  assert.equal(payment.currency, 'USD');
  assert.equal(payment.status, 'succeeded');
  assert.equal(payment.planId, 'premium_monthly');
  assert.equal(payment.maskedPaymentMethodLabel, 'Card ending in 4242');
  assert.equal(payment.receiptOrInvoiceLink, '/billing/receipts/payment-1');
  assert.equal(payment.refundStatus, '');
  assert.equal(payment.disputeStatus, '');
  assert.equal(payment.failedPaymentRecoveryAction, '');
  assert.deepEqual(validatePaymentHistoryRow(payment).errors, []);

  assert.equal(rows.find(row => row.rowType === 'refund').refundStatus, 'issued');
  assert.equal(rows.find(row => row.rowType === 'dispute').disputeStatus, 'opened');
  assert.deepEqual(rows.map(row => row.freePracticeAvailable), [true, true, true, true]);
});

test('failed-payment recovery rows are descriptive and server mediated', () => {
  const rows = buildPaymentHistoryRows([
    record({
      recordType: 'past_due_state',
      amountMinor: 1200,
      currency: 'USD',
      status: 'past_due',
      startedAt: '2030-05-06T00:00:00.000Z',
      retryEndsAt: '2030-05-10T00:00:00.000Z'
    })
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].rowType, 'failed_payment_recovery');
  assert.equal(rows[0].status, 'past_due');
  assert.equal(rows[0].failedPaymentRecoveryAction, 'update_payment_method_server_mediated');
  assert.match(rows[0].parentMessage, /Update payment method/i);
  assert.equal(rows[0].receiptOrInvoiceLink, '');
});

test('receipt and invoice links are browser safe and never provider dashboard links', () => {
  assert.deepEqual(validateReceiptOrInvoiceLink('/billing/receipts/payment-1').errors, []);
  assert.deepEqual(validateReceiptOrInvoiceLink('/billing/invoices/invoice-1').errors, []);

  assert.ok(validateReceiptOrInvoiceLink('https://provider.example.test/dashboard/payment-1').errors.includes('receipt or invoice link must stay on the app billing route'));
  assert.ok(validateReceiptOrInvoiceLink('javascript:alert(1)').errors.includes('receipt or invoice link must stay on the app billing route'));
});

test('payment history validation rejects card numbers wallet identifiers provider payloads and learner identity', () => {
  const result = validatePaymentHistoryRow({
    rowType: 'payment',
    date: '2030-05-03T00:00:00.000Z',
    amountMinor: 1200,
    amountDisplay: '$12.00',
    currency: 'USD',
    status: 'succeeded',
    planId: 'premium_monthly',
    maskedPaymentMethodLabel: 'Card 4242424242424242 wallet wallet_123456',
    receiptOrInvoiceLink: 'https://provider.example.test/receipt',
    refundStatus: '',
    disputeStatus: '',
    failedPaymentRecoveryAction: '',
    freePracticeAvailable: true,
    rawProviderPayload: { nested: true },
    providerPaymentId: 'provider-payment-placeholder',
    learnerId: 'learner-1',
    paymentCredential: 'credential-placeholder'
  });

  assert.ok(result.errors.includes('payment history must not include full card numbers or wallet identifiers'));
  assert.ok(result.errors.includes('receipt or invoice link must stay on the app billing route'));
  assert.ok(result.errors.includes('payment history must not include learner identity'));
  assert.ok(result.errors.includes('payment history must not include provider payload or payment credentials'));
});

test('billing records can carry masked method and app receipt links without provider leakage', () => {
  const safeRecord = record();
  assert.deepEqual(validateBillingRecord(safeRecord).errors, []);
  assert.equal(safeRecord.maskedPaymentMethodLabel, 'Card ending in 4242');
  assert.equal(safeRecord.receiptUrl, '/billing/receipts/payment-1');

  const unsafeRecord = validateBillingRecord({
    ...safeRecord,
    providerPaymentId: 'provider-payment-placeholder',
    studentName: 'Student Name'
  });
  assert.ok(unsafeRecord.errors.includes('billing record must not include provider payload'));
  assert.ok(unsafeRecord.errors.includes('billing record must not include learner identity'));
});

test('payment history docs subscription route and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'payment-history-presentation.md'), 'utf8');
  const billingDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-domain-contracts.md'), 'utf8');
  const subscription = fs.readFileSync(path.join(repoRoot, 'subscription.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'date',
    'amount',
    'currency',
    'status',
    'plan',
    'masked payment method label',
    'receipt or invoice link',
    'refund or dispute status',
    'failed-payment recovery action',
    'full card numbers',
    'wallet identifiers'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(billingDocs, /payment-history-presentation\.md/);
  assert.match(subscription, /Payment History/i);
  assert.match(subscription, /Receipts and invoices/i);
  assert.match(pkg.scripts['test:unit'], /tests\/payment-history-presentation\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
