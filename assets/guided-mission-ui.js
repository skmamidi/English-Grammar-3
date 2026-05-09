(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestGuidedMissionUi = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => api.renderGuidedMissionRoute());
    } else {
      api.renderGuidedMissionRoute();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function buildGuidedMissionRouteViewModel(input = {}) {
    const catalog = input.catalog && typeof input.catalog === 'object' ? input.catalog : {};
    const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
    const missionId = safeString(input.missionId) || safeString(missions[0] && missions[0].missionId);
    const mission = missions.find(item => item.missionId === missionId) || null;
    const online = input.online !== false;

    if (!mission) {
      return {
        schemaVersion: 1,
        state: 'not_found',
        missionId,
        title: 'Mission not found',
        stateCopy: 'Choose a guided mission from the mission catalog.'
      };
    }

    const progress = normalizeProgress(input.progress, mission.missionId);
    const completedStepIds = new Set(progress.completedStepIds);
    const stepSummaries = Array.isArray(mission.stepSummaries) ? mission.stepSummaries : [];
    const requiredSteps = stepSummaries.filter(step => step.required !== false);
    const requiredComplete = requiredSteps.every(step => completedStepIds.has(step.stepId));
    const currentStep = requiredComplete
      ? null
      : requiredSteps.find(step => !completedStepIds.has(step.stepId)) || stepSummaries[0] || null;

    if (!online) {
      return Object.assign(baseMissionView(mission, progress), {
        state: 'offline',
        currentStep,
        steps: stepSummaries.map(step => decorateStep(step, completedStepIds, currentStep)),
        stateCopy: 'This mission is available offline after the catalog loads. Reconnect to refresh progress, assignments, and XP.'
      });
    }

    return Object.assign(baseMissionView(mission, progress), {
      state: requiredComplete ? 'completed' : progress.completedStepIds.length ? 'in_progress' : 'ready',
      currentStep,
      steps: stepSummaries.map(step => decorateStep(step, completedStepIds, currentStep)),
      stateCopy: requiredComplete
        ? 'Mission complete. Your verified practice evidence can now feed summaries and rewards.'
        : 'Follow the current step, then return here to continue the mission.'
    });
  }

  function renderGuidedMissionHtml(model) {
    const view = model && typeof model === 'object' ? model : buildGuidedMissionRouteViewModel();
    if (view.state === 'not_found') return stateShell(view.title, view.stateCopy);
    return `
      <section class="mission-shell" data-guided-mission="${escapeHtml(view.missionId)}" aria-labelledby="mission-title">
        <div class="mission-hero">
          <span class="quest-kicker">Guided Mission</span>
          <h1 id="mission-title">${escapeHtml(view.title)}</h1>
          <p>${escapeHtml(view.description)}</p>
          <div class="mission-meta" aria-label="Mission details">
            <span>${escapeHtml(view.domain)}</span>
            <span>Grades ${escapeHtml(view.gradeBand.min)}-${escapeHtml(view.gradeBand.max)}</span>
            <span>${escapeHtml(view.estimatedMinutes)} min</span>
          </div>
        </div>
        ${renderCurrentStep(view)}
        <ol class="mission-step-list" aria-label="Mission steps">
          ${view.steps.map(renderStep).join('')}
        </ol>
        ${renderCompletion(view)}
      </section>
    `;
  }

  function renderCurrentStep(view) {
    if (view.state === 'offline') return statePanel('Offline mission', view.stateCopy);
    if (!view.currentStep) return statePanel('Mission complete', view.stateCopy);
    return `
      <article class="mission-current-step" aria-labelledby="mission-current-title">
        <span class="quest-kicker">Current Step</span>
        <h2 id="mission-current-title">${escapeHtml(view.currentStep.title)}</h2>
        <p>${escapeHtml(view.stateCopy)}</p>
        <a class="btn btn-primary" href="${escapeHtml(view.currentStep.route.webPath)}">${escapeHtml(actionLabel(view.currentStep.type))}</a>
      </article>
    `;
  }

  function renderStep(step) {
    return `
      <li class="mission-step mission-step-${escapeHtml(step.status)}" data-mission-step="${escapeHtml(step.stepId)}">
        <div>
          <strong>${escapeHtml(step.title)}</strong>
          <span>${escapeHtml(step.type)} · ${escapeHtml(step.status)}</span>
        </div>
        <a class="btn btn-secondary" href="${escapeHtml(step.route.webPath)}">${escapeHtml(actionLabel(step.type))}</a>
      </li>
    `;
  }

  function renderCompletion(view) {
    if (view.state !== 'completed') return '';
    return `
      <article class="mission-completion-summary" aria-labelledby="mission-complete-title">
        <h2 id="mission-complete-title">Mission complete</h2>
        <p>Completed step evidence stays separate from lesson content, question payloads, and XP adjudication.</p>
      </article>
    `;
  }

  function renderCatalogUnavailable(missionId = '') {
    return stateShell('Mission catalog unavailable', `Mission ${safeString(missionId) || 'catalog'} could not load. Open a lesson or practice route directly, then try this mission again when you are online.`);
  }

  function renderGuidedMissionRoute(options = {}) {
    const document = options.document || root.document;
    if (!document) return { status: 'unavailable' };
    const rootElement = document.getElementById('mission-root');
    if (!rootElement) return { status: 'missing-root' };
    const search = root.location && root.location.search || '';
    const storage = options.storage || root.localStorage;
    const missionId = getSearchParam(search, 'missionId');

    if (!shouldStartMissionRoute({ search, storage: getStorageSnapshot(storage) })) {
      return { status: 'bypass' };
    }
    const catalog = options.catalog || root.GUIDED_MISSION_CATALOG;
    if (!catalog || !Array.isArray(catalog.missions)) {
      rootElement.innerHTML = renderCatalogUnavailable(missionId);
      return { status: 'catalog-unavailable' };
    }
    const model = buildGuidedMissionRouteViewModel({
      catalog,
      missionId,
      progress: readMissionProgress(storage, missionId),
      online: typeof root.navigator === 'undefined' ? true : root.navigator.onLine !== false
    });
    rootElement.innerHTML = renderGuidedMissionHtml(model);
    return { status: model.state, model };
  }

  function shouldStartMissionRoute({ search = '', storage = {} } = {}) {
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    if (!params.get('missionId')) return false;
    if (params.get('practice') === '1') return false;
    if (params.get('parentBrowse') === '1') return false;
    if (params.get('teacherPreview') === '1') return false;
    if (storage.grammarQuestActiveAssignmentRequest) return false;
    if (storage.grammarQuestActiveReviewRequest) return false;
    return true;
  }

  function baseMissionView(mission, progress) {
    return {
      schemaVersion: 1,
      missionId: mission.missionId,
      title: mission.title,
      description: mission.description,
      domain: mission.domain,
      gradeBand: mission.gradeBand || { min: '', max: '' },
      estimatedMinutes: mission.estimatedMinutes,
      route: mission.route,
      progress
    };
  }

  function decorateStep(step, completedStepIds, currentStep) {
    const status = completedStepIds.has(step.stepId)
      ? 'completed'
      : currentStep && currentStep.stepId === step.stepId
        ? 'current'
        : step.required === false
          ? 'optional'
          : 'upcoming';
    return {
      stepId: step.stepId,
      type: step.type,
      title: step.title,
      required: step.required !== false,
      route: step.route || { webPath: '#', params: {} },
      status
    };
  }

  function normalizeProgress(progress, missionId) {
    const input = progress && typeof progress === 'object' ? progress : {};
    return {
      missionId: safeString(input.missionId || missionId),
      completedStepIds: Array.from(new Set((Array.isArray(input.completedStepIds) ? input.completedStepIds : [])
        .map(safeString)
        .filter(Boolean)))
    };
  }

  function readMissionProgress(storage, missionId) {
    const records = readJson(storage, 'grammarQuestMissionProgress') || {};
    return records[missionId] || {};
  }

  function getStorageSnapshot(storage) {
    return {
      grammarQuestActiveAssignmentRequest: readStorage(storage, 'grammarQuestActiveAssignmentRequest'),
      grammarQuestActiveReviewRequest: readStorage(storage, 'grammarQuestActiveReviewRequest')
    };
  }

  function readJson(storage, key) {
    const raw = readStorage(storage, key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function readStorage(storage, key) {
    try {
      return storage && typeof storage.getItem === 'function' ? storage.getItem(key) || '' : storage && storage[key] || '';
    } catch (error) {
      return '';
    }
  }

  function getSearchParam(search, key) {
    return new URLSearchParams(String(search || '').replace(/^\?/, '')).get(key) || '';
  }

  function actionLabel(type) {
    if (type === 'lesson') return 'Open lesson';
    if (type === 'practice') return 'Start practice';
    if (type === 'review') return 'Open review';
    if (type === 'reflection') return 'Reflect';
    return 'Open step';
  }

  function statePanel(title, copy) {
    return `<article class="mission-current-step"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></article>`;
  }

  function stateShell(title, copy) {
    return `<section class="mission-shell" role="status"><span class="quest-kicker">Guided Mission</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></section>`;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    buildGuidedMissionRouteViewModel,
    renderCatalogUnavailable,
    renderGuidedMissionHtml,
    renderGuidedMissionRoute,
    shouldStartMissionRoute
  };
});
