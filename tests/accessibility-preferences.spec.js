#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  closeBrowserWithDiagnostics,
  closeServerWithTimeout,
  createBrowserResourceTracker,
  newTrackedPage,
  runCase
} = require('./helpers/smoke-runner');

const repoRoot = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.QA_A11Y_PREFS_PORT) || 4198;
const VIEWPORT = { width: 1280, height: 900 };

async function main() {
  const failures = [];
  const browserTracker = createBrowserResourceTracker();
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());

  try {
    await runCase(failures, 'reduced-motion quiz reaches feedback and next question without animation dependency', async () => {
      const page = await newPreferencePage(browser, browserTracker, { reducedMotion: 'reduce' });
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html');
      await answerQuestion(page);
      await page.waitForSelector('.feedback-box', { state: 'visible' });
      const motion = await page.evaluate(() => {
        const choice = window.getComputedStyle(document.querySelector('.choice-btn'));
        const feedback = window.getComputedStyle(document.querySelector('.feedback-box'));
        return {
          choiceTransition: choice.transitionDuration,
          feedbackAnimation: feedback.animationName,
          feedbackTransition: feedback.transitionDuration
        };
      });
      assert.equal(motion.choiceTransition, '0s');
      assert.equal(motion.feedbackAnimation, 'none');
      assert.equal(motion.feedbackTransition, '0s');
      await page.click('#next-question-btn');
      assert.match(await textContent(page, '#quiz-root'), /Question|Results|Score|Review/i);
      await page.close();
    }, { timeoutMs: 20000 });

    await runCase(failures, 'forced-colors home navigation keeps keyboard focus visible', async () => {
      const page = await newPreferencePage(browser, browserTracker, { forcedColors: 'active' });
      await visitClean(page, server.baseURL, 'index.html');
      await page.keyboard.press('Tab');
      const focus = await focusedOutline(page);
      assert.equal(focus.visible, true, focus.reason);
      await page.close();
    });

    await runCase(failures, 'forced-colors quiz feedback keeps symbolic and text cues', async () => {
      const page = await newPreferencePage(browser, browserTracker, { forcedColors: 'active' });
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html');
      await answerQuestion(page);
      const feedback = await page.evaluate(() => {
        const title = document.querySelector('.feedback-title');
        const correct = document.querySelector('.choice-btn.correct');
        const incorrect = document.querySelector('.choice-btn.incorrect');
        return {
          text: title ? title.textContent.trim() : '',
          marker: title ? window.getComputedStyle(title, '::before').content : '',
          correctBorderStyle: correct ? window.getComputedStyle(correct).borderTopStyle : '',
          incorrectBorderStyle: incorrect ? window.getComputedStyle(incorrect).borderTopStyle : ''
        };
      });
      assert.match(feedback.text, /Correct|Not quite/);
      assert.notEqual(feedback.marker, 'none');
      assert.equal(feedback.correctBorderStyle, 'solid');
      if (feedback.incorrectBorderStyle) assert.equal(feedback.incorrectBorderStyle, 'dashed');
      await page.close();
    }, { timeoutMs: 20000 });

    await runCase(failures, 'forced-colors reports dashboard keeps cards and roster focus visible', async () => {
      const page = await newPreferencePage(browser, browserTracker, { forcedColors: 'active' });
      await visitClean(page, server.baseURL, 'reports.html');
      await page.waitForSelector('.student-row', { state: 'visible' });
      await focusByKeyboard(page, '.student-row');
      const focus = await focusedOutline(page);
      assert.equal(focus.visible, true, focus.reason);
      assert.match(await textContent(page, '.report-kpis'), /Accuracy|Questions|Skills|Reports/i);
      await page.close();
    }, { timeoutMs: 20000 });

    await runCase(failures, 'reduced-motion offline unavailable state is visible immediately', async () => {
      const page = await newPreferencePage(browser, browserTracker, { reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        window.GRAMMAR_QUEST_OFFLINE_CHUNK_MISSING = true;
      });
      await page.route('**/assets/question-chunks/grammar/grammar-run-on-sentences.js', route => route.abort('failed'));
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/run-on-sentences.html');
      await page.waitForSelector('.card .page-subtitle', { state: 'visible' });
      const rootText = await textContent(page, '#quiz-root');
      assert.match(rootText, /unavailable offline|loaded once|reconnect/i);
      await page.close();
    }, { timeoutMs: 20000 });
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

  console.log('Accessibility preference smoke passed.');
}

async function newPreferencePage(browser, tracker, contextOptions = {}) {
  const page = await newTrackedPage(browser, Object.assign({ viewport: VIEWPORT }, contextOptions), tracker);
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
      window.GrammarQuestAuth = {
        ready: function () { return Promise.resolve({ enabled: false, signedIn: false, parentMode: false, studentMode: false }); },
        getState: function () { return { enabled: false, signedIn: false, parentMode: false, studentMode: false }; },
        loadManagedStudents: function () { return Promise.resolve([]); },
        loadStudentProgress: function () { return Promise.resolve({}); },
        updateStudentQuestionReport: function () { return Promise.resolve(null); }
      };
    `
  }));
  return page;
}

async function visitClean(page, baseURL, file) {
  await page.goto(`${baseURL}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  assert.deepEqual(page.__qaErrors, [], `page errors on ${file}`);
}

async function answerQuestion(page) {
  await page.click('#start-btn');
  await page.waitForSelector('.choice-btn', { state: 'visible' });
  if (await page.locator('.confidence-btn:not([disabled])').count()) {
    await page.locator('.confidence-btn:not([disabled])').last().click();
  }
  await page.locator('.choice-btn:not([disabled])').first().click();
}

async function focusedOutline(page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return { visible: false, reason: 'no active element' };
    const style = window.getComputedStyle(active);
    const rect = active.getBoundingClientRect();
    const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
    return {
      visible: rect.width > 0 && rect.height > 0 && outlineWidth >= 3 && style.outlineStyle !== 'none',
      reason: active.outerHTML.slice(0, 160)
    };
  });
}

async function focusByKeyboard(page, selector) {
  for (let index = 0; index < 20; index += 1) {
    const focused = await page.evaluate(targetSelector => document.activeElement && document.activeElement.matches(targetSelector), selector);
    if (focused) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not focus ${selector} with keyboard`);
}

function textContent(page, selector) {
  return page.$eval(selector, node => node.textContent || '');
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
  if (filePath.endsWith('.js')) return 'text/javascript';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
