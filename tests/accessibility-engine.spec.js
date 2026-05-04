#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  applyAccessibilityPolicy,
  scanAccessibilityPage,
  writeAccessibilityArtifact
} = require('./helpers/accessibility-engine');
const {
  closeBrowserWithDiagnostics,
  closeServerWithTimeout,
  createBrowserResourceTracker,
  newTrackedPage,
  runCase
} = require('./helpers/smoke-runner');

const repoRoot = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.QA_A11Y_ENGINE_PORT) || 4197;
const artifactDir = path.join(repoRoot, 'test-results', 'accessibility-engine');
const VIEWPORT = { width: 1280, height: 900 };
const APP_PAGES = [
  { label: 'Home', file: 'index.html' },
  { label: 'Grammar topic index', file: 'topics/grammar/index.html' },
  { label: 'Subtopic start', file: 'topics/grammar/subtopics/sentence-types.html', waitFor: '#start-btn' },
  { label: 'Active question', file: 'topics/grammar/subtopics/sentence-types.html', state: startQuiz },
  { label: 'Question feedback', file: 'topics/grammar/subtopics/sentence-types.html', state: answerQuestion },
  { label: 'Quiz results', file: 'topics/capitalization/subtopics/books-magazines-songs-plays.html', state: finishQuiz },
  { label: 'Reports', file: 'reports.html' },
  { label: 'Subscription', file: 'subscription.html', waitFor: '#subscription-entitlement' },
  { label: 'Assignments', file: 'assignments.html', waitFor: '#assignment-list' },
  { label: 'Guardian dashboard', file: 'guardian-dashboard.html', waitFor: '#learning-dashboard-root' },
  { label: 'Teacher dashboard', file: 'teacher-dashboard.html', waitFor: '#learning-dashboard-root' },
  { label: 'Admin operations', file: 'admin-operations.html' },
  { label: 'Parent preview', file: 'topics/capitalization/subtopics/proper-names-titles.html?parentBrowse=1', waitFor: '#start-btn' },
  { label: 'Offline unavailable', file: 'topics/grammar/subtopics/run-on-sentences.html', state: forceOfflineUnavailable },
  { label: 'Question report triage', file: 'question-reports.html', waitFor: '#question-report-triage-root' }
];

