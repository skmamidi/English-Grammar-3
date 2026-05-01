#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const { createQuestionSelectionApiHarness } = require('./helpers/question-selection-api-harness');
const { formatOfflineSmokeResourceErrors } = require('./helpers/offline-smoke-errors');

const repoRoot = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.QA_PROGRESSIVE_PORT) || 4197;
const FIREBASE_CONFIG_STUB = 'window.GQ_FIREBASE_CONFIG = { enabled: false, authProviders: {}, firestore: {} };';

async function main() {
  const harness = createQuestionSelectionApiHarness({ repoRoot });
  const server = await startStaticServer(requestedPort, harness);
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const failures = [];

  try {
    await runCase(failures, 'blocked telemetry script still lets mixed quiz start through chunk fallback', async () => {
      const page = await newPage(browser, {
        enableServerQuestionSelection: true,
        selectionTelemetry: true
      });
      await blockAsset(page, '/assets/question-selection-telemetry.js');
      await visitClean(page, server.baseURL, 'topics/grammar/index.html', { allowOptionalFeatureFailures: true });
      await page.click('.mixed-quiz-panel a');
      await assertVisible(page, '#start-btn', 'mixed quiz after blocked telemetry');
      assert.match(await page.locator('#quiz-root').innerText(), /Start Quiz/i);
      await page.close();
    });

    await runCase(failures, 'blocked auth service leaves local signed-out quiz mode usable', async () => {
      const page = await newPage(browser);
      await blockAsset(page, '/assets/auth-service.js');
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html', { allowOptionalFeatureFailures: true });
      await assertVisible(page, '#start-btn', 'subtopic local mode without auth');
      await page.click('#start-btn');
      await assertVisible(page, '.question-box', 'quiz question without auth');
      await page.close();
    });

    await runCase(failures, 'blocked preloader does not block topic browsing or required chunks', async () => {
      const page = await newPage(browser, { enableQuestionChunkPreload: true });
      await blockAsset(page, '/assets/question-preloader.js');
      await visitClean(page, server.baseURL, 'topics/grammar/index.html', { allowOptionalFeatureFailures: true });
      await assertVisible(page, '.subtopic-list', 'topic index after blocked preloader');
      await page.click('.mixed-quiz-panel a');
      await assertVisible(page, '#start-btn', 'mixed quiz after blocked preloader');
      await page.close();
    });

    await runCase(failures, 'service worker registration failure shows degraded offline state while home navigation works', async () => {
      const page = await newPage(browser, { serviceWorkerRegisterFails: true });
      await visitClean(page, server.baseURL, 'index.html');
      await assertVisible(page, '.topic-card', 'home navigation after service worker failure');
      await page.waitForSelector('[data-progressive-enhancement="service-worker-registration"]', { state: 'visible' });
      const bannerText = await page.locator('[data-progressive-enhancement="service-worker-registration"]').innerText();
      assert.match(bannerText, /Offline support is unavailable/i);
      await page.close();
    });

    await runCase(failures, 'blocked required question chunk renders explicit recovery state', async () => {
      const page = await newPage(browser);
      await blockAsset(page, '/assets/question-chunks/grammar/grammar-sentence-types.js');
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html', { allowRequiredQuestionChunkFailure: true });
      const message = await page.locator('#quiz-root').innerText();
      assert.match(message, /required question file/i);
      assert.match(message, /Refresh/i);
      await page.close();
    });
  } finally {
    await browser.close();
    await server.close();
  }

  if (failures.length) {
    failures.forEach(failure => {
      console.error(`FAIL ${failure.name}`);
      console.error(failure.error.stack || failure.error.message || failure.error);
    });
    process.exit(1);
  }
  console.log('Progressive enhancement smoke passed.');
}

