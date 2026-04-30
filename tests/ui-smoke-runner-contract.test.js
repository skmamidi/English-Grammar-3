const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const {
  closeBrowserWithDiagnostics,
  closeServerWithTimeout,
  createBrowserResourceTracker,
  newTrackedPage,
  runCase,
  withTimeout
} = require('./helpers/smoke-runner');

test('runCase clears its timeout after a passing case', async () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const handles = new Set();

  global.setTimeout = (callback, delay) => {
    const handle = originalSetTimeout(callback, delay);
    handles.add(handle);
    return handle;
  };
  global.clearTimeout = handle => {
    handles.delete(handle);
    return originalClearTimeout(handle);
  };

  try {
    const failures = [];
    await runCase(failures, 'passing smoke case', async () => {}, {
      logger: silentLogger(),
      timeoutMs: 50
    });

    assert.deepEqual(failures, []);
    assert.equal(handles.size, 0, 'passing smoke case should not leave an active timeout handle');
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('withTimeout rejects with a useful resource label', async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 10, 'browser.close'),
    /browser\.close timed out after 10ms/
  );
});

test('server close resolves when idle', async () => {
  const server = {
    close(callback) {
      callback();
    },
    closeIdleConnections() {}
  };
  const sockets = new Set();

  await closeServerWithTimeout(server, sockets, 100);
  assert.equal(sockets.size, 0);
});

test('server close destroys stuck sockets and reports a bounded timeout', async () => {
  let destroyed = 0;
  const sockets = new Set();
  sockets.add({
    destroy() {
      destroyed += 1;
      sockets.clear();
    }
  });
  const server = {
    close() {},
    closeAllConnections() {}
  };

  await assert.rejects(
    closeServerWithTimeout(server, sockets, 10),
    /server.close timed out after 10ms; destroyed \d+ open socket/
  );
  assert.equal(sockets.size, 0);
  assert.equal(destroyed, 1);
});

test('tracked page close drains the owning browser context', async () => {
  const tracker = createBrowserResourceTracker();
  const browser = fakeBrowser();
  const page = await newTrackedPage(browser, { viewport: { width: 390, height: 844 } }, tracker);

  assert.equal(tracker.pages.size, 1);
  assert.equal(tracker.contexts.size, 1);

  await page.close();

  assert.equal(browser.contexts[0].closed, true);
  assert.equal(tracker.pages.size, 0);
  assert.equal(tracker.contexts.size, 0);
});

test('browser close helper closes remaining contexts before browser.close', async () => {
  const tracker = createBrowserResourceTracker();
  const browser = fakeBrowser();
  await newTrackedPage(browser, {}, tracker);

  const result = await closeBrowserWithDiagnostics(browser, tracker, 50);

  assert.equal(browser.contexts[0].closed, true);
  assert.equal(browser.closed, true);
  assert.equal(result.method, 'browser.close');
  assert.equal(tracker.pages.size, 0);
  assert.equal(tracker.contexts.size, 0);
});

test('browser close fallback is not used while tracked contexts remain open', async () => {
  const tracker = createBrowserResourceTracker();
  const process = fakeBrowserProcess();
  const browser = fakeBrowser({
    closeHangs: true,
    process,
    contextCloseHangs: true
  });
  await newTrackedPage(browser, {}, tracker);

  await assert.rejects(
    closeBrowserWithDiagnostics(browser, tracker, 10),
    /browser\.close timed out after 10ms;.*open contexts: 1;.*process pid: 4321;.*fallback: not attempted/
  );
  assert.equal(process.killCalls.length, 0, 'process fallback should not hide tracked resource leaks');
});

test('browser close timeout kills launched browser process after tracked resources drain', async () => {
  const tracker = createBrowserResourceTracker();
  const process = fakeBrowserProcess();
  const browser = fakeBrowser({ closeHangs: true, process });
  await newTrackedPage(browser, {}, tracker);

  const result = await closeBrowserWithDiagnostics(browser, tracker, 25);

  assert.equal(result.method, 'process.kill');
  assert.deepEqual(process.killCalls, ['SIGTERM']);
  assert.equal(tracker.pages.size, 0);
  assert.equal(tracker.contexts.size, 0);
});

test('browser close process fallback failure reports process diagnostics', async () => {
  const tracker = createBrowserResourceTracker();
  const process = fakeBrowserProcess({ exits: false });
  const browser = fakeBrowser({ closeHangs: true, process, connected: true });
  await newTrackedPage(browser, {}, tracker);

  await assert.rejects(
    closeBrowserWithDiagnostics(browser, tracker, 10),
    /browser\.close timed out after 10ms;.*browser connected before close: true;.*process pid: 4321;.*process killed: true;.*fallback: process SIGTERM timed out/
  );
  assert.deepEqual(process.killCalls, ['SIGTERM']);
});

test('browser close timeout includes open page diagnostics', async () => {
  const tracker = createBrowserResourceTracker();
  const browser = fakeBrowser({ closeHangs: true });
  const page = await newTrackedPage(browser, {}, tracker);
  page._url = 'http://127.0.0.1:4173/topics/grammar/index.html';

  await assert.rejects(
    closeBrowserWithDiagnostics(browser, tracker, 10),
    /browser\.close timed out after 10ms; open contexts: 0; open pages: 0; page URLs: http:\/\/127\.0\.0\.1:4173\/topics\/grammar\/index\.html;.*browser connected before close: true/
  );
});

function silentLogger() {
  return {
    log() {},
    error() {}
  };
}

function fakeBrowser(options = {}) {
  const browser = {
    contexts: [],
    closed: false,
    isConnected() {
      return options.connected !== false && !browser.closed;
    },
    process() {
      return options.process || null;
    },
    async newContext(contextOptions) {
      const context = new EventEmitter();
      context.options = contextOptions;
      context.closed = false;
      context.pages = [];
      context.newPage = async () => {
        const page = new EventEmitter();
        page._closed = false;
        page._url = 'about:blank';
        page.url = () => page._url;
        page.isClosed = () => page._closed;
        page.close = async () => {
          page._closed = true;
          page.emit('close');
        };
        context.pages.push(page);
        return page;
      };
      context.close = async () => {
        if (options.contextCloseHangs) return new Promise(() => {});
        context.closed = true;
        context.pages.forEach(page => {
          if (!page._closed) {
            page._closed = true;
            page.emit('close');
          }
        });
        context.emit('close');
      };
      browser.contexts.push(context);
      return context;
    },
    close() {
      if (options.closeHangs) return new Promise(() => {});
      browser.closed = true;
      return Promise.resolve();
    }
  };
  return browser;
}

function fakeBrowserProcess(options = {}) {
  const process = new EventEmitter();
  process.pid = 4321;
  process.killed = Boolean(options.killed);
  process.exitCode = options.exitCode ?? null;
  process.signalCode = options.signalCode ?? null;
  process.killCalls = [];
  process.kill = signal => {
    process.killCalls.push(signal);
    process.killed = true;
    if (options.exits !== false) {
      setTimeout(() => {
        process.signalCode = signal;
        process.emit('exit', process.exitCode, signal);
      }, 0);
    }
    return true;
  };
  return process;
}
