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
    navigator.serviceWorker.register(workerUrl, { scope: '/' }).catch(error => {
      console.warn('Grammar Quest service worker registration failed.', error);
    });
  });
})();
