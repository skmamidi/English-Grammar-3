(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initQuestionReportTriage);

  function initQuestionReportTriage() {
    const root = document.getElementById('question-report-triage-root');
    const filter = document.getElementById('report-status-filter');
    if (!root || !window.GrammarQuestLearnerStateRepository) return;
    const repository = window.GrammarQuestLearnerStateRepository.createLearnerStateRepository(
      window.GrammarQuestLearnerStateRepository.createLocalStorageLearnerStateAdapter(window.localStorage)
    );
    const render = () => renderReports(root, repository.listQuestionReports({ status: filter && filter.value }));
    if (filter) filter.addEventListener('change', render);
    render();
  }

  function renderReports(root, reports) {
    if (!reports.length) {
      root.innerHTML = '<p class="empty-report">No question reports match this filter.</p>';
      return;
    }
    root.innerHTML = reports.map(report => `
      <article class="student-report-card">
        <h2>${escapeHtml(report.id)}</h2>
        <dl class="report-meta">
          <dt>Status</dt><dd>${escapeHtml(report.status)}</dd>
          <dt>Category</dt><dd>${escapeHtml(report.category)}</dd>
          <dt>Priority</dt><dd>${escapeHtml(report.priority)}</dd>
          <dt>Question</dt><dd>${escapeHtml(report.questionIdentity.questionId)}</dd>
          <dt>Source</dt><dd>${escapeHtml(report.questionIdentity.sourceSet)}</dd>
          <dt>Assigned</dt><dd>${escapeHtml(report.triage.assignedTo || 'Unassigned')}</dd>
        </dl>
      </article>`).join('');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }
})();
