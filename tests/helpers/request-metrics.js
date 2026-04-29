const QUESTION_BANK_PATTERN = /\/assets\/question-banks\/[^/]+\.js(?:[?#].*)?$/;
const QUESTION_CHUNK_PATTERN = /\/assets\/question-chunks\/[^/]+\/[^/]+\.js(?:[?#].*)?$/;
const QUESTION_MANIFEST_PATTERN = /\/assets\/question-manifest\.js(?:[?#].*)?$/;

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

function summarizeRequestMetrics({ requests = [], responses = [] } = {}) {
  const responseBytes = new Map();
  responses.forEach(response => {
    const assetPath = normalizeAssetPath(response.url);
    const bytes = Number(response.bytes) || 0;
    responseBytes.set(assetPath, Math.max(responseBytes.get(assetPath) || 0, bytes));
  });

  const loadedFullBanks = uniqueAssetPaths(requests.filter(isQuestionBankUrl));
  const loadedChunks = uniqueAssetPaths(requests.filter(isQuestionChunkUrl));
  const manifestRequests = uniqueAssetPaths(requests.filter(isQuestionManifestUrl));
  const manifestBytes = sumBytes(manifestRequests, responseBytes);
  const questionBankBytes = sumBytes(loadedFullBanks, responseBytes);
  const questionChunkBytes = sumBytes(loadedChunks, responseBytes);

  return {
    manifestBytes,
    questionBankBytes,
    questionChunkBytes,
    questionPayloadBytes: manifestBytes + questionBankBytes + questionChunkBytes,
    loadedFullBanks,
    loadedChunks,
    manifestRequests
  };
}

function formatRequestMetrics(metrics) {
  return [
    `questionPayloadBytes=${metrics.questionPayloadBytes}`,
    `manifestBytes=${metrics.manifestBytes}`,
    `questionBankBytes=${metrics.questionBankBytes}`,
    `questionChunkBytes=${metrics.questionChunkBytes}`,
    `loadedFullBanks=[${metrics.loadedFullBanks.join(', ')}]`,
    `loadedChunks=[${metrics.loadedChunks.join(', ')}]`
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

module.exports = {
  createRequestRecorder,
  summarizeRequestMetrics,
  formatRequestMetrics,
  assertPageBudget,
  normalizeAssetPath
};
