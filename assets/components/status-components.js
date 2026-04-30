(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestStatusComponents = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function renderOfflineBanner(options = {}) {
    const state = safeToken(options.state || 'hidden');
    const hidden = state === 'hidden' ? ' hidden' : '';
    const retryEvent = safeToken(options.retryEvent);
    const message = state === 'loading'
      ? 'Checking connection'
      : state === 'offline'
        ? 'Some features may be unavailable offline.'
        : state === 'error'
          ? 'Offline support is unavailable.'
          : '';
    const retry = retryEvent
      ? `<button type="button" data-event="${retryEvent}">Retry</button>`
      : '';
    const label = state === 'error' ? `Connection issue. ${message}` : message;
    return `<div class="shell-banner shell-banner-${state}${hidden}" data-shell-offline-banner role="status" aria-live="polite">${escapeHtml(label)}${retry}</div>`;
  }

  function renderDashboardSummaryCard(options = {}) {
    const label = safeText(options.label || 'Summary');
    const value = safeText(options.value) || 'No data yet';
    const disabled = options.disabled === true ? ' aria-disabled="true"' : '';
    return `<article class="dashboard-summary-card"${disabled}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
  }

  function renderQuestionReportStatusPill(options = {}) {
    const status = safeToken(options.status || 'open') || 'open';
    const label = status.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    return `<span class="question-report-status status-${status}" role="status" aria-label="Question report status ${escapeHtml(status)}">${escapeHtml(label)}</span>`;
  }

  function safeText(value) {
    return String(value || '').trim().slice(0, 120);
  }

  function safeToken(value) {
    return safeText(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    renderDashboardSummaryCard,
    renderOfflineBanner,
    renderQuestionReportStatusPill
  };
});
