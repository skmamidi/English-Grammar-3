(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;
  const config = window.GRAMMAR_QUEST_CONFIG || {};
  if (config.disableServiceWorker || config.serviceWorker === false) return;

  const sourceHash = window.QUESTION_MANIFEST && window.QUESTION_MANIFEST.artifact
    ? window.QUESTION_MANIFEST.artifact.sourceHash
    : 'dev';
  const workerUrl = `/sw.js?sourceHash=${encodeURIComponent(sourceHash || 'dev')}`;

  window.addEventListener('load', () => {
    reportStorageEstimate();
    navigator.serviceWorker.addEventListener('message', event => {
      const data = event && event.data || {};
      if (data.type !== 'GRAMMAR_QUEST_CACHE_STATUS') return;
      if (data.status === 'quota_exceeded') window.GRAMMAR_QUEST_CACHE_QUOTA_EXCEEDED = true;
      window.dispatchEvent(new CustomEvent('grammarquest:offline-cache-cleanup', { detail: data }));
    });
    navigator.serviceWorker.register(workerUrl, { scope: '/' }).catch(error => {
      console.warn('Grammar Quest service worker registration failed.', error);
      renderServiceWorkerFallback();
      dispatchRegistrationFailure();
    });
  });

  async function reportStorageEstimate() {
    if (!navigator.storage || typeof navigator.storage.estimate !== 'function') return;
    try {
      const estimate = await navigator.storage.estimate();
      window.dispatchEvent(new CustomEvent('grammarquest:storage-estimate', {
        detail: {
          usage: Number(estimate && estimate.usage) || 0,
          quota: Number(estimate && estimate.quota) || 0
        }
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('grammarquest:storage-estimate', {
        detail: { unavailable: true }
      }));
    }
  }

  function renderServiceWorkerFallback() {
    if (!document || !document.body || document.querySelector('[data-progressive-enhancement="service-worker-registration"]')) return;
    const banner = document.createElement('div');
    banner.className = 'shell-banner shell-banner-error';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('data-progressive-enhancement', 'service-worker-registration');
    banner.textContent = 'Offline support is unavailable. Online practice can continue.';
    document.body.insertBefore(banner, document.body.firstChild);
  }

  function dispatchRegistrationFailure() {
    if (!window.dispatchEvent || typeof CustomEvent !== 'function') return;
    try {
      window.dispatchEvent(new CustomEvent('grammarquest:progressive-enhancement-failure', {
        detail: {
          feature: 'service-worker-registration',
          fatal: false,
          code: 'optional_feature_unavailable'
        }
      }));
    } catch (error) {}
  }
})();
