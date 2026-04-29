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
  getSubtopicPages,
  getTopicIndexPages
} = require('../scripts/qa/page-inventory');
const {
  assertPageBudget,
  createRequestRecorder
} = require('./helpers/request-metrics');

const requestedPort = Number(process.env.QA_PORT) || 4173;
const TOPIC_INDEX_BUDGET = {
  forbidFullBanks: true,
  questionPayloadBytes: 100 * 1024
};
const PAGE_BUDGETS = {
  'topics/capitalization/subtopics/proper-names-titles.html': {
    forbiddenFullBanks: ['assets/question-banks/capitalization.js'],
    questionPayloadBytes: 200 * 1024
  },
  'topics/reference-skills/subtopics/alphabetical-order.html': {
    forbiddenFullBanks: ['assets/question-banks/reference-skills.js'],
    questionPayloadBytes: 350 * 1024
  }
};

async function main() {
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const failures = [];

  try {
    const corePages = getCorePages();
    const topicIndexes = getTopicIndexPages();
    const manifestTopicIndexes = topicIndexes.filter(file => {
      return fs.readFileSync(path.join(repoRoot, file), 'utf8').includes('assets/topic-index.js');
    });
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

    for (const file of manifestTopicIndexes) {
      await runCase(failures, `${file} uses manifest metadata without full topic bank`, async () => {
        const page = await newPage(browser);
        const recorder = createRequestRecorder(page);
        await visitClean(page, server.baseURL, file);
        await assertManifestBackedTopicIndex(page, recorder.requests, file);
        assertPageBudget(assert, file, recorder.summarize(), TOPIC_INDEX_BUDGET);
        await page.close();
      });
    }

    await runCase(failures, 'topics/capitalization/subtopics/proper-names-titles.html stays under question payload budget', async () => {
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      const page = await newPage(browser);
      const recorder = createRequestRecorder(page);
      await visitClean(page, server.baseURL, file);
      await assertPilotChunkRequests(page, recorder.requests, file);
      assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
      await page.close();
    });

    await runCase(failures, 'topics/reference-skills/subtopics/alphabetical-order.html stays under question payload budget', async () => {
      const file = 'topics/reference-skills/subtopics/alphabetical-order.html';
      const page = await newPage(browser);
      const recorder = createRequestRecorder(page);
      await visitClean(page, server.baseURL, file);
      await assertReferenceSkillsChunkRequests(page, recorder.requests, file);
      assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
      await page.close();
    });

    await runCase(failures, 'topics/grammar/index.html lazy-loads mixed quiz questions on demand', async () => {
      const page = await newPage(browser);
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      await visitClean(page, server.baseURL, 'topics/grammar/index.html');
      await page.click('.mixed-quiz-panel a');
      await assertVisible(page, '#start-btn', 'grammar mixed quiz');
      assert.ok(
        requests.some(url => url.endsWith('/assets/question-loader.js')),
        'mixed quiz should load question loader after launch'
      );
      assert.ok(
        requests.some(url => url.endsWith('/assets/question-banks/grammar.js')),
        'legacy mixed quiz should load grammar bank through loader fallback after launch'
      );
      assert.ok(
        requests.some(url => url.endsWith('/assets/quiz-engine.js')),
        'mixed quiz should load quiz engine after launch'
      );
      await page.close();
    });

    await runCase(failures, 'topics/capitalization/index.html mixed quiz loads selected chunks instead of full bank', async () => {
      const page = await newPage(browser);
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      await visitClean(page, server.baseURL, 'topics/capitalization/index.html');
      await page.click('.mixed-quiz-panel a');
      await assertVisible(page, '#start-btn', 'capitalization mixed quiz');
      assert.ok(
        requests.some(url => url.endsWith('/assets/question-loader.js')),
        'chunked mixed quiz should load question loader after launch'
      );
      assert.ok(
        requests.some(url => url.includes('/assets/question-chunks/capitalization/')),
        'chunked mixed quiz should request capitalization chunks'
      );
      assert.equal(
        requests.some(url => url.endsWith('/assets/question-banks/capitalization.js')),
        false,
        'chunked mixed quiz should not request the full capitalization bank'
      );
      await page.close();
    });

    await runCase(failures, 'capitalization pilot subtopic loads only its chunk', async () => {
      const page = await newPage(browser);
      const recorder = createRequestRecorder(page);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, file);
      await assertPilotChunkRequests(page, recorder.requests, file);
      assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
      await assertQuizFlow(page, file);
      await page.close();
    });

    await runCase(failures, 'reference skills subtopic uses chunk and not full bank', async () => {
      const page = await newPage(browser);
      const recorder = createRequestRecorder(page);
      const file = 'topics/reference-skills/subtopics/alphabetical-order.html';
      await visitClean(page, server.baseURL, file);
      await assertReferenceSkillsChunkRequests(page, recorder.requests, file);
      assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
      await assertQuizFlow(page, file);
      await page.close();
    });

    await runCase(failures, 'legacy grammar subtopic still loads its topic bank', async () => {
      const page = await newPage(browser);
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      const file = 'topics/grammar/subtopics/sentence-types.html';
      await visitClean(page, server.baseURL, file);
      await assertLegacyBankRequests(page, requests, file);
      await assertQuizFlow(page, file);
      await page.close();
    });

    await runCase(failures, 'loader-backed active quiz can be resumed', async () => {
      const page = await newPage(browser);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, file);
      await assertLoaderBackedResume(page, file);
      await page.close();
    });

    await runCase(failures, 'active quiz resume falls back to snapshots when refs cannot load', async () => {
      const page = await newPage(browser);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, file);
      await assertSnapshotFallbackResume(page, file, {
        questionRefs: [{ id: 'missing-q0001', version: 1, contentHash: 'sha256:missing', sourceSet: 'missing-source-set', sequence: 1 }],
        questionText: 'Snapshot fallback question: choose the saved answer.'
      });
      await page.close();
    });

    await runCase(failures, 'active quiz resume uses snapshots when ref hashes changed', async () => {
      const page = await newPage(browser);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, file);
      await assertSnapshotFallbackResume(page, file, {
        questionRefs: [{ id: 'capitalization-proper-names-titles-q0001', version: 1, contentHash: 'sha256:stale', sourceSet: 'capitalization-proper-names-titles', sequence: 1 }],
        questionText: 'Snapshot hash mismatch question: choose the saved answer.'
      });
      await page.close();
    });

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

    if (representativeSubtopics.length) {
      await runCase(failures, `${representativeSubtopics[0]} completion preserves question reports`, async () => {
        const page = await newPage(browser);
        await visitClean(page, server.baseURL, representativeSubtopics[0]);
        await assertQuizCompletionPreservesQuestionReports(page, representativeSubtopics[0]);
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
        const recorder = createRequestRecorder(page);
        await visitClean(page, server.baseURL, file);
        await assertVisible(page, '#quiz-root', file);
        const text = await textContent(page, '#quiz-root');
        assert.match(text, /Start Quiz|Preview Questions|coming soon/i, file);
        assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
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
    localStorage.clear();
    const progress = JSON.stringify({
      reports: {
        sessions: [{
          id: 'session-ui-smoke',
          studentId: 'current-learner',
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
        }],
        questionReports: [{
          id: 'question-report-dashboard',
          studentId: 'current-learner',
          studentName: 'Smoke Student',
          status: 'open',
          questionId: 'grammar-sentence-types-q0002',
          questionVersion: 1,
          questionHash: 'sha256:abcdef',
          reason: 'answer_or_explanation',
          question: 'Which sentence asks something?',
          selectedChoice: 'Are you ready?',
          correctChoice: 'Are you ready?',
          choices: ['Are you ready?', 'Close the door.'],
          selectedIndex: 0,
          correctIndex: 0,
          sourceSet: 'grammar-sentence-types',
          sequence: 2,
          createdAt: '2026-04-29T12:02:00.000Z',
          updatedAt: '2026-04-29T12:02:00.000Z'
        }]
      }
    });
    localStorage.setItem('grammarQuestProgress', progress);
    localStorage.setItem('grammarQuestProgress:current-learner', progress);
  });
  await page.goto(`${baseURL}/reports.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  const roster = await textContent(page, '#student-list');
  assert.match(roster, /Smoke Student|Current Learner/);

  await page.click('.report-tab[data-view="reported"]');
  await assertVisible(page, '[data-report-id="question-report-dashboard"]', 'reports.html reported questions');
  await page.selectOption('[data-report-review-status]', 'resolved');
  await page.fill('[data-report-review-note]', 'Reviewed by QA');
  await page.click('[data-save-report-review]');
  await page.waitForFunction(() => {
    const key = window.GrammarQuestProgress && window.GrammarQuestProgress.getStorageKey
      ? window.GrammarQuestProgress.getStorageKey()
      : 'grammarQuestProgress';
    const progress = JSON.parse(localStorage.getItem(key) || '{}');
    const report = progress.reports && progress.reports.questionReports && progress.reports.questionReports[0];
    return report && report.id === 'question-report-dashboard' && report.status === 'resolved';
  });
  const reviewed = await page.evaluate(() => {
    const key = window.GrammarQuestProgress && window.GrammarQuestProgress.getStorageKey
      ? window.GrammarQuestProgress.getStorageKey()
      : 'grammarQuestProgress';
    return JSON.parse(localStorage.getItem(key) || '{}').reports.questionReports[0];
  });
  assert.equal(reviewed.id, 'question-report-dashboard');
  assert.equal(reviewed.questionId, 'grammar-sentence-types-q0002');
  assert.equal(reviewed.grownupNote, 'Reviewed by QA');
}

async function assertManifestBackedTopicIndex(page, requests, file) {
  await assertVisible(page, '.subtopic-list', file);
  const listText = await textContent(page, '.subtopic-list');
  assert.match(listText, /Adaptive practice/, `${file} should render practice labels`);
  assert.equal(
    await page.evaluate(() => !!window.QUESTION_BANK),
    false,
    `${file} should not have a full question bank during index render`
  );
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-manifest.js')),
    `${file} should request manifest metadata`
  );
  assert.equal(
    requests.some(url => /\/assets\/question-banks\/[^/]+\.js$/.test(url)),
    false,
    `${file} should not request a full question bank on index load`
  );
  assert.equal(
    requests.some(url => url.endsWith('/assets/quiz-engine.js')),
    false,
    `${file} should not request quiz engine before mixed quiz starts`
  );
}

async function assertQuizFlow(page, file) {
  await assertVisible(page, '#quiz-root', file);
  const startText = await textContent(page, '#quiz-root');
  assert.match(startText, /Start Quiz|Preview Questions|coming soon/i, file);
  if (!(await exists(page, '#start-btn'))) return;
  assert.equal(
    await page.evaluate(() => typeof window.GrammarQuestQuizDomain),
    'object',
    `${file} should load the shared quiz domain before quiz start`
  );

  if (await exists(page, '#grade-select')) await assertVisible(page, '#grade-select', file);
  if (await exists(page, '#difficulty-select')) await assertVisible(page, '#difficulty-select', file);
  await page.click('#start-btn');
  await assertVisible(page, '.question-box', file);
  await assertVisible(page, '.visual-question-scene', `${file} visual question scene`);
  await page.click('.confidence-btn');
  await page.click('.choice-btn');
  assert.match(await textContent(page, '#feedback-area'), /Correct|Not quite/);
  const activeQuiz = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').activeQuiz);
  assert.ok(activeQuiz, `${file} should save an active quiz after answering`);
  assert.equal(activeQuiz.schemaVersion, 2, `${file} should save active quiz schema v2`);
  assert.ok(Array.isArray(activeQuiz.questionRefs), `${file} should save questionRefs`);
  assert.ok(Array.isArray(activeQuiz.questionSnapshots), `${file} should save questionSnapshots`);
  assert.equal(activeQuiz.questions, undefined, `${file} should not save full questions as the primary active quiz list`);
  assert.ok(activeQuiz.questionRefs[0].id, `${file} questionRefs should include ids`);
  assert.ok(activeQuiz.questionRefs[0].version >= 1, `${file} questionRefs should include versions`);
  assert.ok(activeQuiz.questionRefs[0].contentHash, `${file} questionRefs should include hashes`);
  assert.equal(activeQuiz.questionSnapshots[0].contentHash, activeQuiz.questionRefs[0].contentHash, `${file} snapshots should preserve question hashes`);
  assert.ok(activeQuiz.questionSnapshots[0].generatedVisualScene || activeQuiz.questionSnapshots[0].visualScene, `${file} should retain a renderable visual scene fallback`);
  if (activeQuiz.questionSnapshots[0].generatedVisualScene) {
    assert.equal(activeQuiz.questionSnapshots[0].visualScene, null, `${file} generated scene should not overwrite authored visualScene`);
  }
  assert.ok(activeQuiz.attempts[0].questionId, `${file} attempts should include questionId`);
  assert.ok(activeQuiz.attempts[0].questionVersion >= 1, `${file} attempts should include questionVersion`);
  assert.ok(activeQuiz.attempts[0].questionHash, `${file} attempts should include questionHash`);
  await assertVisible(page, '#next-question-btn', file);
  await page.click('#next-question-btn');
  assert.match(await textContent(page, '#quiz-root'), /Question|Results|Score|Review/i);
}

async function assertPilotChunkRequests(page, requests, file) {
  await assertVisible(page, '#start-btn', file);
  assert.equal(
    await page.evaluate(() => !!window.QUESTION_BANK && Object.keys(window.QUESTION_BANK).length),
    1,
    `${file} should hydrate only the requested chunk into QUESTION_BANK`
  );
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-manifest.js')),
    `${file} should request manifest metadata`
  );
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-loader.js')),
    `${file} should request the loader abstraction`
  );
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-chunks/capitalization/capitalization-proper-names-titles.js')),
    `${file} should request its capitalization chunk`
  );
  assert.equal(
    requests.some(url => url.endsWith('/assets/question-banks/capitalization.js')),
    false,
    `${file} should not request the full capitalization bank`
  );
}

async function assertReferenceSkillsChunkRequests(page, requests, file) {
  await assertVisible(page, '#start-btn', file);
  assert.equal(
    await page.evaluate(() => !!window.QUESTION_BANK && Object.keys(window.QUESTION_BANK).length),
    1,
    `${file} should hydrate only the requested reference-skills chunk into QUESTION_BANK`
  );
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-manifest.js')),
    `${file} should request manifest metadata`
  );
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-loader.js')),
    `${file} should request the loader abstraction`
  );
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-chunks/reference-skills/reference-skills-alphabetical-order.js')),
    `${file} should request its reference-skills chunk`
  );
  assert.equal(
    requests.some(url => url.endsWith('/assets/question-banks/reference-skills.js')),
    false,
    `${file} should not request the full reference-skills bank`
  );
}

async function assertLegacyBankRequests(page, requests, file) {
  await assertVisible(page, '#start-btn', file);
  assert.ok(
    requests.some(url => url.endsWith('/assets/question-banks/grammar.js')),
    `${file} should request the legacy grammar bank`
  );
  assert.equal(
    requests.some(url => url.includes('/assets/question-chunks/')),
    false,
    `${file} should not request question chunks`
  );
}

async function assertLoaderBackedResume(page, file) {
  await assertVisible(page, '#start-btn', file);
  await page.click('#start-btn');
  await assertVisible(page, '.question-box', file);
  await page.click('.confidence-btn');
  await page.click('.choice-btn');
  await assertVisible(page, '#next-question-btn', file);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await assertVisible(page, '#resume-quiz-btn', `${file} resume button`);
  await page.click('#resume-quiz-btn');
  await assertVisible(page, '.question-box', `${file} resumed question`);
  await assertVisible(page, '.quiz-progress', `${file} resumed progress`);
  const resumed = await page.evaluate(() => ({
    text: document.querySelector('.quiz-progress') && document.querySelector('.quiz-progress').textContent,
    activeQuiz: JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').activeQuiz
  }));
  assert.match(resumed.text, /Question 1 of|Question 2 of|Review/i);
  assert.ok(resumed.activeQuiz.questionRefs[0].id.startsWith('capitalization-proper-names-titles-q'));
  assert.equal(resumed.activeQuiz.schemaVersion, 2);
  assert.equal(resumed.activeQuiz.questions, undefined);
}

async function assertSnapshotFallbackResume(page, file, options) {
  await assertVisible(page, '#start-btn', file);
  const questionText = options.questionText;
  await page.evaluate(({ questionRefs, questionText }) => {
    const activeQuiz = {
      schemaVersion: 2,
      setId: 'capitalization-proper-names-titles',
      title: 'Proper Names and Titles of People',
      topic: 'Capitalization',
      grade: '4',
      difficulty: 'medium',
      questionRefs,
      questionSnapshots: [{
        id: 'snapshot-fallback-q0001',
        version: 1,
        contentHash: 'sha256:snapshot',
        question: questionText,
        choices: ['saved answer', 'other answer'],
        correct: 0,
        explanation: { correct: 'The saved snapshot is still renderable.', incorrect: ['', ''] },
        studyAid: null,
        visualScene: null,
        generatedVisualScene: null,
        metadata: { sourceSet: 'capitalization-proper-names-titles', sequence: 1, skills: ['resume fallback'] }
      }],
      currentIndex: 0,
      score: 0,
      combo: 0,
      reviewMode: false,
      hintsUsed: 0,
      confidenceStats: [],
      attempts: [],
      reviewAttempts: [],
      missedQuestions: [],
      startedAt: new Date().toISOString(),
      questionStartedAt: '',
      lastSavedAt: new Date().toISOString()
    };
    localStorage.setItem('grammarQuestProgress', JSON.stringify({ activeQuiz }));
  }, { questionRefs: options.questionRefs, questionText });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await assertVisible(page, '#resume-quiz-btn', `${file} resume button`);
  await page.click('#resume-quiz-btn');
  await assertVisible(page, '.question-box', `${file} resumed fallback question`);
  assert.match(await textContent(page, '#quiz-root'), new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

async function assertQuizCompletionPreservesQuestionReports(page, file) {
  await assertVisible(page, '#quiz-root', file);
  if (!(await exists(page, '#start-btn'))) return;
  await page.evaluate(() => {
    localStorage.setItem('grammarQuestProgress', JSON.stringify({
      reports: {
        sessions: [],
        questionReports: [{
          id: 'question-report-existing',
          status: 'open',
          questionId: 'grammar-sentence-types-q0001',
          questionVersion: 1,
          questionHash: 'sha256:abc',
          reason: 'answer_or_explanation',
          createdAt: '2026-04-29T12:00:00.000Z',
          updatedAt: '2026-04-29T12:00:00.000Z'
        }]
      }
    }));
  });

  await page.click('#start-btn');
  for (let step = 0; step < 30 && !(await exists(page, '#restart-btn')); step += 1) {
    await assertVisible(page, '.question-box', file);
    if (await exists(page, '.confidence-btn')) await page.click('.confidence-btn');
    await page.click('.choice-btn');
    if (await exists(page, '#restart-btn')) break;
    assert.match(await textContent(page, '#feedback-area'), /Correct|Not quite/);
    if (await exists(page, '#next-question-btn')) await page.click('#next-question-btn');
  }

  await assertVisible(page, '#restart-btn', `${file} results`);
  const reports = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').reports);
  assert.ok(Array.isArray(reports.sessions), `${file} should save sessions`);
  assert.equal(reports.sessions.length, 1, `${file} should append one session`);
  assert.ok(Array.isArray(reports.questionReports), `${file} should preserve questionReports`);
  assert.equal(reports.questionReports.length, 1, `${file} should keep the seeded question report`);
  assert.equal(reports.questionReports[0].id, 'question-report-existing');
  assert.equal(reports.questionReports[0].status, 'open');
  assert.equal(reports.questionReports[0].questionId, 'grammar-sentence-types-q0001');
  assert.equal(reports.questionReports[0].questionVersion, 1);
  assert.equal(reports.questionReports[0].questionHash, 'sha256:abc');
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
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
