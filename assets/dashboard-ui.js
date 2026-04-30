(function () {
  'use strict';

  const roleView = document.body && document.body.dataset.dashboardRole || 'parent_guardian';
  document.addEventListener('DOMContentLoaded', renderDashboard);

  function renderDashboard() {
    const root = document.getElementById('learning-dashboard-root');
    if (!root) return;
    const repositoryApi = window.GrammarQuestLearnerStateRepository;
    const projectionApi = window.GrammarQuestLearningDashboardDomain;
    const access = window.GrammarQuestAccessControl;
    if (!repositoryApi || !projectionApi || !access) {
      root.innerHTML = '<p class="empty-report">Dashboard tools are unavailable.</p>';
      return;
    }

    const learnerIds = getAuthorizedLearnerIds(roleView);
    if (!learnerIds.length) {
      root.innerHTML = '<p class="empty-report">No authorized learner dashboards are available.</p>';
      return;
    }

    const repository = repositoryApi.createLearnerStateRepository(
      repositoryApi.createLocalStorageLearnerStateAdapter(window.localStorage)
    );
    const selector = document.getElementById('learner-selector');
    if (selector) {
      selector.innerHTML = learnerIds.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('');
      selector.addEventListener('change', () => renderProjection(root, repository, projectionApi, selector.value));
      renderProjection(root, repository, projectionApi, selector.value || learnerIds[0]);
    } else {
      renderProjection(root, repository, projectionApi, learnerIds[0]);
    }
  }

  function renderProjection(root, repository, projectionApi, learnerId) {
    const source = repository.getLearnerDashboardSource(learnerId);
    const recommendations = buildRecommendations(source);
    const projection = projectionApi.buildLearningDashboardProjection(Object.assign({}, source, {
      recommendations,
      roleView,
      now: new Date().toISOString()
    }));
    root.innerHTML = `
      <section class="report-kpis" aria-label="Learner summary">
        ${kpi('Practice', projection.summary.recentPracticeCount)}
        ${kpi('Accuracy', `${Math.round(projection.summary.accuracy * 100)}%`)}
        ${kpi('Assignments', projection.summary.activeAssignmentCount)}
        ${kpi('Due review', projection.summary.dueReviewCount)}
        ${kpi('Goals met', typeof projection.summary.goalMetCount === 'number' ? projection.summary.goalMetCount : 0)}
        ${kpi('Open reports', projection.summary.openQuestionReportCount)}
      </section>
      <section class="reports-board dashboard-grid" aria-label="Learning dashboard cards">
        ${card('Goals', projection.goalHighlights, item => `${escapeHtml(item.label)} <span>${escapeHtml(item.current)} / ${escapeHtml(item.target)}${item.met ? ' met' : ''}</span>`)}
        ${card('Skill priorities', projection.skillHighlights, item => `${escapeHtml(item.label)} <span>${escapeHtml(item.message)}</span>`)}
        ${card('Assignments', projection.assignmentHighlights, item => `${escapeHtml(item.title)} <span>${escapeHtml(item.status)}</span>`)}
        ${card('Review queue', projection.reviewHighlights, item => `${escapeHtml(item.questionRef.id)} <span>${escapeHtml(item.reason || 'due')}</span>`)}
        ${card('Question reports', projection.questionReportHighlights, item => `${escapeHtml(item.reportId)} <span>${escapeHtml(item.status)}</span>`)}
        ${card('Recommended next', projection.recommendationHighlights, item => `${escapeHtml(item.skillId)} <span>${escapeHtml(item.reasonLabel)}</span>`)}
      </section>`;
  }

  function buildRecommendations(source) {
    const api = window.GrammarQuestWeakSkillRecommendationDomain;
    if (!api || typeof api.generateWeakSkillRecommendations !== 'function') return [];
    const result = api.generateWeakSkillRecommendations({
      recentSessions: source.sessions,
      assignmentSummaries: source.assignments,
      reviewSchedule: source.reviewSchedules,
      reviewQueue: source.reviewQueue,
      taxonomy: window.GrammarQuestSkillTaxonomy || {},
      now: new Date().toISOString()
    });
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('grammarquest:weak-skill-recommendations-generated', {
        detail: {
          recommendationCount: result.recommendations.length,
          reasonCode: result.recommendations[0] && result.recommendations[0].reasonCode,
          skillId: result.recommendations[0] && result.recommendations[0].skillId,
          targetType: result.recommendations[0] && result.recommendations[0].target && result.recommendations[0].target.type
        }
      }));
    }
    return result.recommendations;
  }

  function getAuthorizedLearnerIds(view) {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('learnerId') || 'current-learner';
    const auth = window.GrammarQuestAuth && window.GrammarQuestAuth.getState ? window.GrammarQuestAuth.getState() : {};
    if (view === 'teacher') {
      const assigned = Array.isArray(auth.assignedLearnerIds) ? auth.assignedLearnerIds : ['current-learner'];
      return assigned.includes(requested) ? [requested].concat(assigned.filter(id => id !== requested)) : assigned;
    }
    const linked = Array.isArray(auth.linkedLearnerIds) ? auth.linkedLearnerIds : ['current-learner'];
    return linked.includes(requested) ? [requested].concat(linked.filter(id => id !== requested)) : linked;
  }

  function kpi(label, value) {
    return `<article class="report-kpi"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`;
  }

  function card(title, items, renderItem) {
    const rows = items.length
      ? items.map(item => `<li>${renderItem(item)}</li>`).join('')
      : '<li>No current items</li>';
    return `<article class="student-report-card"><h2>${escapeHtml(title)}</h2><ul class="dashboard-list">${rows}</ul></article>`;
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
