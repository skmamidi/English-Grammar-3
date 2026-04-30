#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {
  classifyBrowserLaunchFailure,
  getCrossBrowserEngines,
  launchBrowserForEngine
} = require('./helpers/browser-launcher');
const {
  closeBrowserWithDiagnostics,
  closeServerWithTimeout,
  createBrowserResourceTracker,
  newTrackedPage,
  runCase
} = require('./helpers/smoke-runner');

const repoRoot = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.QA_CROSS_BROWSER_PORT) || 4193;
const VIEWPORT = { width: 1280, height: 900 };

async function main() {
  const server = await startStaticServer(requestedPort);
  const failures = [];
  const skipped = [];
  let launchedCount = 0;

  try {
    for (const engine of getCrossBrowserEngines(process.env)) {
      const browserTracker = createBrowserResourceTracker();
      let browser;
      try {
        browser = await launchBrowserForEngine(engine, { env: process.env });
      } catch (error) {
        const classification = classifyBrowserLaunchFailure(error, {
          engine,
          ci: process.env.CI === 'true'
        });
        if (classification.skip) {
          skipped.push(classification.message);
          console.log(`SKIP ${classification.message}`);
          continue;
        }
        throw new Error(classification.message);
      }

      launchedCount += 1;
      try {
        await runEngineSmoke(engine, browser, browserTracker, server, failures);
      } finally {
        await closeBrowserWithDiagnostics(browser, browserTracker, 5000);
      }
    }
  } finally {
    await server.close();
  }

  if (launchedCount === 0 && process.env.CI === 'true') {
    failures.push({ name: 'cross-browser launch', error: new Error('No browser engines launched in CI') });
  }

  if (failures.length) {
    failures.forEach(failure => {
      console.error(`FAIL ${failure.name}`);
      console.error(failure.error && (failure.error.stack || failure.error.message) || failure.error);
    });
    process.exitCode = 1;
    return;
  }

  if (skipped.length) {
    console.log(`Cross-browser smoke passed with ${skipped.length} local engine skip(s).`);
  } else {
    console.log('Cross-browser smoke passed.');
  }
}

async function runEngineSmoke(engine, browser, tracker, server, failures) {
  await runCase(failures, `${engine} home renders`, async () => {
    const page = await newPage(browser, tracker);
    await visitClean(page, server.baseURL, 'index.html');
    await assertVisible(page, 'main, body', `${engine} home`);
    await page.close();
  });

  await runCase(failures, `${engine} grammar topic index renders manifest-backed links`, async () => {
    const page = await newPage(browser, tracker);
    await visitClean(page, server.baseURL, 'topics/grammar/index.html');
    await assertVisible(page, '.subtopic-list', `${engine} grammar topic`);
    const listText = await textContent(page, '.subtopic-list');
    assert.match(listText, /Adaptive practice/i);
    assert.equal(await page.evaluate(() => Boolean(window.QUESTION_BANK)), false);
    await page.close();
  });

  await runCase(failures, `${engine} reports page renders`, async () => {
    const page = await newPage(browser, tracker);
    await visitClean(page, server.baseURL, 'reports.html');
    await assertVisible(page, '#student-list', `${engine} reports`);
    await page.close();
  });

  await runCase(failures, `${engine} parent preview stays read-only`, async () => {
    const page = await newPage(browser, tracker);
    await visitClean(page, server.baseURL, 'topics/capitalization/subtopics/proper-names-titles.html?parentBrowse=1');
    const before = await page.evaluate(() => localStorage.getItem('grammarQuestProgress'));
    await assertVisible(page, '#quiz-root', `${engine} parent preview`);
    if (await exists(page, '#start-btn')) {
      await page.click('#start-btn');
      assert.match(await textContent(page, '#quiz-root'), /Question|Preview/i);
    }
    const after = await page.evaluate(() => localStorage.getItem('grammarQuestProgress'));
    assert.equal(after, before, `${engine} parent preview should not mutate progress`);
    await page.close();
  });

  await runCase(failures, `${engine} subtopic quiz starts answers and advances`, async () => {
    const page = await newPage(browser, tracker);
    await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html');
    await assertQuizFlow(page, `${engine} sentence types`);
    await page.close();
  });
}

