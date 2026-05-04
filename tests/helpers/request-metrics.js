const QUESTION_BANK_PATTERN = /\/assets\/question-banks\/[^/]+\.js(?:[?#].*)?$/;
const QUESTION_CHUNK_PATTERN = /\/assets\/question-chunks\/[^/]+\/[^/]+\.js(?:[?#].*)?$/;
const QUESTION_MANIFEST_PATTERN = /\/assets\/question-manifest\.js(?:[?#].*)?$/;
const STORY_LESSON_CHUNK_PATTERN = /\/assets\/story-lesson-chunks\/[^/]+\/[^/]+\.js(?:[?#].*)?$/;
const STORY_LESSON_MANIFEST_PATTERN = /\/assets\/story-lesson-manifest\.js(?:[?#].*)?$/;
const APP_SHELL_JS_PATTERN = /\/assets\/(?!(?:question-(?:chunks|banks|manifest)|story-lesson-(?:chunks|manifest)))(?:.+\/)?[^/]+\.js(?:[?#].*)?$/;
const APP_SHELL_CSS_PATTERN = /\/assets\/[^/]+\.css(?:[?#].*)?$/;
const SERVICE_WORKER_PATTERN = /\/(?:sw\.js|assets\/service-worker-[^/]+\.js)(?:[?#].*)?$/;
const RELEASE_METADATA_PATTERN = /\/assets\/(?:release-manifest|build\/frontend-manifest)\.json(?:[?#].*)?$/;
const STATIC_IMAGE_PATTERN = /\/assets\/images\/[^?#]+\.(?:png|jpe?g|webp|svg)(?:[?#].*)?$/;
const STATIC_ICON_PATTERN = /\/assets\/icons\/[^?#]+\.(?:svg|ico)(?:[?#].*)?$/;
const STATIC_FONT_PATTERN = /\/assets\/fonts\/[^?#]+\.(?:woff2?|ttf|otf)(?:[?#].*)?$/;

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
  const loadedLessonChunks = uniqueAssetPaths(requests.filter(isStoryLessonChunkUrl));
  const lessonManifestRequests = uniqueAssetPaths(requests.filter(isStoryLessonManifestUrl));
  const manifestBytes = sumBytes(manifestRequests, responseBytes);
  const questionBankBytes = sumBytes(loadedFullBanks, responseBytes);
  const questionChunkBytes = sumBytes(loadedChunks, responseBytes);
  const storyLessonChunkBytes = sumBytes(loadedLessonChunks, responseBytes);
  const storyLessonManifestBytes = sumBytes(lessonManifestRequests, responseBytes);
  const preloadChunkBytes = sumBytes(preloadedChunks, responseBytes);
  const cacheMetrics = summarizeCacheEvents(cacheEvents);
  const appShellJs = uniqueAssetPaths(requests.filter(isAppShellJsUrl));
  const appShellCss = uniqueAssetPaths(requests.filter(isAppShellCssUrl));
  const serviceWorkers = uniqueAssetPaths(requests.filter(isServiceWorkerUrl));
  const releaseMetadata = uniqueAssetPaths(requests.filter(isReleaseMetadataUrl));
  const imageAssets = uniqueAssetPaths(requests.filter(isStaticImageUrl));
  const iconAssets = uniqueAssetPaths(requests.filter(isStaticIconUrl));
  const fontAssets = uniqueAssetPaths(requests.filter(isStaticFontUrl));
  const appShellJsBytes = sumBytes(appShellJs, responseBytes);
  const appShellCssBytes = sumBytes(appShellCss, responseBytes);
  const serviceWorkerBytes = sumBytes(serviceWorkers, responseBytes);
  const releaseMetadataBytes = sumBytes(releaseMetadata, responseBytes);
  const imageBytes = sumBytes(imageAssets, responseBytes);
  const iconBytes = sumBytes(iconAssets, responseBytes);
  const fontBytes = sumBytes(fontAssets, responseBytes);

  return {
    manifestBytes,
    questionBankBytes,
    questionChunkBytes,
    storyLessonChunkBytes,
    storyLessonManifestBytes,
    requiredChunkBytes: questionChunkBytes,
    preloadChunkBytes,
    requiredCachedBytes: cacheMetrics.requiredCachedBytes || questionChunkBytes,
    preloadCachedBytes: cacheMetrics.preloadCachedBytes || preloadChunkBytes,
    evictedChunkCount: cacheMetrics.evictedChunkCount,
    staleCacheCleanupCount: cacheMetrics.staleCacheCleanupCount,
    questionPayloadBytes: manifestBytes + questionBankBytes + questionChunkBytes,
    lessonPayloadBytes: storyLessonManifestBytes + storyLessonChunkBytes,
    appShellJsBytes,
    appShellCssBytes,
    serviceWorkerBytes,
    releaseMetadataBytes,
    imageBytes,
    iconBytes,
    fontBytes,
    staticAssetBytes: imageBytes + iconBytes + fontBytes,
    appShellBytes: appShellJsBytes + appShellCssBytes + serviceWorkerBytes + releaseMetadataBytes + imageBytes + iconBytes + fontBytes,
    loadedFullBanks,
    loadedChunks,
    loadedLessonChunks,
    preloadedChunks,
    manifestRequests,
    lessonManifestRequests,
    staticAssets: Array.from(new Set(imageAssets.concat(iconAssets, fontAssets))).sort(),
    appShellAssets: Array.from(new Set(appShellJs.concat(appShellCss, serviceWorkers, releaseMetadata, imageAssets, iconAssets, fontAssets))).sort()
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
    `lessonPayloadBytes=${metrics.lessonPayloadBytes || 0}`,
    `storyLessonChunkBytes=${metrics.storyLessonChunkBytes || 0}`,
    `preloadChunkBytes=${metrics.preloadChunkBytes}`,
    `appShellBytes=${metrics.appShellBytes || 0}`,
    `appShellJsBytes=${metrics.appShellJsBytes || 0}`,
    `appShellCssBytes=${metrics.appShellCssBytes || 0}`,
    `loadedFullBanks=[${metrics.loadedFullBanks.join(', ')}]`,
    `loadedChunks=[${metrics.loadedChunks.join(', ')}]`,
    `loadedLessonChunks=[${(metrics.loadedLessonChunks || []).join(', ')}]`,
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

function isStoryLessonChunkUrl(url) {
  return STORY_LESSON_CHUNK_PATTERN.test(url);
}

function isStoryLessonManifestUrl(url) {
  return STORY_LESSON_MANIFEST_PATTERN.test(url);
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

function isStaticImageUrl(url) {
  return STATIC_IMAGE_PATTERN.test(url);
}

function isStaticIconUrl(url) {
  return STATIC_ICON_PATTERN.test(url);
}

function isStaticFontUrl(url) {
  return STATIC_FONT_PATTERN.test(url);
}

module.exports = {
  createRequestRecorder,
  summarizeRequestMetrics,
  formatRequestMetrics,
  assertPageBudget,
  normalizeAssetPath
};
