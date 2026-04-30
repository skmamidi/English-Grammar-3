async function runCase(failures, name, fn, options = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const logger = options.logger || console;
  let timeoutId;

  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timed out: ${name}`)), timeoutMs);
      })
    ]);
    logger.log(`PASS ${name}`);
  } catch (error) {
    logger.error(`FAIL ${name}`);
    logger.error(error.stack || error.message || error);
    failures.push({ name, error });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    }),
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

async function closeServerWithTimeout(server, sockets, timeoutMs = 3000) {
  let closeSettled = false;
  const closePromise = new Promise((resolve, reject) => {
    server.close(error => {
      closeSettled = true;
      if (error) reject(error);
      else resolve();
    });
  });

  if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();

  try {
    return await withTimeout(closePromise, timeoutMs, 'server.close');
  } catch (error) {
    const openSockets = sockets ? sockets.size : 0;
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    if (sockets) sockets.forEach(socket => socket.destroy());
    await waitForSocketDrain(sockets, 100);
    const message = `server.close timed out after ${timeoutMs}ms; destroyed ${openSockets} open socket${openSockets === 1 ? '' : 's'}`;
    const timeoutError = new Error(message);
    timeoutError.cause = error;
    if (!closeSettled) return Promise.reject(timeoutError);
    throw timeoutError;
  }
}

function createBrowserResourceTracker() {
  const contexts = new Set();
  const pages = new Set();
  const routeLabels = new Set();
  const failedRequests = [];

  return {
    contexts,
    pages,
    routeLabels,
    failedRequests,
    trackContext(context) {
      contexts.add(context);
      if (context && typeof context.once === 'function') {
        context.once('close', () => contexts.delete(context));
      }
      return context;
    },
    trackPage(page) {
      pages.add(page);
      if (page && typeof page.once === 'function') {
        page.once('close', () => pages.delete(page));
      } else if (page && typeof page.on === 'function') {
        page.on('close', () => pages.delete(page));
      }
      if (page && typeof page.on === 'function') {
        page.on('requestfailed', request => {
          const failure = typeof request.failure === 'function' ? request.failure() : null;
          failedRequests.push({
            url: typeof request.url === 'function' ? request.url() : '',
            errorText: failure && failure.errorText || ''
          });
          if (failedRequests.length > 10) failedRequests.shift();
        });
      }
      return page;
    },
    trackRoute(label) {
      routeLabels.add(label);
      return () => routeLabels.delete(label);
    },
    snapshot() {
      return snapshotBrowserResources(this);
    }
  };
}

async function newTrackedPage(browser, options = {}, tracker = createBrowserResourceTracker()) {
  const context = tracker.trackContext(await browser.newContext(options));
  const page = tracker.trackPage(await context.newPage());
  const closePage = page.close.bind(page);
  page.close = async closeOptions => {
    try {
      if (!isPageClosed(page)) await closePage(closeOptions);
    } finally {
      if (context && typeof context.close === 'function') await context.close().catch(() => {});
      tracker.pages.delete(page);
      tracker.contexts.delete(context);
    }
  };
  return page;
}

async function closeBrowserWithDiagnostics(browser, tracker, timeoutMs = 5000) {
  const beforeClose = tracker && typeof tracker.snapshot === 'function' ? tracker.snapshot() : emptyBrowserSnapshot();
  const browserProcess = getBrowserProcess(browser);
  const beforeProcess = snapshotBrowserProcess(browserProcess);
  const connectedBeforeClose = isBrowserConnected(browser);
  await closeTrackedPagesAndContexts(tracker, Math.min(3000, timeoutMs));
  try {
    await withTimeout(browser.close(), timeoutMs, 'browser.close');
    return { method: 'browser.close' };
  } catch (error) {
    const afterClose = tracker && typeof tracker.snapshot === 'function' ? tracker.snapshot() : emptyBrowserSnapshot();
    const connectedAfterClose = isBrowserConnected(browser);
    const baseMessage = `${error.message}; ${formatBrowserSnapshot(afterClose, beforeClose)}; ${formatBrowserProcessSnapshot({
      connectedBeforeClose,
      connectedAfterClose,
      processSnapshot: snapshotBrowserProcess(browserProcess) || beforeProcess
    })}`;
    if (hasOpenBrowserResources(afterClose)) {
      const timeoutError = new Error(`${baseMessage}; fallback: not attempted because tracked resources remain open`);
      timeoutError.cause = error;
      throw timeoutError;
    }
    if (connectedAfterClose === false) {
      return {
        method: 'browser.close-timeout-disconnected',
        fallback: browserProcess && typeof browserProcess.kill === 'function' ? 'not-needed' : 'no-process-handle',
        connectedBeforeClose,
        connectedAfterClose
      };
    }
    if (!browserProcess || typeof browserProcess.kill !== 'function') {
      const fallbackReason = connectedAfterClose === true
        ? 'unavailable while browser remains connected'
        : 'unavailable while browser connection state is unknown';
      const timeoutError = new Error(`${baseMessage}; fallback: ${fallbackReason}`);
      timeoutError.cause = error;
      throw timeoutError;
    }
    if (browserProcess.killed) {
      return { method: 'process.kill', signal: 'already-killed' };
    }
    const fallbackTimeoutMs = Math.min(1000, Math.max(50, timeoutMs));
    try {
      browserProcess.kill('SIGTERM');
      await waitForProcessExit(browserProcess, fallbackTimeoutMs);
      return { method: 'process.kill', signal: 'SIGTERM' };
    } catch (fallbackError) {
      const timeoutError = new Error(`${baseMessage}; ${formatBrowserProcessSnapshot({
        connectedBeforeClose,
        connectedAfterClose,
        processSnapshot: snapshotBrowserProcess(browserProcess)
      })}; fallback: process SIGTERM timed out after ${fallbackTimeoutMs}ms`);
      timeoutError.cause = error;
      throw timeoutError;
    }
  }
}

async function closeTrackedPagesAndContexts(tracker, timeoutMs = 3000) {
  if (!tracker) return;
  const pages = Array.from(tracker.pages || []);
  await Promise.allSettled(pages.map(page => withTimeout(Promise.resolve()
    .then(() => (isPageClosed(page) ? null : page.close()))
    .catch(() => {}), timeoutMs, 'page.close')));

  const contexts = Array.from(tracker.contexts || []);
  await Promise.allSettled(contexts.map(context => withTimeout(Promise.resolve()
    .then(() => (typeof context.close === 'function' ? context.close() : null))
    .catch(() => {}), timeoutMs, 'context.close')));
}

function waitForSocketDrain(sockets, timeoutMs) {
  if (!sockets || sockets.size === 0) return Promise.resolve();
  return new Promise(resolve => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (sockets.size === 0 || Date.now() - startedAt >= timeoutMs) {
        clearInterval(interval);
        resolve();
      }
    }, 5);
  });
}

function snapshotBrowserResources(tracker) {
  const pages = Array.from(tracker.pages || []).filter(page => !isPageClosed(page));
  const contexts = Array.from(tracker.contexts || []);
  return {
    openContextCount: contexts.length,
    openPageCount: pages.length,
    pageUrls: pages.map(page => safePageUrl(page)).filter(Boolean),
    routeLabels: Array.from(tracker.routeLabels || []),
    recentFailedRequests: Array.from(tracker.failedRequests || [])
  };
}

function emptyBrowserSnapshot() {
  return {
    openContextCount: 0,
    openPageCount: 0,
    pageUrls: [],
    routeLabels: [],
    recentFailedRequests: []
  };
}

function formatBrowserSnapshot(current, beforeClose) {
  const urls = current.pageUrls.length ? current.pageUrls : beforeClose.pageUrls;
  const routes = current.routeLabels.length ? current.routeLabels : beforeClose.routeLabels;
  const failed = current.recentFailedRequests.length ? current.recentFailedRequests : beforeClose.recentFailedRequests;
  return [
    `open contexts: ${current.openContextCount}`,
    `open pages: ${current.openPageCount}`,
    `page URLs: ${urls.length ? urls.join(', ') : '(none)'}`,
    `active routes: ${routes.length ? routes.join(', ') : '(none)'}`,
    `recent failed requests: ${failed.length ? failed.map(item => `${item.url} ${item.errorText}`.trim()).join(', ') : '(none)'}`
  ].join('; ');
}

function hasOpenBrowserResources(snapshot) {
  return Boolean(snapshot && (snapshot.openContextCount > 0 || snapshot.openPageCount > 0));
}

function getBrowserProcess(browser) {
  try {
    return browser && typeof browser.process === 'function' ? browser.process() : null;
  } catch (error) {
    return null;
  }
}

function isBrowserConnected(browser) {
  try {
    return browser && typeof browser.isConnected === 'function' ? Boolean(browser.isConnected()) : null;
  } catch (error) {
    return null;
  }
}

function snapshotBrowserProcess(browserProcess) {
  if (!browserProcess) return null;
  return {
    pid: typeof browserProcess.pid === 'number' ? browserProcess.pid : null,
    killed: Boolean(browserProcess.killed),
    exitCode: typeof browserProcess.exitCode === 'number' ? browserProcess.exitCode : null,
    signalCode: browserProcess.signalCode || null
  };
}

function formatBrowserProcessSnapshot(details) {
  const processSnapshot = details.processSnapshot;
  return [
    `browser connected before close: ${formatMaybe(details.connectedBeforeClose)}`,
    `browser connected after close: ${formatMaybe(details.connectedAfterClose)}`,
    `process pid: ${processSnapshot && processSnapshot.pid !== null ? processSnapshot.pid : '(unavailable)'}`,
    `process killed: ${processSnapshot ? processSnapshot.killed : '(unavailable)'}`,
    `process exitCode: ${processSnapshot && processSnapshot.exitCode !== null ? processSnapshot.exitCode : '(pending)'}`,
    `process signalCode: ${processSnapshot && processSnapshot.signalCode ? processSnapshot.signalCode : '(none)'}`
  ].join('; ');
}

function formatMaybe(value) {
  return value === null || typeof value === 'undefined' ? '(unavailable)' : String(value);
}

function waitForProcessExit(browserProcess, timeoutMs) {
  if (!browserProcess || typeof browserProcess.once !== 'function') return Promise.resolve();
  if (typeof browserProcess.exitCode === 'number' || browserProcess.signalCode) return Promise.resolve();
  return withTimeout(new Promise(resolve => {
    browserProcess.once('exit', resolve);
    browserProcess.once('close', resolve);
  }), timeoutMs, 'browser process exit');
}

function isPageClosed(page) {
  return Boolean(page && typeof page.isClosed === 'function' && page.isClosed());
}

function safePageUrl(page) {
  try {
    return page && typeof page.url === 'function' ? page.url() : '';
  } catch (error) {
    return '';
  }
}

module.exports = {
  closeBrowserWithDiagnostics,
  closeServerWithTimeout,
  closeTrackedPagesAndContexts,
  createBrowserResourceTracker,
  newTrackedPage,
  runCase,
  withTimeout
};
