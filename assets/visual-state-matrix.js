(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestVisualStateMatrix = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_VISUAL_FLOWS = Object.freeze([
    'quiz',
    'discovery',
    'story-lesson',
    'reports',
    'dashboard',
    'subscription',
    'offline',
    'settings',
    'operations'
  ]);
  const REQUIRED_VISUAL_STATES = Object.freeze([
    'loading',
    'empty',
    'error',
    'offline',
    'disabled',
    'lesson-loaded',
    'guided-check-feedback',
    'reduced-motion',
    'parent-preview',
    'teacher-view',
    'guardian-view',
    'admin-view'
  ]);

  const DEFAULT_VISUAL_STATE_MATRIX = Object.freeze({
    schemaVersion: 1,
    entries: Object.freeze([
      entry({
        id: 'quiz-loading-start',
        flow: 'quiz',
        state: 'loading',
        route: 'topics/grammar/subtopics/sentence-types.html',
        visualCase: 'subtopic-start',
        selectors: ['.app-header', '#start-btn', '#quiz-root']
      }),
      entry({
        id: 'quiz-question',
        flow: 'quiz',
        state: 'active',
        route: 'topics/grammar/subtopics/sentence-types.html',
        visualCase: 'quiz-question',
        selectors: ['.app-header', '#quiz-root', '.question-box']
      }),
      entry({
        id: 'quiz-error-offline-unavailable',
        flow: 'quiz',
        state: 'error',
        route: 'topics/grammar/subtopics/run-on-sentences.html',
        visualCase: 'offline-unavailable',
        selectors: ['.app-header', '#quiz-root']
      }),
      entry({
        id: 'quiz-parent-preview',
        flow: 'quiz',
        state: 'parent-preview',
        route: 'topics/capitalization/subtopics/proper-names-titles.html?parentBrowse=1',
        visualCase: 'parent-preview',
        selectors: ['.app-header', '#quiz-root', '#start-btn']
      }),
      entry({
        id: 'discovery-empty-search',
        flow: 'discovery',
        state: 'empty',
        route: 'discovery.html',
        nonVisualReason: 'Deterministic component and unit contracts cover empty discovery copy; full visual state would duplicate smoke coverage.'
      }),
      entry({
        id: 'story-lesson-loaded',
        flow: 'story-lesson',
        state: 'lesson-loaded',
        route: 'topics/grammar/subtopics/sentence-types.html',
        nonVisualReason: 'UI smoke, accessibility, and lesson QA coverage assert deterministic story lesson load, grade selector, related links, and quiz handoff without a duplicate screenshot.'
      }),
      entry({
        id: 'story-lesson-guided-check-feedback',
        flow: 'story-lesson',
        state: 'guided-check-feedback',
        route: 'topics/grammar/subtopics/sentence-types.html',
        nonVisualReason: 'UI smoke and accessibility coverage exercise guided check reveal behavior more deterministically than a screenshot baseline.'
      }),
      entry({
        id: 'story-lesson-reduced-motion',
        flow: 'story-lesson',
        state: 'reduced-motion',
        route: 'topics/grammar/subtopics/sentence-types.html',
        nonVisualReason: 'Accessibility preferences coverage verifies reduced-motion story lesson interactions and handoff timing without adding high-churn visual baselines.'
      }),
      entry({
        id: 'reports-empty',
        flow: 'reports',
        state: 'empty',
        route: 'reports.html',
        visualCase: 'reports',
        selectors: ['.app-header', '.card']
      }),
      entry({
        id: 'dashboard-guardian-goals',
        flow: 'dashboard',
        state: 'guardian-view',
        route: 'guardian-dashboard.html',
        visualCase: 'guardian-goals',
        selectors: ['.app-header', '.goal-dashboard-card', '.goal-dashboard-summary']
      }),
      entry({
        id: 'dashboard-teacher-view',
        flow: 'dashboard',
        state: 'teacher-view',
        route: 'teacher-dashboard.html',
        nonVisualReason: 'UI smoke and dashboard unit contracts cover deterministic teacher aggregates without adding a duplicate dashboard baseline.'
      }),
      entry({
        id: 'subscription-route',
        flow: 'subscription',
        state: 'disabled',
        route: 'subscription.html',
        nonVisualReason: 'Subscription route contract, accessibility smoke, and page-shell unit tests cover the deterministic disabled checkout state before visual billing baselines exist.'
      }),
      entry({
        id: 'subscription-billing-loading',
        flow: 'subscription',
        state: 'loading',
        route: 'subscription.html',
        nonVisualReason: 'Billing UX regression unit and accessibility coverage assert parent-safe loading copy, aria-live status, and free-practice availability without a high-churn baseline.'
      }),
      entry({
        id: 'subscription-billing-empty',
        flow: 'subscription',
        state: 'empty',
        route: 'subscription.html',
        nonVisualReason: 'Billing UX regression component coverage validates no-subscription and no-receipts empty states across responsive copy pressure.'
      }),
      entry({
        id: 'subscription-billing-error-recovery',
        flow: 'subscription',
        state: 'error',
        route: 'subscription.html',
        nonVisualReason: 'Billing UX regression tests cover provider unavailable, failed-payment, and delayed-webhook recovery copy more deterministically than a screenshot.'
      }),
      entry({
        id: 'subscription-checkout-method-fallbacks',
        flow: 'subscription',
        state: 'disabled',
        route: 'subscription.html',
        nonVisualReason: 'Checkout availability and billing UX unit coverage assert selected-plan preservation and fallback payment methods while checkout remains disabled.'
      }),
      entry({
        id: 'offline-unavailable',
        flow: 'offline',
        state: 'offline',
        route: 'topics/grammar/subtopics/run-on-sentences.html',
        visualCase: 'offline-unavailable',
        selectors: ['.app-header', '#quiz-root']
      }),
      entry({
        id: 'settings-disabled-controls',
        flow: 'settings',
        state: 'disabled',
        route: 'settings.html',
        visualCase: 'settings',
        selectors: ['.app-header', '#privacy-settings', '.privacy-toggle-row']
      }),
      entry({
        id: 'operations-admin-view',
        flow: 'operations',
        state: 'admin-view',
        route: 'admin-operations.html',
        nonVisualReason: 'UI smoke and access-control unit contracts cover the deterministic admin operations state without a high-churn operational baseline.'
      })
    ])
  });

  function validateVisualStateMatrix(matrix, options = {}) {
    const baselineNames = new Set(Array.isArray(options.baselineNames) ? options.baselineNames : []);
    const entries = (Array.isArray(matrix && matrix.entries) ? matrix.entries : []).map(normalizeEntry);
    const errors = [];
    const ids = new Set();

    entries.forEach(item => {
      if (!item.id) errors.push('entry id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!item.flow) errors.push(`${item.id} flow is required`);
      if (!item.state) errors.push(`${item.id} state is required`);
      if (!item.route) errors.push(`${item.id} route is required`);
      if (item.visualCase && item.nonVisualReason) errors.push(`${item.id} must use either visualCase or nonVisualReason, not both`);
      if (!item.visualCase && !item.nonVisualReason) errors.push(`${item.id} visualCase or nonVisualReason is required`);
      if (item.visualCase && baselineNames.size && !baselineNames.has(item.visualCase)) errors.push(`${item.id} visualCase ${item.visualCase} has no baseline`);
      if (item.visualCase && !item.selectors.length) errors.push(`${item.id} selectors are required for visual baseline coverage`);
    });

    const flows = new Set(entries.map(item => item.flow));
    REQUIRED_VISUAL_FLOWS.forEach(flow => {
      if (!flows.has(flow)) errors.push(`flow ${flow} is missing`);
    });
    const states = new Set(entries.map(item => item.state));
    REQUIRED_VISUAL_STATES.forEach(state => {
      if (!states.has(state)) errors.push(`state ${state} is missing`);
    });

    return {
      valid: errors.length === 0,
      errors,
      matrix: {
        schemaVersion: 1,
        entries
      }
    };
  }

  function entry(input) {
    return Object.freeze(Object.assign({}, input, {
      selectors: Object.freeze((input.selectors || []).slice())
    }));
  }

  function normalizeEntry(entry) {
    const input = entry && typeof entry === 'object' ? entry : {};
    return {
      id: safeString(input.id),
      flow: safeString(input.flow),
      state: safeString(input.state),
      route: safeString(input.route),
      visualCase: safeString(input.visualCase),
      nonVisualReason: safeString(input.nonVisualReason),
      selectors: normalizeStringArray(input.selectors)
    };
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_VISUAL_STATE_MATRIX,
    REQUIRED_VISUAL_FLOWS,
    REQUIRED_VISUAL_STATES,
    validateVisualStateMatrix
  };
});
