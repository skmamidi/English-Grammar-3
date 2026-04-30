(function () {
  'use strict';

  const panel = document.getElementById('adaptive-review-panel');
  const progressStore = window.GrammarQuestProgress;
  const reviewDomain = window.GrammarQuestAdaptiveReviewDomain;
  const scheduleProjection = window.GrammarQuestReviewScheduleProjection;
  const manifest = window.QUESTION_MANIFEST || {};
  const SET_ROUTES = {
    'grammar-sentence-types': 'topics/grammar/subtopics/sentence-types.html',
    'capitalization-proper-names-titles': 'topics/capitalization/subtopics/proper-names-titles.html',
    'punctuation-commas-series': 'topics/punctuation/subtopics/commas-series.html',
    'reference-skills-alphabetical-order': 'topics/reference-skills/subtopics/alphabetical-order.html',
    'reading-comprehension-main-idea-supporting-details': 'topics/reading-comprehension/subtopics/main-idea-supporting-details.html',
    'vocabulary-homophones': 'topics/vocabulary/subtopics/homophones.html'
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAdaptiveReview);
  } else {
    renderAdaptiveReview();
  }

  function renderAdaptiveReview() {
    if (!panel || !progressStore || !reviewDomain) return;
    const dueQueue = getDueReviewQueue();
    if (dueQueue && dueQueue.items.length) {
      renderReviewPanel({
        kicker: 'Spaced Review',
        title: 'Practice due review',
        body: `${dueQueue.items.length} scheduled item${dueQueue.items.length === 1 ? '' : 's'} due now.`,
        buttonId: 'start-due-review',
        buttonText: 'Practice Due Review',
        queue: dueQueue,
        items: dueQueue.items
      });
      return;
    }

    const queue = getOrCreateQueue();
    const items = queue.items.filter(item => item.status !== 'mastered' && item.status !== 'dismissed');
    if (!items.length) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }

    const firstRoute = getRouteForQueue(items);
    if (!firstRoute) return;
    renderReviewPanel({
      kicker: 'Adaptive Review',
      title: 'Review missed questions',
      body: `${items.length} focused item${items.length === 1 ? '' : 's'} ready from recent misses and skill evidence.`,
      buttonId: 'start-adaptive-review',
      buttonText: 'Start Review',
      queue,
      items
    });
  }

  function renderReviewPanel(options) {
    const firstRoute = getRouteForQueue(options.items);
    if (!firstRoute) return;
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div>
        <div class="quest-kicker">${escapeHtml(options.kicker)}</div>
        <h2>${escapeHtml(options.title)}</h2>
        <p>${escapeHtml(options.body)}</p>
      </div>
      <button class="btn btn-primary" type="button" id="${escapeHtml(options.buttonId)}">${escapeHtml(options.buttonText)}</button>
    `;
    const button = document.getElementById(options.buttonId);
    if (button) button.addEventListener('click', () => startReview(options.queue, options.items, firstRoute));
  }

  function getDueReviewQueue() {
    if (!scheduleProjection || typeof scheduleProjection.projectDueReview !== 'function') return null;
    const progress = progressStore.getProgress();
    const projection = scheduleProjection.projectDueReview({
      schedules: progress.reviewSchedules,
      mastery: progress.mastery,
      now: new Date().toISOString()
    });
    if (!projection.dueQuestionRefs.length) return null;
    const schedules = Array.isArray(progress.reviewSchedules) ? progress.reviewSchedules : [];
    const items = projection.dueQuestionRefs.slice(0, 5).map((ref, index) => {
      const schedule = schedules.find(item => item && item.ref && item.ref.id === ref.id) || {};
      return {
        id: `due-review-${ref.id}`,
        questionRef: ref,
        setId: ref.sourceSet,
        skillIds: Array.isArray(schedule.skillIds) ? schedule.skillIds : [],
        reason: 'due_for_review',
        priority: 90 - index,
        dueAt: schedule.dueAt || '',
        status: 'queued',
        seenAt: '',
        masteredAt: ''
      };
    });
    return reviewDomain.normalizeReviewQueue({
      queueId: `spaced-review-${new Date().toISOString().slice(0, 10)}`,
      generatedAt: new Date().toISOString(),
      items
    });
  }

  function getOrCreateQueue() {
    const progress = progressStore.getProgress();
    const existing = progressStore.getReviewQueue && progressStore.getReviewQueue();
    const currentItems = existing && Array.isArray(existing.items)
      ? existing.items.filter(item => item.status !== 'mastered' && item.status !== 'dismissed')
      : [];
    if (currentItems.length) return existing;

    const queue = reviewDomain.buildReviewQueue({
      sessions: progress.reports && progress.reports.sessions,
      mastery: progress.mastery,
      manifest,
      now: new Date().toISOString(),
      maxItems: 5
    });
    if (queue.items.length && progressStore.saveReviewQueue) {
      progressStore.saveReviewQueue(queue, { sync: false });
      dispatchReviewEvent('grammarquest:review-queue-generated', {
        queueId: queue.queueId,
        itemCount: queue.items.length,
        source: 'review'
      });
    }
    return queue;
  }

  function startReview(queue, items, route) {
    const requestQueue = Object.assign({}, queue, {
      items: items.slice(0, 5)
    });
    try {
      localStorage.setItem('grammarQuestActiveReviewRequest', JSON.stringify({
        queueId: queue.queueId,
        count: requestQueue.items.length,
        queue: requestQueue
      }));
    } catch (error) {}
    window.location.href = route;
  }

  function getRouteForQueue(items) {
    return items
      .map(item => item && item.questionRef && item.questionRef.sourceSet)
      .map(setId => SET_ROUTES[setId])
      .find(Boolean);
  }

  function dispatchReviewEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (error) {}
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
  }
})();
