(function () {
  'use strict';

  const progressStore = window.GrammarQuestProgress;
  const assignmentDomain = window.GrammarQuestAssignmentDomain;
  const quizAdapter = window.GrammarQuestAssignmentQuizAdapter;
  const manifest = window.QUESTION_MANIFEST || {};
  const list = document.getElementById('assignment-list');

  const SET_ROUTES = {
    'grammar-sentence-types': 'topics/grammar/subtopics/sentence-types.html',
    'capitalization-proper-names-titles': 'topics/capitalization/subtopics/proper-names-titles.html',
    'punctuation-commas-series': 'topics/punctuation/subtopics/commas-series.html',
    'reference-skills-alphabetical-order': 'topics/reference-skills/subtopics/alphabetical-order.html',
    'reading-comprehension-main-idea-supporting-details': 'topics/reading-comprehension/subtopics/main-idea-supporting-details.html',
    'vocabulary-homophones': 'topics/vocabulary/subtopics/homophones.html'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAssignments);
  } else {
    renderAssignments();
  }

  function renderAssignments() {
    if (!list) return;
    const assignments = getAssignments().filter(assignment => assignment.status !== 'archived');
    if (!assignments.length) {
      list.innerHTML = `
        <div class="empty-report-card" data-assignment-empty>
          <div class="quest-kicker">All clear</div>
          <h2>No assignments yet</h2>
          <p>Assigned practice plans will appear here when a teacher or guardian creates one.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = assignments.map(renderAssignment).join('');
    list.querySelectorAll('[data-start-assignment]').forEach(button => {
      button.addEventListener('click', () => startAssignment(button.dataset.startAssignment));
    });
  }

  function getAssignments() {
    if (progressStore && typeof progressStore.listAssignments === 'function') {
      return progressStore.listAssignments();
    }
    const progress = progressStore && typeof progressStore.getProgress === 'function'
      ? progressStore.getProgress()
      : {};
    return normalizeAssignments(progress.assignments);
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : [])
      .map(assignment => assignmentDomain && typeof assignmentDomain.normalizeAssignment === 'function'
        ? assignmentDomain.normalizeAssignment(assignment)
        : assignment)
      .filter(assignment => assignment && assignment.id);
  }

  function renderAssignment(assignment) {
    const request = getAssignmentRequest(assignment);
    const setIds = request && Array.isArray(request.setIds) ? request.setIds : [];
    const route = setIds.map(setId => SET_ROUTES[setId]).find(Boolean);
    const title = escapeHtml(assignment.title || 'Practice Plan');
    const due = assignment.dueAt ? `<span>Due ${escapeHtml(formatDate(assignment.dueAt))}</span>` : '';
    const status = escapeHtml(titleCase(assignment.status || 'active'));
    const scopeLabel = setIds.length ? `${setIds.length} set${setIds.length === 1 ? '' : 's'}` : 'Targeted practice';
    const disabled = route && assignment.status !== 'completed' ? '' : 'disabled';
    const buttonLabel = assignment.status === 'completed' ? 'Completed' : assignment.status === 'in_progress' ? 'Resume' : 'Start';

    return `
      <article class="assignment-item" data-assignment-id="${escapeHtml(assignment.id)}">
        <div>
          <div class="assignment-meta">
            <span>${status}</span>
            ${due}
            <span>${escapeHtml(scopeLabel)}</span>
          </div>
          <h2>${title}</h2>
          <p>${escapeHtml(getAssignmentSummary(assignment, request, route))}</p>
        </div>
        <button class="btn btn-primary" type="button" data-start-assignment="${escapeHtml(assignment.id)}" ${disabled}>${buttonLabel}</button>
      </article>
    `;
  }

  function startAssignment(id) {
    const assignment = getAssignments().find(item => item.id === id);
    if (!assignment) return;
    const request = getAssignmentRequest(assignment);
    const setId = request && request.setIds && request.setIds[0];
    const route = SET_ROUTES[setId];
    if (!route) return;

    const started = progressStore && typeof progressStore.markAssignmentStarted === 'function'
      ? progressStore.markAssignmentStarted(id, new Date().toISOString(), { sync: true })
      : assignment;

    try {
      localStorage.setItem('grammarQuestActiveAssignmentId', id);
      localStorage.setItem('grammarQuestActiveAssignmentRequest', JSON.stringify(request));
      if (request.grade) localStorage.setItem('grammarQuestGrade', String(request.grade));
      if (request.difficulty) localStorage.setItem('grammarQuestDifficulty', String(request.difficulty));
    } catch (error) {}

    window.location.href = route;
    return started;
  }

  function getAssignmentRequest(assignment) {
    try {
      if (!quizAdapter || typeof quizAdapter.assignmentToQuizRequest !== 'function') return null;
      return quizAdapter.assignmentToQuizRequest(assignment, { manifest });
    } catch (error) {
      return null;
    }
  }

  function getAssignmentSummary(assignment, request, route) {
    if (assignment.status === 'completed') return 'This practice plan is complete and linked to its saved quiz session.';
    if (!request || !route) return 'This assignment references content that is not available in this offline build.';
    return `${request.count} questions at grade ${request.grade}, ${request.difficulty} difficulty.`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function titleCase(value) {
    return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
  }
})();
