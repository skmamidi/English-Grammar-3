const assert = require('node:assert/strict');
const test = require('node:test');
const {
  closeServerWithTimeout,
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

function silentLogger() {
  return {
    log() {},
    error() {}
  };
}
