(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestControlComponents = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function renderActionButton(options = {}) {
    const label = safeText(options.label || 'Action');
    const event = safeToken(options.event);
    const variant = safeToken(options.variant || 'secondary');
    const icon = safeToken(options.icon || 'arrow-right');
    const disabled = options.disabled === true ? ' disabled aria-disabled="true"' : '';
    const eventAttr = event ? ` data-event="${event}"` : '';
    return `<button type="button" class="component-action-button component-action-button-${variant} focus-ring" data-min-target="44" data-focus-visible="true" data-icon="${icon}" aria-label="${escapeHtml(label)}"${eventAttr}${disabled}><span aria-hidden="true">${escapeHtml(iconLabel(icon))}</span><span>${escapeHtml(label)}</span></button>`;
  }

  function renderFilterField(options = {}) {
    const label = safeText(options.label || 'Filter');
    const name = safeToken(options.name || 'filter');
    const value = safeToken(options.value);
    const optionsHtml = normalizeOptions(options.options).map(item => {
      const selected = item.value === value ? ' selected' : '';
      return `<option value="${escapeHtml(item.value)}"${selected}>${escapeHtml(item.label)}</option>`;
    }).join('');
    return `<label class="component-filter-field"><span>${escapeHtml(label)}</span><select name="${name}" aria-label="${escapeHtml(label)}" data-min-target="44" class="focus-ring">${optionsHtml}</select></label>`;
  }

  function renderSegmentedControl(options = {}) {
    const label = safeText(options.label || 'View');
    const name = safeToken(options.name || 'segment');
    const selected = safeToken(options.selected);
    const buttons = normalizeOptions(options.options).map(item => {
      const pressed = item.value === selected ? 'true' : 'false';
      return `<button type="button" class="component-segment focus-ring" data-min-target="44" data-focus-visible="true" data-segment-name="${name}" aria-pressed="${pressed}" aria-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>`;
    }).join('');
    return `<div class="component-segmented-control" role="group" aria-label="${escapeHtml(label)}">${buttons}</div>`;
  }

  function renderDashboardListRow(options = {}) {
    const label = safeText(options.label || 'Dashboard item');
    const value = safeText(options.value || 'No data yet');
    const meta = safeText(options.meta);
    const status = safeToken(options.status || 'neutral');
    const event = safeToken(options.event);
    const eventAttr = event ? ` data-event="${event}"` : '';
    const metaHtml = meta ? `<small>${escapeHtml(meta)}</small>` : '';
    return `<article class="component-dashboard-row component-dashboard-row-${status}" role="listitem" aria-label="${escapeHtml(`${label} ${status}`)}"${eventAttr}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${metaHtml}</article>`;
  }

  function renderEmptyState(options = {}) {
    const title = safeText(options.title || 'Nothing here yet');
    const message = safeText(options.message || 'Try another option.');
    const actionLabel = safeText(options.actionLabel);
    const event = safeToken(options.event);
    const action = actionLabel
      ? `<button type="button" class="component-action-button focus-ring" data-min-target="44" data-focus-visible="true"${event ? ` data-event="${event}"` : ''}>${escapeHtml(actionLabel)}</button>`
      : '';
    return `<section class="component-empty-state" role="status" aria-label="${escapeHtml(title)}"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>${action}</section>`;
  }

  function renderDialogShell(options = {}) {
    const title = safeText(options.title || 'Dialog');
    const body = safeText(options.body || '');
    const closeLabel = safeText(options.closeLabel || 'Close');
    return `<div class="component-dialog-shell" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p><button type="button" class="focus-ring" data-min-target="44" data-focus-visible="true" aria-label="${escapeHtml(closeLabel)}">${escapeHtml(closeLabel)}</button></div>`;
  }

  function normalizeOptions(values) {
    const list = Array.isArray(values) ? values : [];
    return list.map(item => ({
      value: safeToken(item && item.value),
      label: safeText(item && item.label)
    })).filter(item => item.value && item.label);
  }

  function iconLabel(icon) {
    const labels = {
      save: 'Save',
      search: 'Search',
      filter: 'Filter',
      close: 'Close'
    };
    return labels[icon] || '';
  }

  function safeText(value) {
    return String(value || '')
      .replace(/\b(learnerId|studentId|token|authToken|prompt|choices|answer|explanation|stack)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
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
    renderActionButton,
    renderDashboardListRow,
    renderDialogShell,
    renderEmptyState,
    renderFilterField,
    renderSegmentedControl
  };
});