async function main() {
  const failures = [];
  const browserTracker = createBrowserResourceTracker();
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());

  try {
    await runCase(failures, 'axe fixture fails on serious violations', async () => {
      const page = await newPage(browser, browserTracker);
      await page.setContent(`
        <html lang="en">
          <head><title>Broken fixture</title></head>
          <body><button></button></body>
        </html>
      `);
      const scan = await scanAccessibilityPage(page, { pageLabel: 'Broken fixture' });
      const policy = applyAccessibilityPolicy({ findings: scan.findings, now: '2026-04-30' });
      assert.ok(policy.failures.some(finding => finding.ruleId === 'button-name'));
      await page.close();
    });

    await runCase(failures, 'axe fixture passes with semantic page structure', async () => {
      const page = await newPage(browser, browserTracker);
      await page.setContent(`
        <html lang="en">
          <head><title>Clean fixture</title></head>
          <body>
            <header><h1>Grammar Quest</h1></header>
            <main>
              <button type="button">Start practice</button>
            </main>
          </body>
        </html>
      `);
      const scan = await scanAccessibilityPage(page, { pageLabel: 'Clean fixture' });
      const policy = applyAccessibilityPolicy({ findings: scan.findings, now: '2026-04-30' });
      assert.deepEqual(policy.failures, []);
      assert.deepEqual(policy.staleAllowlistEntries, []);
      await page.close();
    });

    for (const appPage of APP_PAGES) {
      await runCase(failures, `${appPage.label} has no serious or critical axe violations`, async () => {
        const page = await newPage(browser, browserTracker);
        await visitClean(page, server.baseURL, appPage.file);
        if (appPage.waitFor) await page.waitForSelector(appPage.waitFor, { state: 'visible' });
        if (appPage.state) await appPage.state(page);
        const scan = await scanAccessibilityPage(page, { pageLabel: appPage.label });
        const policy = applyAccessibilityPolicy({ findings: scan.findings });
        writeAccessibilityArtifact(path.join(artifactDir, `${slugify(appPage.label)}.json`), {
          page: appPage.label,
          file: appPage.file,
          findings: scan.findings,
          failures: policy.failures,
          warnings: policy.warnings,
          staleAllowlistEntries: policy.staleAllowlistEntries
        });
        assert.deepEqual(policy.failures, [], `${appPage.label} serious/critical violations`);
        assert.deepEqual(policy.staleAllowlistEntries, [], `${appPage.label} stale allowlist entries`);
        await page.close();
      }, { timeoutMs: 20000 });
    }
  } finally {
    await closeBrowserWithDiagnostics(browser, browserTracker, 5000);
    await server.close();
  }

  if (failures.length) {
    failures.forEach(failure => {
      console.error(`FAIL ${failure.name}`);
      console.error(failure.error && (failure.error.stack || failure.error.message) || failure.error);
    });
    process.exitCode = 1;
    return;
  }

  console.log('Accessibility engine scan passed.');
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
    window.GRAMMAR_QUEST_CONFIG = Object.assign({}, window.GRAMMAR_QUEST_CONFIG, {
      disableServiceWorker: true
    });
  });
  await page.route('**/assets/firebase-config.js', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: 'window.GQ_FIREBASE_CONFIG = { enabled: false, authProviders: {}, firestore: {} };'
  }));
  await page.route('**/assets/auth-service.js', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: `
      function authState() {
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
        ready: function () { return Promise.resolve(authState()); },
        getState: authState,
        loadManagedStudents: function () { return Promise.resolve([]); },
        loadStudentProgress: function () { return Promise.resolve({}); },
        updateStudentQuestionReport: function () { return Promise.resolve(null); }
      };
    `
  }));
  return page;
}

async function startQuiz(page) {
  await page.click('#start-btn');
  await page.waitForSelector('.choice-btn', { state: 'visible' });
}

async function answerQuestion(page) {
  await startQuiz(page);
  if (await page.locator('.confidence-btn:not([disabled])').count()) {
    await page.locator('.confidence-btn:not([disabled])').last().click();
  }
  await page.locator('.choice-btn:not([disabled])').first().click();
  await page.waitForSelector('.feedback-box, #feedback-area', { state: 'visible' });
}

async function finishQuiz(page) {
  await startQuiz(page);
  for (let index = 0; index < 80; index += 1) {
    if (await page.locator('.results-card, .results-box').count()) break;
    if (!(await page.locator('.choice-btn').count())) break;
    if (await page.locator('.confidence-btn:not([disabled])').count()) {
      await page.locator('.confidence-btn:not([disabled])').last().click();
    }
    if (await page.locator('.choice-btn:not([disabled])').count()) {
      await page.locator('.choice-btn:not([disabled])').first().click();
    }
    if (await page.locator('#next-question-btn').count()) await page.click('#next-question-btn');
  }
  await page.waitForSelector('.results-box, .results-card', { state: 'visible' });
}

async function forceOfflineUnavailable(page) {
  await page.evaluate(() => {
    window.GRAMMAR_QUEST_OFFLINE_CHUNK_MISSING = true;
    if (window.GrammarQuestQuizEngine && typeof window.GrammarQuestQuizEngine.start === 'function') {
      window.GrammarQuestQuizEngine.start();
    }
  });
  await page.waitForSelector('#quiz-root', { state: 'visible' });
}

async function visitClean(page, baseURL, file) {
  await page.goto(`${baseURL}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  assert.deepEqual(page.__qaErrors, [], `page errors on ${file}`);
}

function getChromiumLaunchOptions() {
  return Object.assign(
    { headless: true },
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}
  );
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
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function slugify(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
