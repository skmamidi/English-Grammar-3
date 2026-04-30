(function () {
  'use strict';

  let pendingEnvelope = null;

  document.addEventListener('DOMContentLoaded', () => {
    const repositoryApi = window.GrammarQuestLearnerStateRepository;
    const service = window.GrammarQuestLearnerProgressTransferService;
    if (!repositoryApi || !service) return;
    const repository = repositoryApi.createLearnerStateRepository(repositoryApi.createLocalStorageLearnerStateAdapter(window.localStorage));
    const exportButton = document.getElementById('export-progress');
    const fileInput = document.getElementById('import-progress-file');
    const applyButton = document.getElementById('apply-import');
    const policy = document.getElementById('import-policy');

    if (exportButton) exportButton.addEventListener('click', () => {
      const envelope = service.exportLearnerProgress(repository, 'current-learner');
      renderPreview({ exported: true, counts: { sessions: envelope.data.sessions.length, reports: envelope.data.questionReports.length } });
    });

    if (fileInput) fileInput.addEventListener('change', async () => {
      pendingEnvelope = null;
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        pendingEnvelope = JSON.parse(await file.text());
        const preview = service.previewProgressImport(pendingEnvelope, repository.getProgress());
        renderPreview(preview);
        if (applyButton) applyButton.disabled = !preview.valid;
      } catch (error) {
        renderPreview({ valid: false, warnings: ['invalid_json'], conflicts: [], counts: {} });
      }
    });

    if (applyButton) applyButton.addEventListener('click', () => {
      if (!pendingEnvelope) return;
      const next = service.applyProgressImport(pendingEnvelope, repository.getProgress(), { policy: policy && policy.value || 'skip' });
      repository.saveProgress(next);
      renderPreview({ applied: true, counts: { sessions: next.reports.sessions.length, reports: next.reports.questionReports.length } });
      applyButton.disabled = true;
    });
  });

  function renderPreview(value) {
    const preview = document.getElementById('import-preview');
    if (preview) preview.textContent = JSON.stringify(value, null, 2);
  }
})();