async function newPage(browser, tracker) {
  const page = await newTrackedPage(browser, { viewport: VIEWPORT }, tracker);
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(10000);
  page.__qaErrors = [];
  page.on('pageerror', error => page.__qaErrors.push(error.message || String(error)));
  page.on('console', message => {
    if (message.type() === 'error') page.__qaErrors.push(message.text());
  });
  await page.addInitScript(() => {
    window.__GRAMMAR_QUEST_DISABLE_SERVICE_WORKER = true;
  });
  const untrackFirebaseRoute = tracker.trackRoute('assets/firebase-config.js');
  page.on('close', untrackFirebaseRoute);
  await page.route('**/assets/firebase-config.js', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.GQ_FIREBASE_CONFIG = { enabled: false, authProviders: {}, firestore: {} };'
    });
  });
  const untrackAuthRoute = tracker.trackRoute('assets/auth-service.js');
  page.on('close', untrackAuthRoute);
  await page.route('**/assets/auth-service.js', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: `
        (function () {
          function state() {
            var parentMode = new URLSearchParams(window.location.search).get('parentBrowse') === '1';
            return {
              enabled: false,
              signedIn: parentMode,
              user: parentMode ? { uid: 'qa-parent' } : null,
              parentMode: parentMode,
              studentMode: false,
              activeStudent: null,
              syncStatus: 'local'
            };
          }
          window.GrammarQuestAuth = {
            ready: function () { return Promise.resolve(state()); },
            getState: state,
            loadManagedStudents: function () { return Promise.resolve([]); },
            loadStudentProgress: function () { return Promise.resolve({}); },
            updateStudentQuestionReport: function () { return Promise.resolve(null); }
          };
        })();
      `
    });
  });
  return page;
}

async function visitClean(page, baseURL, file) {
  await page.goto(`${baseURL}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  assert.deepEqual(page.__qaErrors, [], `page errors on ${file}`);
}

async function assertQuizFlow(page, label) {
  await assertVisible(page, '#quiz-root', label);
  if (!(await exists(page, '#start-btn'))) return;
  await page.click('#start-btn');
  await assertVisible(page, '.question-box', label);
  await page.click('.confidence-btn');
  await page.click('.choice-btn');
  assert.match(await textContent(page, '#feedback-area'), /Correct|Not quite/);
  await assertVisible(page, '#next-question-btn', label);
  await page.click('#next-question-btn');
  assert.match(await textContent(page, '#quiz-root'), /Question|Results|Score|Review/i);
}

async function assertVisible(page, selector, label) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 7000 })
    .catch(error => {
      error.message = `${label}: ${selector} was not visible`;
      throw error;
    });
}

async function exists(page, selector) {
  return !!(await page.$(selector));
}

async function textContent(page, selector) {
  return page.$eval(selector, node => node.textContent || '');
}

function startStaticServer(port) {
  return new Promise((resolve, reject) => {
    const sockets = new Set();
    const server = http.createServer((request, response) => {
      const parsed = new URL(request.url, `http://127.0.0.1:${port}`);
      const pathname = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
      const filePath = path.resolve(repoRoot, `.${pathname}`);
      if (!filePath.startsWith(repoRoot)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (error, data) => {
        if (error) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }
        response.writeHead(200, {
          'Content-Type': getContentType(filePath),
          'Content-Length': data.length
        });
        response.end(data);
      });
    });
    server.on('connection', socket => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    server.on('error', error => {
      if (error.code === 'EADDRINUSE' && port === requestedPort) {
        startStaticServer(port + 1).then(resolve, reject);
        return;
      }
      reject(error);
    });
    server.listen(port, '127.0.0.1', () => {
      resolve({
        baseURL: `http://127.0.0.1:${port}`,
        close: () => closeServerWithTimeout(server, sockets, 3000)
      });
    });
  });
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
