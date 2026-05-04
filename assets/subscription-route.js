(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSubscriptionRoute = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  async function initializeSubscriptionRoute(options = {}) {
    const document = options.document || root.document;
    const pageShell = options.pageShell || root.GrammarQuestPageShell;
    if (pageShell && typeof pageShell.initializePageShell === 'function') {
      await pageShell.initializePageShell({
        document,
        window: root,
        pageId: 'subscription',
        serviceWorkerConfig: {
          enabled: !(root.GRAMMAR_QUEST_CONFIG && root.GRAMMAR_QUEST_CONFIG.disableServiceWorker)
        }
      });
    }
    const status = document && document.getElementById ? document.getElementById('subscription-route-status') : null;
    if (status) status.textContent = 'Checkout is not available yet';
    return { status: 'ready', checkoutEnabled: false };
  }

  if (root.document && root.document.documentElement && root.document.documentElement.dataset.route === 'subscription') {
    initializeSubscriptionRoute();
  }

  return {
    initializeSubscriptionRoute
  };
});
