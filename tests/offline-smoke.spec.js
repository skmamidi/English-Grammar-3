#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const serviceWorkerCore = require('../assets/service-worker-core');
const manifest = require('../assets/question-manifest.json');
const { formatOfflineSmokeResourceErrors } = require('./helpers/offline-smoke-errors');

const repoRoot = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.QA_OFFLINE_PORT) || 4193;
const CACHED_SUBTOPIC = 'topics/grammar/subtopics/sentence-types.html';
const UNCACHED_SUBTOPIC = 'topics/grammar/subtopics/run-on-sentences.html';
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

async function main() {
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const failures = [];

  try {
    await runCase(failures, 'cached subtopic quiz reloads while offline', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await newPage(context);

      await registerAndControlServiceWorker(page, server.baseURL);
      await visitClean(page, server.baseURL, CACHED_SUBTOPIC);
      await assertVisible(page, '#start-btn', CACHED_SUBTOPIC);

      await context.setOffline(true);
      await visitClean(page, server.baseURL, CACHED_SUBTOPIC);
      await assertVisible(page, '#start-btn', `${CACHED_SUBTOPIC} offline`);
      await page.click('#start-btn');
      await page.waitForSelector('.choice-btn', { state: 'visible' });
      const choices = await page.locator('.choice-btn').count();
      assert.ok(choices >= 2, 'cached offline quiz should render choices');

      await context.close();
    });

    await runCase(failures, 'uncached question chunk shows explicit offline fallback', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await newPage(context);

      await registerAndControlServiceWorker(page, server.baseURL);
      await cacheStaticPageShell(page, UNCACHED_SUBTOPIC);
      await deleteCachedQuestionChunk(page, 'grammar-run-on-sentences');

      await context.setOffline(true);
      await visitClean(page, server.baseURL, UNCACHED_SUBTOPIC, { allowOfflineResourceErrors: true });
      const message = await page.locator('#quiz-root').innerText();
      assert.match(message, /unavailable offline/i);
      assert.match(message, /loaded once/i);

      await context.close();
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
    process.exitCode = 1;
    return;
  }
  console.log('Offline smoke passed.');
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

async function newPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(10000);
  page.__qaErrors = [];
  page.__qaResourceErrors = [];
  page.on('pageerror', error => page.__qaErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') {
      page.__qaErrors.push({
        text: message.text(),
        location: message.location()
      });
    }
  });
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      page.__qaResourceErrors.push({
        url: response.url(),
        status
      });
    }
  });
  page.on('requestfailed', request => {
    page.__qaResourceErrors.push({
      url: request.url(),
      failure: request.failure() && request.failure().errorText
    });
  });
  return page;
}

async function registerAndControlServiceWorker(page, baseURL) {
  await visitClean(page, baseURL, 'index.html');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });
    }
    if (!navigator.serviceWorker.controller) throw new Error('service worker controller is required for offline smoke');
  });
}

async function cacheStaticPageShell(page, file) {
  const sourceHash = manifest.artifact.sourceHash;
  const cacheNames = serviceWorkerCore.buildCacheNames(sourceHash);
  await page.evaluate(async ({ cacheName, url }) => {
    const cache = await caches.open(cacheName);
    await cache.add(`/${url}`);
  }, { cacheName: cacheNames.static, url: file });
}

async function deleteCachedQuestionChunk(page, setId) {
  const sourceHash = manifest.artifact.sourceHash;
  const cacheNames = serviceWorkerCore.buildCacheNames(sourceHash);
  const entry = manifest.sets.find(set => set.id === setId);
  assert.ok(entry && entry.chunkFile, `${setId} should have a chunk file`);
  await page.evaluate(async ({ cacheName, chunkFile }) => {
    const cache = await caches.open(cacheName);
    const url = new URL(`/${chunkFile}`, window.location.origin).href;
    await cache.delete(url);
  }, { cacheName: cacheNames.chunks, chunkFile: entry.chunkFile });
}

async function visitClean(page, baseURL, file, options = {}) {
  page.__qaErrors = [];
  page.__qaResourceErrors = [];
  await page.goto(`${baseURL}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  const resourceErrors = formatOfflineSmokeResourceErrors(page.__qaResourceErrors, options);
  const consoleErrors = page.__qaErrors
    .filter(error => !isBrowserResourceConsoleError(error));
  assert.deepEqual(resourceErrors, [], `resource errors on ${file}:\n${resourceErrors.join('\n')}`);
  assert.deepEqual(consoleErrors, [], `page errors on ${file}`);
}

function isBrowserResourceConsoleError(error) {
  const text = typeof error === 'string' ? error : error && error.text || '';
  return /Failed to load resource/i.test(text);
}

async function assertVisible(page, selector, label) {
  await page.waitForSelector(selector, { state: 'visible' });
  assert.equal(await page.locator(selector).isVisible(), true, `${label} should show ${selector}`);
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
        response.writeHead(200, {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Content-Length': Buffer.byteLength(FIREBASE_CONFIG_STUB)
        });
        response.end(FIREBASE_CONFIG_STUB);
        return;
      }
      if (pathname === '/assets/auth-service.js') {
        response.writeHead(200, {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Content-Length': Buffer.byteLength(AUTH_SERVICE_STUB)
        });
        response.end(AUTH_SERVICE_STUB);
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
        close: () => new Promise(done => server.close(done))
      });
    });
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
  process.exitCode = 1;
});
