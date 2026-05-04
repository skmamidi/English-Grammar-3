(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestUiCopyPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_COPY_CATEGORIES = Object.freeze([
    'learner_control',
    'learner_empty_state',
    'learner_error',
    'guardian_dashboard',
    'teacher_dashboard',
    'operator_status',
    'billing_material_terms',
    'billing_renewal_disclosure',
    'billing_cancellation',
    'billing_refund',
    'billing_one_time_access',
    'billing_failed_payment'
  ]);
  const RAW_DIAGNOSTIC_PATTERN = /\b(TypeError|ReferenceError|SyntaxError|stack trace|undefined|null pointer|exception|at\s+\w+\s*\()/i;
  const PRIVATE_DATA_PATTERN = /\b(token|secret|password|private key|credential|learnerId|studentId|email|prompt|answer choices|explanation)=?/i;

  const DEFAULT_UI_COPY_POLICY = Object.freeze({
    locale: 'en-US',
    categories: Object.freeze([
      category('learner_control', 'Learner controls', 'learner', 28),
      category('learner_empty_state', 'Learner empty states', 'learner', 120),
      category('learner_error', 'Learner errors', 'learner', 140),
      category('guardian_dashboard', 'Guardian dashboard', 'guardian', 140),
      category('teacher_dashboard', 'Teacher dashboard', 'teacher', 140),
      category('operator_status', 'Operator status', 'operator', 160),
      category('billing_material_terms', 'Billing material terms', 'guardian', 180),
      category('billing_renewal_disclosure', 'Billing renewal disclosure', 'guardian', 180),
      category('billing_cancellation', 'Billing cancellation', 'guardian', 180),
      category('billing_refund', 'Billing refund', 'guardian', 180),
      category('billing_one_time_access', 'Billing one-time access', 'guardian', 180),
      category('billing_failed_payment', 'Billing failed payment', 'guardian', 180)
    ]),
    entries: Object.freeze([
      entry('quiz.start', 'learner_control', 'quiz', 'learner', 'Start practice', 'learning-experience', 28),
      entry('quiz.empty', 'learner_empty_state', 'quiz', 'learner', 'Practice is not ready yet. Choose another topic or try again in a moment.', 'learning-experience', 120),
      entry('quiz.offline', 'learner_error', 'quiz', 'learner', 'This quiz needs a connection before it can load. Reconnect, then try again.', 'platform', 140),
      entry('guardian.summary.empty', 'guardian_dashboard', 'guardian-dashboard', 'guardian', 'No saved progress in this area yet.', 'family-experience', 140),
      entry('teacher.assignment.empty', 'teacher_dashboard', 'assignments', 'teacher', 'No assignments are ready for this class yet.', 'classroom-experience', 140),
      entry('operations.cache.warning', 'operator_status', 'admin-operations', 'operator', 'Service worker cache metadata needs review before release.', 'platform', 160),
      entry('billing.terms.summary', 'billing_material_terms', 'subscription', 'guardian', 'Review the plan, price, renewal, cancellation, and access terms before continuing.', 'commerce-platform', 180),
      entry('billing.renewal.notice', 'billing_renewal_disclosure', 'subscription', 'guardian', 'This subscription renews automatically until you cancel.', 'commerce-platform', 180),
      entry('billing.cancel.notice', 'billing_cancellation', 'subscription', 'guardian', 'You can cancel from account settings before the next renewal.', 'commerce-platform', 180),
      entry('billing.refund.help', 'billing_refund', 'subscription', 'guardian', 'Refund requests go through billing support and depend on the approved policy.', 'commerce-platform', 180),
      entry('billing.onetime.window', 'billing_one_time_access', 'subscription', 'guardian', 'One-time access lasts for the shown dates and does not renew automatically.', 'commerce-platform', 180),
      entry('billing.payment.retry', 'billing_failed_payment', 'subscription', 'guardian', 'Update payment details to keep paid access active.', 'commerce-platform', 180)
    ])
  });

  function validateUiCopyPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const categories = (Array.isArray(input.categories) ? input.categories : []).map(normalizeCategory);
    const entries = (Array.isArray(input.entries) ? input.entries : []).map(normalizeEntry);
    const errors = [];
    const categoryIds = new Set();

    categories.forEach(item => {
      if (!item.id) errors.push('copy category id is required');
      if (categoryIds.has(item.id)) errors.push(`${item.id} category id must be unique`);
      categoryIds.add(item.id);
      if (!REQUIRED_COPY_CATEGORIES.includes(item.id)) errors.push(`${item.id} category is not supported`);
      if (!item.label) errors.push(`${item.id} label is required`);
      if (!item.audience) errors.push(`${item.id} audience is required`);
      if (!item.maxLength) errors.push(`${item.id} maxLength is required`);
    });

    REQUIRED_COPY_CATEGORIES.forEach(id => {
      if (!categoryIds.has(id)) errors.push(`missing required copy category ${id}`);
    });

    entries.forEach(item => {
      if (!categoryIds.has(item.category)) errors.push(`${item.key} category is not registered`);
      errors.push(...validateCopyEntry(item).errors);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        locale: safeString(input.locale || 'en-US'),
        categories,
        entries
      }
    };
  }

  function validateCopyEntry(entry) {
    const item = normalizeEntry(entry);
    const errors = [];

    if (!item.key) errors.push('copy key is required');
    if (!/^[a-z][a-z0-9.]*$/.test(item.key)) errors.push(`${item.key || 'copy'} key must be localization-ready`);
    if (!item.category) errors.push(`${item.key} category is required`);
    if (!item.surface) errors.push(`${item.key} surface is required`);
    if (!item.audience) errors.push(`${item.key} audience is required`);
    if (!item.owner) errors.push('owner is required');
    if (!item.text) errors.push(`${item.key} text is required`);
    if (item.maxLength && item.text.length > item.maxLength) errors.push(`${item.key} text exceeds maxLength ${item.maxLength}`);
    if (RAW_DIAGNOSTIC_PATTERN.test(item.text)) errors.push(`${item.key} contains raw technical diagnostics`);
    if (PRIVATE_DATA_PATTERN.test(item.text)) errors.push(`${item.key} contains unsafe private or learner data`);

    return {
      valid: errors.length === 0,
      errors,
      entry: item
    };
  }

  function buildCopyCatalog(policy) {
    const validation = validateUiCopyPolicy(policy);
    return {
      schemaVersion: 1,
      locale: validation.policy.locale,
      valid: validation.valid,
      errors: validation.errors,
      entries: validation.policy.entries.map(item => ({
        key: item.key,
        category: item.category,
        surface: item.surface,
        audience: item.audience,
        owner: item.owner,
        text: item.text,
        maxLength: item.maxLength
      }))
    };
  }

  function category(id, label, audience, maxLength) {
    return Object.freeze({ id, label, audience, maxLength });
  }

  function entry(key, category, surface, audience, text, owner, maxLength) {
    return Object.freeze({ key, category, surface, audience, text, owner, maxLength });
  }

  function normalizeCategory(item) {
    const input = item && typeof item === 'object' ? item : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label),
      audience: safeString(input.audience),
      maxLength: Number(input.maxLength) || 0
    };
  }

  function normalizeEntry(item) {
    const input = item && typeof item === 'object' ? item : {};
    return {
      key: safeString(input.key),
      category: safeString(input.category),
      surface: safeString(input.surface),
      audience: safeString(input.audience),
      owner: safeString(input.owner),
      text: safeString(input.text),
      maxLength: Number(input.maxLength) || 0
    };
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_UI_COPY_POLICY,
    REQUIRED_COPY_CATEGORIES,
    buildCopyCatalog,
    validateCopyEntry,
    validateUiCopyPolicy
  };
});
