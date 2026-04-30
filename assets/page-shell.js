(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestPageShell = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const components = root.GrammarQuestStatusComponents ||
    (typeof require === 'function' ? require('./components/status-components') : null);

  async function initializePageShell(options = {}) {
    const document = options.document || root.document;
    const windowRef = options.window || root;
    const events = [];
    emit(document, events, 'shell:init', { pageId: options.pageId || '' });
    ensureOfflineBanner(document, 'hidden');
    const authState = await initializeAuth(options.authService || windowRef.GrammarQuestAuth, document, events);
    initializeTelemetry(options.telemetry || windowRef.GrammarQuestAppTelemetry, options.telemetryConfig || {}, authState, events);
    await initializeServiceWorker(options.serviceWorker || windowRef.navigator && windowRef.navigator.serviceWorker, options.serviceWorkerConfig || {}, document, events);
    if (document && document.documentElement) document.documentElement.dataset.pageShell = 'ready';
    emit(document, events, 'shell:ready', { pageId: options.pageId || '' });
    return { status: 'ready', authState, events };
  }

  async function initializeAuth(authService, document, events) {
    if (!authService || typeof authService.ready !== 'function') {
      emit(document, events, 'shell:auth-unavailable', {});
      return { enabled: false, signedIn: false };
    }
    try {
      const state = await authService.ready();
      emit(document, events, 'shell:auth-ready', {});
      return state || { enabled: false, signedIn: false };
    } catch (error) {
      renderError(document, 'Account state is unavailable.');
      emit(document, events, 'shell:auth-failed', {});
      return { enabled: false, signedIn: false };
    }
  }

  function initializeTelemetry(telemetry, telemetryConfig, authState, events) {
    if (!telemetry || typeof telemetry.install !== 'function') return;
    const consent = telemetryConfig.consent || authState && authState.consent || {};
    if (telemetryConfig.enabled === true && consent.telemetry === true && consent.optOut !== true) {
      telemetry.install(Object.assign({}, telemetryConfig, { consent }));
      events.push({ type: 'shell:telemetry-ready', detail: {} });
    }
  }

  async function initializeServiceWorker(serviceWorker, config, document, events) {
    if (config.enabled !== true || !serviceWorker || typeof serviceWorker.register !== 'function') return;
    try {
      await serviceWorker.register(config.url || 'sw.js');
      emit(document, events, 'shell:service-worker-ready', {});
    } catch (error) {
      ensureOfflineBanner(document, 'error');
      emit(document, events, 'shell:service-worker-failed', {});
    }
  }

  function ensureOfflineBanner(document, state) {
    if (!document || !document.body || !components) return;
    const next = components.renderOfflineBanner({ state });
    if (String(document.body.innerHTML || '').includes('data-shell-offline-banner')) {
      document.body.innerHTML = String(document.body.innerHTML || '').replace(/<div class="shell-banner[^>]*data-shell-offline-banner[\s\S]*?<\/div>/, next);
      return;
    }
    document.body.insertAdjacentHTML('afterbegin', next);
  }

  function renderError(document, message) {
    if (!document || !document.body) return;
    document.body.insertAdjacentHTML('afterbegin', `<div class="shell-banner shell-banner-error" role="alert">${escapeHtml(message)}</div>`);
  }

  function emit(document, events, type, detail) {
    const event = { type, detail: detail || {} };
    events.push(event);
    if (document && typeof document.dispatchEvent === 'function') {
      const domEvent = typeof root.CustomEvent === 'function'
        ? new root.CustomEvent(type, { detail: event.detail })
        : document.createEvent
          ? document.createEvent(type, event.detail)
          : event;
      document.dispatchEvent(domEvent);
    }
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
    initializePageShell
  };
});
