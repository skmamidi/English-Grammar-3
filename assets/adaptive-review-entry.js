(function () {
  'use strict';

  const panel = document.getElementById('adaptive-review-panel');
  const progressStore = window.GrammarQuestProgress;
  const reviewDomain = window.GrammarQuestAdaptiveReviewDomain;
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
    const queue = getOrCreateQueue();
    const items = queue.items.filter(item => item.status !== 'mastered' && item.status !== 'dismissed');
    if (!items.length) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }

    const firstRoute = getRouteForQueue(items);
    if (!firstRoute) return;
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div>
        <div class="quest-kicker">Adaptive Review</div>
        <h2>Review missed questions</h2>
        <p>${items.length} focused item${items.length === 1 ? '' : 's'} ready from recent misses and skill evidence.</p>
      </div>
      <button class="btn btn-primary" type="button" id="start-adaptive-review">Start Review</button>
    `;
    const button = document.getElementById('start-adaptive-review');
    if (button) button.addEventListener('click', () => startReview(queue, items, firstRoute));
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
})();
