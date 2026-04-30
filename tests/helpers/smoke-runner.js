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

module.exports = {
  closeServerWithTimeout,
  runCase,
  withTimeout
};
