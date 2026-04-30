const QUESTION_BANK_PATTERN = /\/assets\/question-banks\/[^/]+\.js(?:[?#].*)?$/;
const QUESTION_CHUNK_PATTERN = /\/assets\/question-chunks\/[^/]+\/[^/]+\.js(?:[?#].*)?$/;
const QUESTION_MANIFEST_PATTERN = /\/assets\/question-manifest\.js(?:[?#].*)?$/;
const APP_SHELL_JS_PATTERN = /\/assets\/(?!question-(?:chunks|banks|manifest))(?:.+\/)?[^/]+\.js(?:[?#].*)?$/;
const APP_SHELL_CSS_PATTERN = /\/assets\/[^/]+\.css(?:[?#].*)?$/;
const SERVICE_WORKER_PATTERN = /\/(?:sw\.js|assets\/service-worker-[^/]+\.js)(?:[?#].*)?$/;
const RELEASE_METADATA_PATTERN = /\/assets\/(?:release-manifest|build\/frontend-manifest)\.json(?:[?#].*)?$/;

function createRequestRecorder(page) {
  const requests = [];
  const responses = [];

  page.on('request', request => {
    requests.push(request.url());
  });
  page.on('response', response => {
    const headers = response.headers();
    responses.push({
      url: response.url(),
      status: response.status(),
      bytes: Number(headers['content-length']) || 0
    });
  });

  return {
    requests,
    responses,
    summarize() {
      return summarizeRequestMetrics({ requests, responses });
    }
  };
}

function summarizeRequestMetrics({ requests = [], preloadRequests = [], responses = [], cacheEvents = [] } = {}) {
  const responseBytes = new Map();
  responses.forEach(response => {
    const assetPath = normalizeAssetPath(response.url);
    const bytes = Number(response.bytes) || 0;
    responseBytes.set(assetPath, Math.max(responseBytes.get(assetPath) || 0, bytes));
  });

  const loadedFullBanks = uniqueAssetPaths(requests.filter(isQuestionBankUrl));
  const preloadedChunks = uniqueAssetPaths(preloadRequests.filter(isQuestionChunkUrl));
  const preloadSet = new Set(preloadedChunks);
  const loadedChunks = uniqueAssetPaths(requests.filter(isQuestionChunkUrl))
    .filter(assetPath => !preloadSet.has(assetPath));
  const manifestRequests = uniqueAssetPaths(requests.filter(isQuestionManifestUrl));
  const manifestBytes = sumBytes(manifestRequests, responseBytes);
  const questionBankBytes = sumBytes(loadedFullBanks, responseBytes);
  const questionChunkBytes = sumBytes(loadedChunks, responseBytes);
  const preloadChunkBytes = sumBytes(preloadedChunks, responseBytes);
  const cacheMetrics = summarizeCacheEvents(cacheEvents);
  const appShellJs = uniqueAssetPaths(requests.filter(isAppShellJsUrl));
  const appShellCss = uniqueAssetPaths(requests.filter(isAppShellCssUrl));
  const serviceWorkers = uniqueAssetPaths(requests.filter(isServiceWorkerUrl));
  const releaseMetadata = uniqueAssetPaths(requests.filter(isReleaseMetadataUrl));
  const appShellJsBytes = sumBytes(appShellJs, responseBytes);
  const appShellCssBytes = sumBytes(appShellCss, responseBytes);
  const serviceWorkerBytes = sumBytes(serviceWorkers, responseBytes);
  const releaseMetadataBytes = sumBytes(releaseMetadata, responseBytes);

  return {
    manifestBytes,
    questionBankBytes,
    questionChunkBytes,
    preloadChunkBytes,
    requiredCachedBytes: cacheMetrics.requiredCachedBytes || questionChunkBytes,
    preloadCachedBytes: cacheMetrics.preloadCachedBytes || preloadChunkBytes,
    evictedChunkCount: cacheMetrics.evictedChunkCount,
    staleCacheCleanupCount: cacheMetrics.staleCacheCleanupCount,
    questionPayloadBytes: manifestBytes + questionBankBytes + questionChunkBytes,
    appShellJsBytes,
    appShellCssBytes,
    serviceWorkerBytes,
    releaseMetadataBytes,
    appShellBytes: appShellJsBytes + appShellCssBytes + serviceWorkerBytes + releaseMetadataBytes,
    loadedFullBanks,
    loadedChunks,
    preloadedChunks,
    manifestRequests,
    appShellAssets: Array.from(new Set(appShellJs.concat(appShellCss, serviceWorkers, releaseMetadata))).sort()
  };
}

function summarizeCacheEvents(cacheEvents) {
  return (Array.isArray(cacheEvents) ? cacheEvents : []).reduce((summary, event) => {
    const detail = event && event.detail || {};
    summary.requiredCachedBytes += Number(detail.requiredCachedBytes) || 0;
    summary.preloadCachedBytes += Number(detail.preloadCachedBytes) || 0;
    summary.evictedChunkCount += Number(detail.evictedChunkCount) || 0;
    summary.staleCacheCleanupCount += Number(detail.staleCacheCleanupCount) || 0;
    return summary;
  }, {
    requiredCachedBytes: 0,
    preloadCachedBytes: 0,
    evictedChunkCount: 0,
    staleCacheCleanupCount: 0
  });
}

function formatRequestMetrics(metrics) {
  return [
    `questionPayloadBytes=${metrics.questionPayloadBytes}`,
    `manifestBytes=${metrics.manifestBytes}`,
    `questionBankBytes=${metrics.questionBankBytes}`,
    `questionChunkBytes=${metrics.questionChunkBytes}`,
    `preloadChunkBytes=${metrics.preloadChunkBytes}`,
    `appShellBytes=${metrics.appShellBytes || 0}`,
    `appShellJsBytes=${metrics.appShellJsBytes || 0}`,
    `appShellCssBytes=${metrics.appShellCssBytes || 0}`,
    `loadedFullBanks=[${metrics.loadedFullBanks.join(', ')}]`,
    `loadedChunks=[${metrics.loadedChunks.join(', ')}]`,
    `preloadedChunks=[${(metrics.preloadedChunks || []).join(', ')}]`
  ].join('; ');
}

function assertPageBudget(assert, file, metrics, budget) {
  if (!budget) return;
  const summary = formatRequestMetrics(metrics);

  if (budget.forbidFullBanks) {
    assert.deepEqual(metrics.loadedFullBanks, [], `${file} should not load full question banks; ${summary}`);
  }
  if (Array.isArray(budget.forbiddenFullBanks)) {
    budget.forbiddenFullBanks.forEach(bankFile => {
      assert.equal(
        metrics.loadedFullBanks.includes(bankFile),
        false,
        `${file} should not load ${bankFile}; ${summary}`
      );
    });
  }
  if (Number.isFinite(budget.questionPayloadBytes)) {
    assert.ok(
      metrics.questionPayloadBytes < budget.questionPayloadBytes,
      `${file} question payload ${metrics.questionPayloadBytes} bytes should be under ${budget.questionPayloadBytes}; ${summary}`
    );
  }
}

function uniqueAssetPaths(urls) {
  return Array.from(new Set(urls.map(normalizeAssetPath))).sort();
}

function sumBytes(assetPaths, responseBytes) {
  return assetPaths.reduce((sum, assetPath) => sum + (responseBytes.get(assetPath) || 0), 0);
}

function normalizeAssetPath(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, '');
  } catch (error) {
    return String(url || '').replace(/^[a-z]+:\/\/[^/]+\//i, '').replace(/^\//, '').split(/[?#]/)[0];
  }
}

function isQuestionBankUrl(url) {
  return QUESTION_BANK_PATTERN.test(url);
}

function isQuestionChunkUrl(url) {
  return QUESTION_CHUNK_PATTERN.test(url);
}

function isQuestionManifestUrl(url) {
  return QUESTION_MANIFEST_PATTERN.test(url);
}

function isAppShellJsUrl(url) {
  return APP_SHELL_JS_PATTERN.test(url) && !isServiceWorkerUrl(url);
}

function isAppShellCssUrl(url) {
  return APP_SHELL_CSS_PATTERN.test(url);
}

function isServiceWorkerUrl(url) {
  return SERVICE_WORKER_PATTERN.test(url);
}

function isReleaseMetadataUrl(url) {
  return RELEASE_METADATA_PATTERN.test(url);
}

module.exports = {
  createRequestRecorder,
  summarizeRequestMetrics,
  formatRequestMetrics,
  assertPageBudget,
  normalizeAssetPath
};
