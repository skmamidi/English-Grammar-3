#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const {
  repoRoot,
  getCorePages,
  getRepresentativeSubtopicPages,
  getSubtopicPages
} = require('../scripts/qa/page-inventory');

const requestedPort = Number(process.env.QA_PORT) || 4173;

async function main() {
  const server = await startStaticServer(requestedPort);
  const executablePath = getChromeExecutablePath();
  const browser = await chromium.launch(Object.assign(
    { headless: true },
    executablePath ? { executablePath } : {}
  ));
  const failures = [];

  try {
    const corePages = getCorePages();
    const representativeSubtopics = getRepresentativeSubtopicPages();
    const allSubtopics = process.env.QA_ALL_SUBTOPICS ? getSubtopicPages() : [];

    for (const file of corePages) {
      await runCase(failures, `${file} renders without page-level errors`, async () => {
        const page = await newPage(browser);
        await visitClean(page, server.baseURL, file);
        await assertVisible(page, 'body', file);
        if (file === 'reports.html') await assertReportsPage(page, server.baseURL);
        await page.close();
      });
    }

    for (const file of representativeSubtopics) {
      await runCase(failures, `${file} starts, answers, and advances`, async () => {
        const page = await newPage(browser);
        await visitClean(page, server.baseURL, file);
        await assertQuizFlow(page, file);
        await page.close();
      });

      await runCase(failures, `${file} parent preview does not create progress`, async () => {
        const page = await newPage(browser);
        await visitClean(page, server.baseURL, `${file}?parentBrowse=1`);
        await assertParentPreview(page, file);
        await page.close();
      });
    }

    await runCase(failures, 'topics/sound-symbols/index.html spelling lab flow', async () => {
      const page = await newPage(browser);
      await visitClean(page, server.baseURL, 'topics/sound-symbols/index.html');
      await assertSpellingLabFlow(page);
      await page.close();
    });

    await runCase(failures, 'topics/sound-symbols/index.html spelling parent preview does not create progress', async () => {
      const page = await newPage(browser);
      await visitClean(page, server.baseURL, 'topics/sound-symbols/index.html?parentBrowse=1');
      await assertSpellingParentPreview(page);
      await page.close();
    });

    for (const file of allSubtopics) {
      await runCase(failures, `${file} all-subtopic smoke`, async () => {
        const page = await newPage(browser);
        await visitClean(page, server.baseURL, file);
        await assertVisible(page, '#quiz-root', file);
        const text = await textContent(page, '#quiz-root');
        assert.match(text, /Start Quiz|Preview Questions|coming soon/i, file);
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
    process.exitCode = 1;
    return;
  }
  console.log('UI smoke passed.');
}

async function runCase(failures, name, fn) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timed out: ${name}`)), 15000);
      })
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
  await page.route('**/assets/firebase-config.js', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.GQ_FIREBASE_CONFIG = { enabled: false, authProviders: {}, firestore: {} };'
    });
  });
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

async function assertReportsPage(page, baseURL) {
  await assertVisible(page, '#student-list', 'reports.html');
  await page.evaluate(() => {
    localStorage.setItem('grammarQuestProgress', JSON.stringify({
      reports: {
        sessions: [{
          id: 'session-ui-smoke',
          studentName: 'Smoke Student',
          title: 'Sentence Types',
          topic: 'Grammar & Usage',
          score: 1,
          total: 1,
          completedAt: '2026-04-29T12:00:00.000Z',
          attempts: [{
            id: 'grammar-sentence-types-1',
            question: 'Which sentence is a command?',
            selectedChoice: 'Close the door.',
            correctChoice: 'Close the door.',
            correct: true,
            firstAttemptCorrect: true,
            skills: ['sentence types'],
            subtopicId: 'grammar-sentence-types',
            subtopicTitle: 'Sentence Types'
          }, {
            id: 'grammar-sentence-types-q0002',
            questionId: 'grammar-sentence-types-q0002',
            questionVersion: 1,
            questionHash: 'sha256:abcdef',
            sourceSet: 'grammar-sentence-types',
            sequence: 2,
            question: 'Which sentence asks something?',
            selectedChoice: 'Are you ready?',
            correctChoice: 'Are you ready?',
            correct: true,
            firstAttemptCorrect: true,
            skills: ['sentence types'],
            subtopicId: 'grammar-sentence-types',
            subtopicTitle: 'Sentence Types'
          }]
        }]
      }
    }));
  });
  await page.goto(`${baseURL}/reports.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  const roster = await textContent(page, '#student-list');
  assert.match(roster, /Smoke Student|Current Learner/);
}

async function assertQuizFlow(page, file) {
  await assertVisible(page, '#quiz-root', file);
  const startText = await textContent(page, '#quiz-root');
  assert.match(startText, /Start Quiz|Preview Questions|coming soon/i, file);
  if (!(await exists(page, '#start-btn'))) return;

  if (await exists(page, '#grade-select')) await assertVisible(page, '#grade-select', file);
  if (await exists(page, '#difficulty-select')) await assertVisible(page, '#difficulty-select', file);
  await page.click('#start-btn');
  await assertVisible(page, '.question-box', file);
  await page.click('.confidence-btn');
  await page.click('.choice-btn');
  assert.match(await textContent(page, '#feedback-area'), /Correct|Not quite/);
  const activeQuiz = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').activeQuiz);
  assert.ok(activeQuiz, `${file} should save an active quiz after answering`);
  assert.ok(Array.isArray(activeQuiz.questionRefs), `${file} should save questionRefs`);
  assert.ok(activeQuiz.questionRefs[0].id, `${file} questionRefs should include ids`);
  assert.ok(activeQuiz.questionRefs[0].version >= 1, `${file} questionRefs should include versions`);
  assert.ok(activeQuiz.questionRefs[0].contentHash, `${file} questionRefs should include hashes`);
  assert.ok(activeQuiz.attempts[0].questionId, `${file} attempts should include questionId`);
  assert.ok(activeQuiz.attempts[0].questionVersion >= 1, `${file} attempts should include questionVersion`);
  assert.ok(activeQuiz.attempts[0].questionHash, `${file} attempts should include questionHash`);
  await assertVisible(page, '#next-question-btn', file);
  await page.click('#next-question-btn');
  assert.match(await textContent(page, '#quiz-root'), /Question|Results|Score|Review/i);
}

async function assertParentPreview(page, file) {
  const before = await page.evaluate(() => localStorage.getItem('grammarQuestProgress'));
  if (await exists(page, '#start-btn')) {
    await page.click('#start-btn');
    assert.match(await textContent(page, '#quiz-root'), /Question|Preview/i, file);
  }
  const after = await page.evaluate(() => localStorage.getItem('grammarQuestProgress'));
  assert.equal(after, before, `${file} mutated progress during parent preview`);
}

async function assertSpellingLabFlow(page) {
  await assertVisible(page, '#spelling-root', 'spelling lab');
  await assertVisible(page, '.spelling-start', 'spelling lab');
  await assertVisible(page, '[data-grade-option="4"]', 'spelling grade option');
  await assertVisible(page, '[data-count-option="15"]', 'spelling count option');
  await assertVisible(page, '[data-difficulty-option="easy"]', 'spelling difficulty option');

  await page.click('[data-grade-option="4"]');
  await page.click('[data-count-option="15"]');
  await page.click('[data-difficulty-option="easy"]');
  await assertVisible(page, '#start-spelling', 'spelling start button');
  await page.click('#start-spelling');

  await assertVisible(page, '.spelling-question', 'spelling question');
  await assertVisible(page, '#speak-word', 'spelling play word button');
  await assertVisible(page, '#speak-word-slow', 'spelling play slowly button');
  await assertVisible(page, '#speak-clue', 'spelling clue button');
  await assertVisible(page, '#hint-button', 'spelling hint button');
  await assertVisible(page, '#spelling-answer', 'spelling answer input');
  await assertVisible(page, '#spelling-form button[type="submit"]', 'spelling submit button');

  await page.click('#hint-button');
  assert.ok((await textContent(page, '#hint-panel')).trim().length > 0, 'spelling hint panel should render hint text');
  await page.fill('#spelling-answer', 'zzzzzz');
  await page.click('#spelling-form button[type="submit"]');

  await assertVisible(page, '#feedback-area .feedback-box', 'spelling feedback');
  assert.match(await textContent(page, '#feedback-area'), /Target word:|Good try|Correct/i);
  if (await exists(page, '#correction-answer')) {
    const target = await page.$eval('#feedback-area', node => {
      const match = (node.textContent || '').match(/Target word:\s*([^\s]+)/i);
      return match ? match[1] : '';
    });
    assert.ok(target, 'target spelling should be visible after a miss');
    await page.fill('#correction-answer', target);
    await page.click('#correction-replay button[type="submit"]');
    assert.match(await textContent(page, '#correction-message'), /Locked in/i);
  }
  await assertVisible(page, '#next-word', 'spelling next button');
  assert.equal(await page.$eval('#next-word', button => button.disabled), false, 'next word should be enabled after correct answer or repair');
  await page.click('#next-word');
  assert.match(await textContent(page, '#spelling-root'), /Word 2 of|Lab Report Complete/i);
}

async function assertSpellingParentPreview(page) {
  await assertVisible(page, '#spelling-root', 'spelling parent preview');
  assert.match(await textContent(page, '#spelling-root'), /Parent Question Preview|Preview Spelling Lab/i);
  const before = await page.evaluate(() => localStorage.getItem('grammarQuestProgress'));
  await page.click('#start-spelling');
  await assertVisible(page, '.spelling-question', 'spelling parent preview question');
  const afterStart = await page.evaluate(() => localStorage.getItem('grammarQuestProgress'));
  assert.equal(afterStart, before, 'spelling parent preview start mutated progress');

  await page.fill('#spelling-answer', 'zzzzzz');
  await page.click('#spelling-form button[type="submit"]');
  await assertVisible(page, '#feedback-area .feedback-box', 'spelling parent preview feedback');
  const afterAnswer = await page.evaluate(() => localStorage.getItem('grammarQuestProgress'));
  assert.equal(afterAnswer, before, 'spelling parent preview answer mutated progress');
}

async function assertVisible(page, selector, label) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 })
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

function getChromeExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate)) || '';
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
      fs.readFile(filePath, (error, data) => {
        if (error) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }
        response.writeHead(200, { 'Content-Type': getContentType(filePath) });
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
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
