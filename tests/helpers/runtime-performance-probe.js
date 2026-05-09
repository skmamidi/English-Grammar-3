async function installRuntimePerformanceProbe(page) {
  await page.addInitScript(() => {
    window.__grammarQuestRuntimePerformance = {
      longTasks: [],
      longTaskSupported: false,
      installedAt: 0
    };
    try {
      window.__grammarQuestRuntimePerformance.installedAt = performance.now();
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          window.__grammarQuestRuntimePerformance.longTasks.push({
            name: entry.name || 'longtask',
            duration: Math.round(entry.duration || 0),
            startTime: Math.round(entry.startTime || 0)
          });
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
      window.__grammarQuestRuntimePerformance.longTaskSupported = true;
    } catch (error) {
      window.__grammarQuestRuntimePerformance.longTaskSupported = false;
    }
  });
}

async function collectRuntimePerformanceMetrics(page, options = {}) {
  const route = safeString(options.route);
  const flow = safeString(options.flow || route || 'runtime-flow');
  const requestSummary = options.requestSummary || {};
  const pageMetrics = await page.evaluate(() => {
    const probe = window.__grammarQuestRuntimePerformance || { longTasks: [], longTaskSupported: false };
    const navigation = performance.getEntriesByType('navigation')[0];
    const now = Math.round(performance.now());
    const heap = performance.memory && Number.isFinite(performance.memory.usedJSHeapSize)
      ? Math.round(performance.memory.usedJSHeapSize)
      : 0;
    return {
      now,
      domNodeCount: document.getElementsByTagName('*').length,
      heapUsedBytes: heap,
      navigationDuration: navigation ? Math.round(navigation.duration || 0) : now,
      longTaskSupported: probe.longTaskSupported === true,
      longTasks: Array.isArray(probe.longTasks) ? probe.longTasks.slice(0, 50) : []
    };
  });
  return normalizeRuntimePerformanceMetrics(Object.assign({}, pageMetrics, {
    route,
    flow,
    hydrationMs: options.hydrationMs || pageMetrics.navigationDuration || pageMetrics.now,
    requiredChunkBytes: requestSummary.questionChunkBytes || 0,
    sparseQuestionJsonBytes: requestSummary.sparseQuestionJsonBytes || 0,
    storedQuestionBytes: requestSummary.storedQuestionBytes || 0,
    jsonParseMs: options.jsonParseMs || 0,
    loadedChunkCount: Array.isArray(requestSummary.loadedChunks) ? requestSummary.loadedChunks.length : 0
  }));
}

function normalizeRuntimePerformanceMetrics(input = {}) {
  const longTasks = Array.isArray(input.longTasks) ? input.longTasks.map(task => ({
    duration: nonNegative(task && task.duration),
    startTime: nonNegative(task && task.startTime)
  })) : [];
  const longestTaskMs = longTasks.reduce((max, task) => Math.max(max, task.duration), 0);
  const totalLongTaskMs = longTasks.reduce((sum, task) => sum + task.duration, 0);
  return {
    route: safeString(input.route),
    flow: safeString(input.flow || 'runtime-flow'),
    hydrationMs: nonNegative(input.hydrationMs || input.navigationDuration || input.now),
    longTaskCount: longTasks.length,
    longestTaskMs,
    totalLongTaskMs,
    domNodeCount: nonNegative(input.domNodeCount),
    heapUsedBytes: nonNegative(input.heapUsedBytes),
    requiredChunkBytes: nonNegative(input.requiredChunkBytes),
    sparseQuestionJsonBytes: nonNegative(input.sparseQuestionJsonBytes),
    jsonParseMs: nonNegative(input.jsonParseMs),
    storedQuestionBytes: nonNegative(input.storedQuestionBytes),
    loadedChunkCount: nonNegative(input.loadedChunkCount),
    longTaskSupported: input.longTaskSupported !== false
  };
}

function nonNegative(value) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function safeString(value) {
  return String(value || '').trim().slice(0, 120);
}

module.exports = {
  collectRuntimePerformanceMetrics,
  installRuntimePerformanceProbe,
  normalizeRuntimePerformanceMetrics
};
