#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const baselineRoot = path.join(__dirname, 'visual-baselines');
const requestedPort = Number(process.env.QA_VISUAL_PORT) || 4203;
const updateBaselines = process.env.UPDATE_VISUAL_BASELINES === '1';
const FIREBASE_CONFIG_STUB = 'window.GQ_FIREBASE_CONFIG = { enabled: false, authProviders: {}, firestore: {} };';
const AUTH_SERVICE_STUB = `
  window.GrammarQuestAuth = {
    ready: function () { return Promise.resolve({ enabled: false, signedIn: false, parentMode: false, studentMode: false }); },
    getState: function () { return { enabled: false, signedIn: false, parentMode: false, studentMode: false }; },
    loadManagedStudents: function () { return Promise.resolve([]); },
    loadStudentProgress: function () { return Promise.resolve({}); },
    updateStudentQuestionReport: function () { return Promise.resolve(null); }
  };
`;

const CASES = [
  { name: 'home', file: 'index.html' },
  { name: 'capitalization-topic', file: 'topics/capitalization/index.html' },
  { name: 'grammar-topic', file: 'topics/grammar/index.html' },
  { name: 'subtopic-start', file: 'topics/grammar/subtopics/sentence-types.html', waitFor: '#start-btn' },
  { name: 'quiz-question', file: 'topics/grammar/subtopics/sentence-types.html', state: startQuiz },
  { name: 'quiz-feedback', file: 'topics/grammar/subtopics/sentence-types.html', state: answerQuestion },
  { name: 'quiz-results', file: 'topics/capitalization/subtopics/books-magazines-songs-plays.html', state: finishQuiz },
  { name: 'reports', file: 'reports.html' },
  { name: 'parent-preview', file: 'topics/capitalization/subtopics/proper-names-titles.html?parentBrowse=1', waitFor: '#start-btn' },
  { name: 'offline-unavailable', file: 'topics/grammar/subtopics/run-on-sentences.html', state: forceOfflineUnavailable }
];

async function main() {
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const failures = [];

  try {
    if (updateBaselines) fs.mkdirSync(baselineRoot, { recursive: true });
    for (const visualCase of CASES) {
      await runCase(failures, visualCase.name, async () => {
        const page = await newPage(browser);
        await visitClean(page, server.baseURL, visualCase.file);
        if (visualCase.waitFor) await page.waitForSelector(visualCase.waitFor, { state: 'visible' });
        if (visualCase.state) await visualCase.state(page, server.baseURL);
        const signature = await toVisualSignature(page, visualCase);
        const baselinePath = path.join(baselineRoot, `${visualCase.name}.json`);
        if (updateBaselines) {
          fs.writeFileSync(baselinePath, `${JSON.stringify(signature, null, 2)}\n`);
        } else {
          assert.deepEqual(signature, JSON.parse(fs.readFileSync(baselinePath, 'utf8')));
        }
        await page.context().close();
      });
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (failures.length) {
    failures.forEach(failure => {
      console.error(`FAIL ${failure.name}`);
      console.error(failure.error.stack || failure.error.message || failure.error);
    });
    process.exitCode = 1;
    return;
  }
  console.log(updateBaselines ? 'Visual baselines updated.' : 'Visual regression passed.');
}

async function toVisualSignature(page, visualCase) {
  await stabilizePage(page);
  const screenshot = await page.screenshot({ fullPage: false });
  const summary = await page.evaluate(() => {
    const selectors = ['.app-header', '.card', '#quiz-root', '#start-btn', '.question-box', '.feedback', '.results-card', '.auth-widget'];
    const elements = selectors.map(selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        selector,
        text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        visible: rect.width > 0 && rect.height > 0,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      };
    }).filter(Boolean);
    return {
      title: document.title,
      bodyTextHash: hashText(document.body.innerText || ''),
      elements
    };

    function hashText(text) {
      let hash = 0;
      for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
      }
      return String(hash);
    }
  });
  return {
    name: visualCase.name,
    file: visualCase.file,
    viewport: page.viewportSize(),
    screenshotSha256: sha256(screenshot),
    screenshotBytes: screenshot.length,
    summary
  };
}

async function stabilizePage(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `
  });
  await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
  await page.waitForTimeout(100);
}

async function startQuiz(page) {
  await page.click('#start-btn');
  await page.waitForSelector('.choice-btn', { state: 'visible' });
}

async function answerQuestion(page) {
  await startQuiz(page);
  await page.locator('.confidence-btn').last().click();
  await page.locator('.choice-btn').first().click();
  await page.waitForSelector('.feedback-box', { state: 'visible' });
}

async function finishQuiz(page) {
  await startQuiz(page);
  for (let index = 0; index < 80; index += 1) {
    if (await page.locator('.results-card').count()) break;
    if (!(await page.locator('.choice-btn').count())) break;
    if (await page.locator('.confidence-btn:not([disabled])').count()) {
      await page.locator('.confidence-btn:not([disabled])').last().click();
    }
    if (await page.locator('.choice-btn:not([disabled])').count()) {
      await page.locator('.choice-btn:not([disabled])').first().click();
    }
    if (await page.locator('#next-question-btn').count()) await page.click('#next-question-btn');
  }
  await page.waitForSelector('.results-box', { state: 'visible' });
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

async function runCase(failures, name, fn) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${name}`)), 25000))
    ]);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
  }
}

async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(12000);
  page.__qaErrors = [];
  await page.addInitScript(() => {
    let seed = 123456789;
    Math.random = function () {
      seed = (1103515245 * seed + 12345) % 2147483648;
      return seed / 2147483648;
    };
    window.GRAMMAR_QUEST_CONFIG = Object.assign({}, window.GRAMMAR_QUEST_CONFIG || {}, {
      disableServiceWorker: true
    });
  });
  page.on('pageerror', error => page.__qaErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') page.__qaErrors.push(message.text());
  });
  return page;
}

async function visitClean(page, baseURL, file) {
  await page.goto(`${baseURL}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  assert.deepEqual(page.__qaErrors, [], `page errors on ${file}`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
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
    const server = http.createServer((request, response) => {
      const parsed = new URL(request.url, `http://127.0.0.1:${port}`);
      const pathname = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
      const filePath = path.resolve(repoRoot, `.${pathname}`);
      if (!filePath.startsWith(repoRoot)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      if (pathname === '/assets/firebase-config.js') {
        respond(response, 200, FIREBASE_CONFIG_STUB, 'text/javascript; charset=utf-8');
        return;
      }
      if (pathname === '/assets/auth-service.js') {
        respond(response, 200, AUTH_SERVICE_STUB, 'text/javascript; charset=utf-8');
        return;
      }
      fs.readFile(filePath, (error, contents) => {
        if (error) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }
        respond(response, 200, contents, getContentType(filePath));
      });
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        baseURL: `http://127.0.0.1:${port}`,
        close: () => new Promise(resolveClose => server.close(resolveClose))
      });
    });
  });
}

function respond(response, status, body, contentType) {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
