import { initPrivacySettings } from './privacy-settings-ui.js';

const boundary = window.GrammarQuestModuleBoundary || {
  loadedEntries: []
};
window.GrammarQuestModuleBoundary = boundary;

if (document.getElementById('privacy-settings')) {
  if (window.GrammarQuestPageShell && typeof window.GrammarQuestPageShell.initializePageShell === 'function') {
    await window.GrammarQuestPageShell.initializePageShell({
      document,
      window,
      pageId: 'settings',
      serviceWorkerConfig: {
        enabled: !(window.GRAMMAR_QUEST_CONFIG && window.GRAMMAR_QUEST_CONFIG.disableServiceWorker)
      }
    });
  }
  initPrivacySettings();
  boundary.settingsLoaded = true;
  boundary.loadedEntries.push('privacy-settings');
}
