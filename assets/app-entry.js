import { initPrivacySettings } from './privacy-settings-ui.js';

const boundary = window.GrammarQuestModuleBoundary || {
  loadedEntries: []
};
window.GrammarQuestModuleBoundary = boundary;

if (document.getElementById('privacy-settings')) {
  initPrivacySettings();
  boundary.settingsLoaded = true;
  boundary.loadedEntries.push('privacy-settings');
}
