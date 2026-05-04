(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestPaymentHistoryPresentation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const learnerIdentityPattern = /learnerId|studentId|studentName|learnerEmail|learnerProgress/i;
  const providerPattern = /provider|rawProvider|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token|payload/i;
  const fullCardOrWalletPattern = /\b\d{12,19}\b|\b(wallet|venmo|paypal)_[A-Za-z0-9_-]{6,}\b/i;

  function buildPaymentHistoryRows(records = []) {
    return (Array.isArray(records) ? records : [])
      .map(recordToRow)
      .filter(Boolean)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }

  function recordToRow(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const type = safeString(input.recordType);
    if (!['invoice', 'payment', 'refund', 'dispute', 'past_due_state'].includes(type)) return null;
    const rowType = type === 'past_due_state' ? 'failed_payment_recovery' : type;
    const link = type === 'invoice' || type === 'payment' ? safeString(input.receiptUrl || input.invoiceUrl) : '';
    return {
      schemaVersion: 1,
      rowType,
      date: dateFor(input, type),
      amountMinor: amountFor(input),
      amountDisplay: formatMoney(amountFor(input), input.currency),
      currency: safeCurrency(input.currency),
      status: safeString(input.status || input.invoiceStatus),
      planId: safeString(input.planId),
      maskedPaymentMethodLabel: safeString(input.maskedPaymentMethodLabel || 'Payment method not shown'),
      receiptOrInvoiceLink: validateReceiptOrInvoiceLink(link).valid ? link : '',
      refundStatus: type === 'refund' ? safeString(input.status) : '',
      disputeStatus: type === 'dispute' ? safeString(input.status) : '',
      failedPaymentRecoveryAction: type === 'past_due_state' ? 'update_payment_method_server_mediated' : '',
      parentMessage: type === 'past_due_state' ? 'Update payment method through the secure billing flow.' : '',
      freePracticeAvailable: true,
      sourceLedgerEventId: safeString(input.sourceLedgerEventId)
    };
  }

  function validatePaymentHistoryRow(row = {}) {
    const input = row && typeof row === 'object' ? row : {};
    const errors = [];
    if (!['invoice', 'payment', 'refund', 'dispute', 'failed_payment_recovery'].includes(safeString(input.rowType))) errors.push('rowType is invalid');
    if (!safeIso(input.date)) errors.push('date is required');
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) errors.push('amountMinor must be a non-negative integer');
    if (!safeString(input.amountDisplay)) errors.push('amount display is required');
    if (!safeCurrency(input.currency)) errors.push('currency is required');
    if (!safeString(input.status)) errors.push('status is required');
    if (!safeString(input.planId)) errors.push('planId is required');
    if (!safeString(input.maskedPaymentMethodLabel)) errors.push('masked payment method label is required');
    validateReceiptOrInvoiceLink(input.receiptOrInvoiceLink).errors.forEach(error => errors.push(error));
    if (fullCardOrWalletPattern.test(safeString(input.maskedPaymentMethodLabel))) {
      errors.push('payment history must not include full card numbers or wallet identifiers');
    }
    if (input.freePracticeAvailable !== true) errors.push('free practice must remain available');
    if (containsKey(input, learnerIdentityPattern)) errors.push('payment history must not include learner identity');
    if (containsKey(input, providerPattern)) errors.push('payment history must not include provider payload or payment credentials');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function validateReceiptOrInvoiceLink(link) {
    const value = safeString(link);
    if (!value) return { valid: true, errors: [] };
    const valid = /^\/billing\/(receipts|invoices)\/[A-Za-z0-9_-]+$/.test(value);
    return {
      valid,
      errors: valid ? [] : ['receipt or invoice link must stay on the app billing route']
    };
  }

  function dateFor(input, type) {
    if (type === 'invoice') return safeIso(input.issuedAt || input.createdAt);
    if (type === 'payment') return safeIso(input.paidAt || input.createdAt);
    if (type === 'refund') return safeIso(input.issuedAt || input.createdAt);
    if (type === 'dispute') return safeIso(input.openedAt || input.createdAt);
    if (type === 'past_due_state') return safeIso(input.startedAt || input.createdAt);
    return safeIso(input.createdAt);
  }

  function amountFor(input) {
    const amount = Number.isInteger(input.amountMinor) ? input.amountMinor : input.amountDueMinor;
    return Number.isInteger(amount) && amount >= 0 ? amount : 0;
  }

  function formatMoney(amountMinor, currency) {
    const safe = safeCurrency(currency) || 'USD';
    const amount = (Number(amountMinor) || 0) / 100;
    if (safe === 'USD') return `$${amount.toFixed(2)}`;
    return `${safe} ${amount.toFixed(2)}`;
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeCurrency(value) {
    const currency = safeString(value).toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildPaymentHistoryRows,
    validatePaymentHistoryRow,
    validateReceiptOrInvoiceLink
  };
});