async function runCase(failures, name, fn) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${name}`)), 20000))
    ]);
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message || error);
    failures.push({ name, error });
  }
}

async function newPage(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(10000);
  page.__qaErrors = [];
  page.__qaResourceErrors = [];
  page.on('pageerror', error => page.__qaErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') page.__qaErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      page.__qaResourceErrors.push({ url: response.url(), status: response.status() });
    }
  });
  page.on('requestfailed', request => {
    page.__qaResourceErrors.push({
      url: request.url(),
      failure: request.failure() && request.failure().errorText
    });
  });
  await page.addInitScript(config => {
    window.GRAMMAR_QUEST_CONFIG = Object.assign({}, window.GRAMMAR_QUEST_CONFIG, {
      disableServiceWorker: !config.serviceWorkerRegisterFails,
      enableQuestionChunkPreload: Boolean(config.enableQuestionChunkPreload),
      enableServerQuestionSelection: Boolean(config.enableServerQuestionSelection),
      questionSelectionApiUrl: '/api/question-selection',
      serverQuestionSelectionPilotDomains: ['grammar'],
      selectionTelemetry: config.selectionTelemetry ? { enabled: true, sampleRate: 1 } : undefined
    });
    if (config.serviceWorkerRegisterFails && navigator.serviceWorker) {
      navigator.serviceWorker.register = function () {
        return Promise.reject(new Error('simulated registration failure'));
      };
    }
  }, options);
  await page.route('**/assets/firebase-config.js', route => {
    route.fulfill({ status: 200, contentType: 'text/javascript', body: FIREBASE_CONFIG_STUB });
  });
  const closePage = page.close.bind(page);
  page.close = async () => {
    await closePage().catch(() => {});
    await context.close().catch(() => {});
  };
  return page;
}

async function blockAsset(page, pathname) {
  await page.route(`**${pathname}`, route => {
    route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'blocked by progressive enhancement smoke'
    });
  });
}

async function visitClean(page, baseURL, file, options = {}) {
  page.__qaErrors = [];
  page.__qaResourceErrors = [];
  await page.goto(`${baseURL}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  const resourceErrors = formatOfflineSmokeResourceErrors(page.__qaResourceErrors, options);
  const consoleErrors = page.__qaErrors.filter(error => !/Failed to load resource/i.test(String(error)));
  assert.deepEqual(resourceErrors, [], `resource errors on ${file}:\n${resourceErrors.join('\n')}`);
  assert.deepEqual(consoleErrors, [], `page errors on ${file}`);
}

async function assertVisible(page, selector, label) {
  await page.waitForSelector(selector, { state: 'visible' });
  assert.equal(await page.locator(selector).first().isVisible(), true, `${label} should show ${selector}`);
}

function getChromiumLaunchOptions() {
  return Object.assign(
    { headless: true },
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}
  );
}

function startStaticServer(port, harness) {
  return new Promise((resolve, reject) => {
    const sockets = new Set();
    const server = http.createServer((request, response) => {
      const parsed = new URL(request.url, `http://127.0.0.1:${port}`);
      if (parsed.pathname === '/api/question-selection') {
        handleQuestionSelectionApi(request, response, parsed, harness);
        return;
      }
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
        startStaticServer(port + 1, harness).then(resolve, reject);
        return;
      }
      reject(error);
    });
    server.listen(port, '127.0.0.1', () => {
      resolve({
        baseURL: `http://127.0.0.1:${port}`,
        close: () => new Promise(done => {
          sockets.forEach(socket => socket.destroy());
          server.close(done);
        })
      });
    });
  });
}

function handleQuestionSelectionApi(request, response, parsed, harness) {
  if (request.method !== 'POST') {
    response.writeHead(405);
    response.end('Method not allowed');
    return;
  }

  let body = '';
  request.on('data', chunk => {
    body += chunk;
  });
  request.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const result = await harness.buildResponse(payload, {
        signed: parsed.searchParams.get('signed') === '1',
        tamper: parsed.searchParams.get('tamper') === '1',
        tamperSignature: parsed.searchParams.get('tamperSignature') === '1'
      });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: error.message }));
    }
  });
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
