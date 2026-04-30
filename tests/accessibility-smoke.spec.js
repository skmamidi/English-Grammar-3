#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.QA_A11Y_PORT) || 4183;
const A11Y_PAGES = [
  'index.html',
  'admin-operations.html',
  'topics/grammar/index.html',
  'topics/grammar/subtopics/sentence-types.html',
  'reports.html',
  'character-library.html'
];

async function main() {
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const failures = [];

  try {
    for (const file of A11Y_PAGES) {
      await runCase(failures, `${file} has labeled controls and visible focus`, async () => {
        const page = await newPage(browser);
        await visitClean(page, server.baseURL, file);
        await assertControlsHaveAccessibleNames(page, file);
        await assertFocusedControlIsVisible(page, file);
        if (file.includes('/subtopics/')) await assertAnswerButtonsAreAccessible(page, file);
        await page.close();
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
    process.exit(1);
  }
  console.log('Accessibility smoke passed.');
  process.exit(0);
}

async function runCase(failures, name, fn) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${name}`)), 15000))
    ]);
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message || error);
    failures.push({ name, error });
  }
}

async function newPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(8000);
  await page.addInitScript(() => {
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
  page.__qaErrors = [];
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

async function assertControlsHaveAccessibleNames(page, file) {
  const failures = await page.evaluate(() => {
    const controls = Array.from(document.querySelectorAll('button, a[href], input, select, textarea'));
    return controls
      .filter(control => {
        const rect = control.getBoundingClientRect();
        const style = window.getComputedStyle(control);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .filter(control => !getAccessibleName(control))
      .map(control => control.outerHTML.slice(0, 160));

    function getAccessibleName(control) {
      const labelledBy = control.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy.split(/\s+/).map(id => {
          const label = document.getElementById(id);
          return label ? label.textContent.trim() : '';
        }).join(' ').trim();
        if (text) return text;
      }
      if (control.getAttribute('aria-label')) return control.getAttribute('aria-label').trim();
      if (control.id) {
        const label = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
        if (label && label.textContent.trim()) return label.textContent.trim();
      }
      if (control instanceof HTMLInputElement && control.placeholder) return control.placeholder.trim();
      return control.textContent.trim();
    }
  });
  assert.deepEqual(failures, [], `${file} has controls without accessible names`);
}

async function assertFocusedControlIsVisible(page, file) {
  await page.keyboard.press('Tab');
  const result = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return { ok: false, reason: 'no focused control' };
    const rect = active.getBoundingClientRect();
    const style = window.getComputedStyle(active);
    const outline = Number.parseFloat(style.outlineWidth) || 0;
    const boxShadow = style.boxShadow && style.boxShadow !== 'none';
    return {
      ok: rect.width > 0 && rect.height > 0 && (outline > 0 || boxShadow),
      reason: active.outerHTML.slice(0, 160)
    };
  });
  assert.equal(result.ok, true, `${file} first keyboard focus is not visibly indicated: ${result.reason}`);
}

async function assertAnswerButtonsAreAccessible(page, file) {
  await page.click('#start-btn');
  await page.waitForSelector('.choice-btn', { state: 'visible' });
  if (await page.$('.confidence-btn')) await page.click('.confidence-btn');
  const result = await page.evaluate(() => Array.from(document.querySelectorAll('.choice-btn')).map(button => ({
    text: button.textContent.trim(),
    role: button.getAttribute('role'),
    disabled: button.disabled,
    tabIndex: button.tabIndex
  })));
  assert.ok(result.length >= 2, `${file} should render answer buttons`);
  result.forEach(button => {
    assert.ok(button.text.length > 0, `${file} answer button should have text`);
    assert.equal(button.disabled, false, `${file} answer button should be keyboard operable`);
    assert.ok(button.tabIndex >= 0, `${file} answer button should be reachable by keyboard`);
  });
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
        close: () => new Promise(done => {
          sockets.forEach(socket => socket.destroy());
          server.close(done);
        })
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

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
