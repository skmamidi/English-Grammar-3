const repositoryApi = window.GrammarQuestLearnerStateRepository;
const privacyDomain = window.GrammarQuestPrivacyPreferencesDomain;
const controls = {
  telemetryEnabled: 'privacy-telemetry-enabled',
  errorTelemetryEnabled: 'privacy-error-telemetry-enabled',
  performanceTelemetryEnabled: 'privacy-performance-telemetry-enabled',
  experimentParticipationEnabled: 'privacy-experiment-participation-enabled'
};

export function initPrivacySettings() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}

function init() {
  if (!repositoryApi || !privacyDomain || !document.getElementById('privacy-settings')) return;
    const repository = createRepository();
    const preferences = repository.getPrivacyPreferences();
    renderPreferences(preferences);
    bindParentToggle();
    document.getElementById('privacy-save').addEventListener('click', () => {
      const saved = repository.savePrivacyPreferences(readPreferences());
      renderPreferences(saved);
      setStatus('Saved');
    });
  }

function createRepository() {
    const adapter = repositoryApi.createLocalStorageLearnerStateAdapter(window.localStorage, {
      storageKey: 'grammarQuestProgress'
    });
    return repositoryApi.createLearnerStateRepository(adapter, {
      now: () => new Date().toISOString()
    });
  }

function renderPreferences(preferences) {
    const normalized = privacyDomain.normalizePrivacyPreferences(preferences);
    Object.keys(controls).forEach(key => {
      document.getElementById(controls[key]).checked = normalized[key] === true;
    });
    syncChildControls();
  }

function readPreferences() {
    return privacyDomain.normalizePrivacyPreferences({
      telemetryEnabled: document.getElementById(controls.telemetryEnabled).checked,
      errorTelemetryEnabled: document.getElementById(controls.errorTelemetryEnabled).checked,
      performanceTelemetryEnabled: document.getElementById(controls.performanceTelemetryEnabled).checked,
      experimentParticipationEnabled: document.getElementById(controls.experimentParticipationEnabled).checked,
      updatedBy: 'local-learner'
    });
  }

function bindParentToggle() {
    document.getElementById(controls.telemetryEnabled).addEventListener('change', syncChildControls);
  }

function syncChildControls() {
    const enabled = document.getElementById(controls.telemetryEnabled).checked;
    [
      controls.errorTelemetryEnabled,
      controls.performanceTelemetryEnabled,
      controls.experimentParticipationEnabled
    ].forEach(id => {
      const control = document.getElementById(id);
      control.disabled = !enabled;
      if (!enabled) control.checked = false;
    });
  }

function setStatus(message) {
    document.getElementById('privacy-status').textContent = message;
  }
