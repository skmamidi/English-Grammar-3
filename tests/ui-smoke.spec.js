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
  createRequestRecorder,
  summarizeRequestMetrics
} = require('./helpers/request-metrics');
const {
  closeBrowserWithDiagnostics,
  closeServerWithTimeout,
  closeTrackedPagesAndContexts,
  createBrowserResourceTracker,
  newTrackedPage,
  runCase,
} = require('./helpers/smoke-runner');
const { createQuestionSelectionApiHarness } = require('./helpers/question-selection-api-harness');
const { MIXED_QUIZ_SERVER_SELECTION_DOMAINS } = require('../assets/question-selection-rollout');
const questionManifest = require('../assets/question-manifest.json');
const testKeys = require('./fixtures/selection-test-keys.json');

const requestedPort = Number(process.env.QA_PORT) || 4173;
const enableQuestionChunkPreload = Boolean(process.env.QUESTION_CHUNK_PRELOAD);
const questionSelectionApiHarness = createQuestionSelectionApiHarness({ repoRoot });
const TOPIC_INDEX_BUDGET = {
  forbidFullBanks: true,
  questionPayloadBytes: 100 * 1024
};
const PAGE_BUDGETS = {
  'topics/capitalization/subtopics/proper-names-titles.html': {
    forbiddenFullBanks: ['assets/question-banks/capitalization.js'],
    questionPayloadBytes: 250 * 1024
  },
  'topics/reference-skills/subtopics/alphabetical-order.html': {
    forbiddenFullBanks: ['assets/question-banks/reference-skills.js'],
    questionPayloadBytes: 350 * 1024
  },
  'topics/punctuation/subtopics/commas-series.html': {
    forbiddenFullBanks: ['assets/question-banks/punctuation.js'],
    questionPayloadBytes: 250 * 1024
  },
  'topics/vocabulary/subtopics/homophones.html': {
    forbiddenFullBanks: ['assets/question-banks/vocabulary.js'],
    questionPayloadBytes: 300 * 1024
  },
  'topics/reading-comprehension/subtopics/main-idea-supporting-details.html': {
    forbiddenFullBanks: ['assets/question-banks/reading-comprehension.js'],
    questionPayloadBytes: 700 * 1024
  },
  'topics/grammar/subtopics/sentence-types.html': {
    forbiddenFullBanks: ['assets/question-banks/grammar.js'],
    questionPayloadBytes: 300 * 1024
  }
};
const REPRESENTATIVE_CHUNK_PAGES = {
  'topics/capitalization/subtopics/proper-names-titles.html': {
    domain: 'capitalization',
    chunkFile: 'assets/question-chunks/capitalization/capitalization-proper-names-titles.js'
  },
  'topics/reference-skills/subtopics/alphabetical-order.html': {
    domain: 'reference-skills',
    chunkFile: 'assets/question-chunks/reference-skills/reference-skills-alphabetical-order.js'
  },
  'topics/punctuation/subtopics/commas-series.html': {
    domain: 'punctuation',
    chunkFile: 'assets/question-chunks/punctuation/punctuation-commas-series.js'
  },
  'topics/vocabulary/subtopics/homophones.html': {
    domain: 'vocabulary',
    chunkFile: 'assets/question-chunks/vocabulary/vocabulary-homophones.js'
  },
  'topics/reading-comprehension/subtopics/main-idea-supporting-details.html': {
    domain: 'reading-comprehension',
    chunkFile: 'assets/question-chunks/reading-comprehension/reading-comprehension-main-idea-supporting-details.js'
  },
  'topics/grammar/subtopics/sentence-types.html': {
    domain: 'grammar',
    chunkFile: 'assets/question-chunks/grammar/grammar-sentence-types.js'
  }
};
const DOMAIN_TOPIC_PAGES = {
  grammar: 'topics/grammar/index.html',
  capitalization: 'topics/capitalization/index.html',
  punctuation: 'topics/punctuation/index.html',
  'reading-comprehension': 'topics/reading-comprehension/index.html',
  'reference-skills': 'topics/reference-skills/index.html',
  vocabulary: 'topics/vocabulary/index.html'
};
const DOMAIN_MIXED_SELECTION_COUNTS = {
  grammar: 60,
  capitalization: 20,
  punctuation: 52,
  'reading-comprehension': 60,
  'reference-skills': 32,
  vocabulary: 60
};
const DOMAIN_API_RESPONSE_BYTE_BUDGETS = {
  grammar: 60 * 1024,
  capitalization: 24 * 1024,
  punctuation: 60 * 1024,
  'reading-comprehension': 60 * 1024,
  'reference-skills': 60 * 1024,
  vocabulary: 25 * 1024
};
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 }
};
const VIEWPORT_SMOKE_PAGES = [
  'index.html',
  'discovery.html',
  'assignments.html',
  'settings.html',
  'admin-operations.html',
  'topics/grammar/index.html',
  'topics/grammar/subtopics/sentence-types.html',
  'reports.html',
  'guardian-dashboard.html',
  'teacher-dashboard.html',
  'character-library.html'
];
async function main() {
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const browserTracker = createBrowserResourceTracker();
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
        const page = await newPage(browser, browserTracker);
        await visitClean(page, server.baseURL, file);
        await assertVisible(page, 'body', file);
        if (file === 'reports.html') await assertReportsPage(page, server.baseURL);
        if (file === 'admin-operations.html') await assertAdminOperationsPage(page);
        if (file === 'settings.html') await assertSettingsPage(page);
        await page.close();
      });
    }

    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      for (const file of VIEWPORT_SMOKE_PAGES) {
        await runCase(failures, `${file} has no ${viewportName} layout overflow`, async () => {
          const page = await newPage(browser, browserTracker, { viewport });
          await visitClean(page, server.baseURL, file);
          await assertNoHorizontalOverflow(page, `${file} ${viewportName}`);
          await assertTouchTargets(page, `${file} ${viewportName}`);
          if (file.includes('/subtopics/')) await assertQuizFlow(page, `${file} ${viewportName}`);
          await page.close();
        });
      }
    }

    await runCase(failures, 'mobile parent preview remains read-only', async () => {
      const page = await newPage(browser, browserTracker, { viewport: VIEWPORTS.mobile });
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, `${file}?parentBrowse=1`);
      await assertNoHorizontalOverflow(page, `${file} mobile parent preview`);
      await assertParentPreview(page, `${file} mobile parent preview`);
      await page.close();
    });

    await runCase(failures, 'session sign-out clears managed student selection without deleting progress', async () => {
      const page = await newPage(browser, browserTracker);
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html');
      await assertSessionSignedOutClearsManagedStudent(page);
      await page.close();
    });

    await runCase(failures, 'keyboard-only quiz answer flow works', async () => {
      const page = await newPage(browser, browserTracker);
      const file = 'topics/grammar/subtopics/sentence-types.html?practice=1';
      await visitClean(page, server.baseURL, file);
      await assertKeyboardQuizFlow(page, file);
      await page.close();
    });

    await runCase(failures, 'seeded assignment starts quiz and completes with saved session', async () => {
      const page = await newPage(browser, browserTracker);
      await visitClean(page, server.baseURL, 'assignments.html');
      await assertAssignmentCompletionFlow(page, server.baseURL);
      await page.close();
    });

    await runCase(failures, 'content discovery searches manifest only before practice starts', async () => {
      const page = await newPage(browser, browserTracker);
      const recorder = createRequestRecorder(page);
      await visitClean(page, server.baseURL, 'discovery.html');
      await page.fill('#content-search', 'homophones');
      await page.click('#content-discovery-form button[type="submit"]');
      await assertVisible(page, '.discovery-result', 'content discovery search result');
      const metrics = summarizeRequestMetrics({
        requests: recorder.requests,
        responses: recorder.responses
      });
      assert.equal(metrics.loadedFullBanks.length, 0);
      assert.equal(metrics.loadedChunks.length, 0);
      await page.click('.discovery-result a');
      await assertVisible(page, '#start-btn', 'content discovery practice route');
      await page.close();
    });

    await runCase(failures, 'story lesson opens before sentence types practice', async () => {
      const page = await newPage(browser, browserTracker);
      const recorder = createRequestRecorder(page);
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html');
      await assertVisible(page, '[data-story-lesson="grammar-sentence-types"]', 'sentence types story lesson');
      assert.match(await textContent(page, '#quiz-root'), /Learn First|Rules to Try|Guided Checks/i);
      assert.equal(await page.locator('#story-lesson-grade').inputValue(), '4');
      await page.selectOption('#story-lesson-grade', '5');
      assert.equal(await page.locator('#story-lesson-grade').inputValue(), '5');
      assert.ok(await page.locator('[data-related-set-id]').count() >= 1, 'story lesson should expose related lesson links');
      const metrics = summarizeRequestMetrics({ requests: recorder.requests, responses: recorder.responses });
      assert.deepEqual(metrics.loadedLessonChunks, ['assets/story-lesson-chunks/grammar/grammar-sentence-types.js']);
      assert.equal(metrics.loadedChunks.length, 0, 'story lesson should not load question chunks before practice handoff');
      assert.ok(metrics.lessonPayloadBytes > 0, 'story lesson payload should be measured separately');
      await page.click('[data-guided-check-answer]');
      assert.match(await textContent(page, '#quiz-root'), /interrogative|question/i);
      await page.click('#story-lesson-start-practice');
      await assertVisible(page, '#start-btn', 'sentence types practice handoff');
      await page.close();
    });

    await runCase(failures, 'explicit sentence types practice bypasses lesson first', async () => {
      const page = await newPage(browser, browserTracker);
      await visitClean(page, server.baseURL, 'topics/grammar/subtopics/sentence-types.html?practice=1');
      await assertVisible(page, '#start-btn', 'sentence types direct practice');
      assert.equal(await exists(page, '[data-story-lesson="grammar-sentence-types"]'), false);
      await page.close();
    });

    await runCase(failures, 'guardian dashboard renders goal projections and bounded interactions', async () => {
      const page = await newPage(browser, browserTracker);
      await page.addInitScript(() => {
        window.__goalTelemetryRecords = [];
        window.__goalInteractionEvents = [];
        window.GRAMMAR_QUEST_CONFIG = Object.assign({}, window.GRAMMAR_QUEST_CONFIG, {
          appTelemetry: {
            enabled: true,
            consent: { telemetry: true },
            transport: event => window.__goalTelemetryRecords.push(event)
          }
        });
        window.addEventListener('grammarquest:goal-card-interaction', event => {
          window.__goalInteractionEvents.push(event.detail || {});
        });
        localStorage.setItem('grammarQuestProgress', JSON.stringify({
          privacyPreferences: {
            telemetryEnabled: true,
            errorTelemetryEnabled: false,
            performanceTelemetryEnabled: false
          },
          learnerGoals: {
            dailyQuestionTarget: 4,
            weeklySessionTarget: 2,
            reviewStreakTargetDays: 2
          },
          reports: {
            sessions: [{
              id: 'goal-session',
              studentId: 'current-learner',
              completedAt: '2026-04-29T09:00:00.000Z',
              attempts: [{ questionId: 'private-q1', question: 'Raw prompt should stay hidden' }]
            }]
          },
          reviewQueue: {
            items: [{
              questionRef: { id: 'private-q1' },
              status: 'queued',
              dueAt: '2026-04-29T09:00:00.000Z',
              question: 'Raw prompt should stay hidden'
            }]
          }
        }));
      });
      await visitClean(page, server.baseURL, 'guardian-dashboard.html');
      await assertVisible(page, '.goal-dashboard-summary', 'guardian dashboard goal summary');
      const goalText = await textContent(page, '.goal-dashboard-card');
      assert.match(goalText, /review set is ready/i);
      assert.doesNotMatch(goalText, /Raw prompt|private-q1/);
      await page.click('.goal-dashboard-action');
      const telemetry = await page.evaluate(() => window.__goalTelemetryRecords || []);
      const interactions = await page.evaluate(() => window.__goalInteractionEvents || []);
      assert.ok(telemetry.some(event => event.type === 'goal_card_interaction' && event.interaction.kind === 'impression'));
      assert.ok(telemetry.some(event => event.type === 'goal_card_interaction' && event.interaction.kind === 'click'));
      assert.equal(JSON.stringify(telemetry).includes('current-learner'), false);
      assert.ok(interactions.some(event => event.kind === 'click'));
      await page.close();
    });

    await runCase(failures, 'leaderboard route switches periods and handles privacy states', async () => {
      const page = await newPage(browser, browserTracker);
      await seedLeaderboardState(page);
      await visitClean(page, server.baseURL, 'leaderboard.html');
      await assertVisible(page, '.leaderboard-shell', 'leaderboard route');
      assert.match(await textContent(page, '.leaderboard-table'), /Sky Reader|Comma Captain|Verb Voyager/);
      assert.match(await textContent(page, '.own-rank-card'), /Your rank|#2/);
      await page.click('[data-leaderboard-period="monthly"]');
      assert.match(await textContent(page, '.leaderboard-state'), /Monthly leaderboard/i);
      await page.click('[data-leaderboard-period="allTime"]');
      assert.match(await textContent(page, '.leaderboard-state'), /All-time leaderboard/i);
      await page.evaluate(() => {
        localStorage.setItem('grammarQuestLeaderboardProfile', JSON.stringify({ optedIn: false }));
        window.dispatchEvent(new Event('storage'));
      });
      assert.match(await textContent(page, '.leaderboard-shell'), /guardian-controlled opt-in|personal XP/i);
      await page.close();

      const offlinePage = await newPage(browser, browserTracker);
      await seedLeaderboardState(offlinePage);
      await offlinePage.addInitScript(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      });
      await visitClean(offlinePage, server.baseURL, 'leaderboard.html');
      assert.match(await textContent(offlinePage, '.leaderboard-shell'), /offline|reconnect/i);
      await offlinePage.close();
    });

    await runCase(failures, 'adaptive review starts from missed refs and completes without copied questions', async () => {
      const page = await newPage(browser, browserTracker);
      await visitClean(page, server.baseURL, 'index.html');
      await assertAdaptiveReviewCompletionFlow(page, server.baseURL, getManifestQuestionRef('grammar-sentence-types'));
      await page.close();
    });

    await runCase(failures, 'due spaced review indicator starts review and updates schedule', async () => {
      const page = await newPage(browser, browserTracker);
      await visitClean(page, server.baseURL, 'index.html');
      await assertDueReviewCompletionFlow(page, server.baseURL, getManifestQuestionRef('grammar-sentence-types'));
      await page.close();
    });

    await runCase(failures, 'system admin operations console denies non-admin roles', async () => {
      const page = await newPage(browser, browserTracker, {
        authState: { signedIn: true, user: { uid: 'teacher-1' }, role: 'teacher' }
      });
      await visitClean(page, server.baseURL, 'admin-operations.html');
      await assertVisible(page, '#admin-denied', 'admin denied state');
      const text = await textContent(page, '#admin-denied');
      assert.match(text, /Access denied/i);
      assert.equal(await page.locator('#admin-console').isVisible(), false);
      await page.close();
    });

    if (process.env.QUESTION_CHUNK_PRELOAD) {
      await runCase(failures, 'question chunk preloading stays budgeted and separate from required payload', async () => {
        const page = await newPage(browser, browserTracker, { enableQuestionChunkPreload: true });
        const recorder = createRequestRecorder(page);
        await visitClean(page, server.baseURL, 'topics/capitalization/index.html');
        const preloadEvents = await waitForPreloadEvents(page);
        const preloadRequests = preloadEvents.flatMap(event => event.chunks || []);
        const metrics = summarizeRequestMetrics({
          requests: recorder.requests,
          preloadRequests,
          responses: recorder.responses
        });
        assert.equal(metrics.loadedFullBanks.length, 0);
        assert.ok(metrics.preloadedChunks.length <= 1, `topic index should preload at most one chunk: ${metrics.preloadedChunks.join(', ')}`);
        assert.ok(metrics.preloadChunkBytes < 250 * 1024, `preload bytes ${metrics.preloadChunkBytes} should stay under budget`);
        await page.close();
      });
    }

    for (const file of manifestTopicIndexes) {
      await runCase(failures, `${file} uses manifest metadata without full topic bank`, async () => {
        const page = await newPage(browser, browserTracker);
        const recorder = createRequestRecorder(page);
        await visitClean(page, server.baseURL, file);
        await assertManifestBackedTopicIndex(page, recorder.requests, file);
        assertPageBudget(assert, file, recorder.summarize(), TOPIC_INDEX_BUDGET);
        await page.close();
      });
    }

    for (const file of Object.keys(REPRESENTATIVE_CHUNK_PAGES)) {
      await runCase(failures, `${file} stays under question payload budget`, async () => {
        const page = await newPage(browser, browserTracker);
        const recorder = createRequestRecorder(page);
        await visitClean(page, server.baseURL, file);
        await assertChunkBackedSubtopicRequests(page, recorder.requests, file, REPRESENTATIVE_CHUNK_PAGES[file]);
        assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
        await page.close();
      });
    }

    for (const domain of ['capitalization', 'reference-skills', 'punctuation', 'vocabulary', 'reading-comprehension', 'grammar']) {
      await runCase(failures, `topics/${domain}/index.html mixed quiz loads selected chunks instead of full bank`, async () => {
        const page = await newPage(browser, browserTracker);
        const requests = [];
        page.on('request', request => requests.push(request.url()));
        await visitClean(page, server.baseURL, `topics/${domain}/index.html`);
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', `${domain} mixed quiz`);
        assert.ok(
          requests.some(url => url.endsWith('/assets/question-loader.js')),
          `${domain} mixed quiz should load question loader after launch`
        );
        assert.ok(
          requests.some(url => url.includes(`/assets/question-chunks/${domain}/`)),
          `${domain} mixed quiz should request ${domain} chunks`
        );
        assert.equal(
          requests.some(url => url.endsWith(`/assets/question-banks/${domain}.js`)),
          false,
          `${domain} mixed quiz should not request the full topic bank`
        );
        assert.ok(
          requests.some(url => url.endsWith('/assets/quiz-engine.js')),
          `${domain} mixed quiz should load quiz engine after launch`
        );
        await page.close();
      });
    }

    if (process.env.QUESTION_SELECTION_API) {
      await runCase(failures, 'grammar mixed quiz can use question selection API pilot', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          enableSelectionTelemetry: true
        });
        const requests = [];
        const selectionPayloads = [];
        page.on('request', request => requests.push(request.url()));
        page.on('request', request => {
          if (request.url().endsWith('/api/question-selection')) {
            selectionPayloads.push(JSON.parse(request.postData() || '{}'));
          }
        });
        await visitClean(page, server.baseURL, 'topics/grammar/index.html');
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', 'grammar API mixed quiz');
        assert.ok(
          requests.some(url => url.endsWith('/api/question-selection')),
          'grammar API mixed quiz should request question selection API'
        );
        assert.equal(
          await page.evaluate(() => window.__selectionApiUsed === true),
          true,
          `grammar API mixed quiz should emit API-used event; fallback reason: ${await page.evaluate(() => window.__selectionFallbackReason || '')}`
        );
        const apiTelemetry = await page.evaluate(() => window.__selectionApiDetail);
        assert.equal(apiTelemetry.source, 'api');
        assert.ok(apiTelemetry.responseBytes > 0 && apiTelemetry.responseBytes < 60 * 1024, 'API response telemetry should be bounded');
        assert.ok(apiTelemetry.requestBytes > 0, 'API request telemetry should include request bytes');
        assert.ok(apiTelemetry.hydrateMs >= 0, 'API telemetry should include hydrate latency');
        const sinkTelemetry = await page.evaluate(() => window.__selectionTelemetryRecords || []);
        const apiSinkTelemetry = sinkTelemetry.find(event => event.event === 'selection.api_used');
        assert.ok(apiSinkTelemetry, 'API smoke should record normalized API telemetry');
        assert.equal(apiSinkTelemetry.source, 'api');
        assert.equal(apiSinkTelemetry.domain, 'grammar');
        assert.ok(apiSinkTelemetry.responseBytes > 0 && apiSinkTelemetry.responseBytes < 60 * 1024, 'sink API response bytes should be bounded');
        assert.equal(JSON.stringify(sinkTelemetry).includes('choices'), false, 'selection telemetry should not include choices');
        assert.equal(JSON.stringify(sinkTelemetry).includes('questionSnapshots'), false, 'selection telemetry should not include snapshots');
        assert.equal(selectionPayloads.length, 1, 'grammar API mixed quiz should send one selection payload');
        assert.equal(selectionPayloads[0].count, 60, 'grammar API mixed quiz should request the default server-selection cap');
        assert.equal(selectionPayloads[0].countMode, 'per-subtopic');
        assert.equal(selectionPayloads[0].questionsPerSubtopic, 4);
        assert.equal(
          requests.some(url => /\/assets\/question-banks\/[^/]+\.js$/.test(url)),
          false,
          'grammar API mixed quiz should not request full bank'
        );
        await assertQuizFlow(page, 'topics/grammar/index.html API mixed quiz');
        const activeQuiz = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').activeQuiz);
        assert.ok(activeQuiz.questionRefs.length > 0, 'API mixed quiz should persist refs');
        assert.equal(activeQuiz.questionRefs.length, 60, 'API mixed quiz should preserve requested selected-question count');
        await page.close();
      });

      await runCase(failures, 'grammar mixed quiz falls back when question selection API fails', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          enableSelectionTelemetry: true,
          questionSelectionApiUrl: '/api/question-selection?fail=1'
        });
        await visitClean(page, server.baseURL, 'topics/grammar/index.html');
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', 'grammar API fallback mixed quiz');
        assert.equal(
          await page.evaluate(() => window.__selectionFallback === true),
          true,
          'grammar API fallback should emit fallback event'
        );
        assert.match(
          await page.evaluate(() => window.__selectionFallbackReason || ''),
          /selection API returned 503/,
          'grammar API fallback should include a reason'
        );
        const sinkTelemetry = await page.evaluate(() => window.__selectionTelemetryRecords || []);
        const fallbackTelemetry = sinkTelemetry.find(event => event.event === 'selection.fallback');
        assert.ok(fallbackTelemetry, 'API fallback smoke should record normalized fallback telemetry');
        assert.equal(fallbackTelemetry.source, 'fallback');
        assert.equal(fallbackTelemetry.fallbackReason, 'api_unavailable');
        assert.equal(JSON.stringify(fallbackTelemetry).includes('503'), false, 'sink fallback telemetry should not include raw status text');
        await assertQuizFlow(page, 'topics/grammar/index.html API fallback mixed quiz');
        await page.close();
      });

      await runCase(failures, 'grammar mixed quiz falls back when question selection API integrity is tampered', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          questionSelectionApiUrl: '/api/question-selection?tamper=1'
        });
        await visitClean(page, server.baseURL, 'topics/grammar/index.html');
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', 'grammar API tamper fallback mixed quiz');
        assert.equal(
          await page.evaluate(() => window.__selectionFallback === true),
          true,
          'grammar API tamper fallback should emit fallback event'
        );
        assert.match(
          await page.evaluate(() => window.__selectionFallbackReason || ''),
          /integrity_failed/,
          'grammar API tamper fallback should include an integrity reason'
        );
        await assertQuizFlow(page, 'topics/grammar/index.html API tamper fallback mixed quiz');
        await page.close();
      });

      await runCase(failures, 'grammar mixed quiz verifies signed question selection API responses', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          questionSelectionApiUrl: '/api/question-selection?signed=1',
          selectionIntegrity: {
            requireSignature: true,
            publicKeys: publicKeyConfig()
          }
        });
        await visitClean(page, server.baseURL, 'topics/grammar/index.html');
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', 'grammar signed API mixed quiz');
        assert.equal(
          await page.evaluate(() => window.__selectionApiUsed === true),
          true,
          `grammar signed API mixed quiz should emit API-used event; fallback reason: ${await page.evaluate(() => window.__selectionFallbackReason || '')}`
        );
        await assertQuizFlow(page, 'topics/grammar/index.html signed API mixed quiz');
        await page.close();
      });

      await runCase(failures, 'grammar mixed quiz falls back when signed question selection API signature is invalid', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          questionSelectionApiUrl: '/api/question-selection?signed=1&tamperSignature=1',
          selectionIntegrity: {
            requireSignature: true,
            publicKeys: publicKeyConfig()
          }
        });
        await visitClean(page, server.baseURL, 'topics/grammar/index.html');
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', 'grammar signed API invalid signature fallback mixed quiz');
        assert.equal(
          await page.evaluate(() => window.__selectionFallback === true),
          true,
          'grammar invalid signature fallback should emit fallback event'
        );
        assert.match(
          await page.evaluate(() => window.__selectionFallbackReason || ''),
          /integrity_failed: signature verification failed/,
          'grammar invalid signature fallback should include a signature reason'
        );
        await assertQuizFlow(page, 'topics/grammar/index.html signed API invalid signature fallback mixed quiz');
        await page.close();
      });

      await runCase(failures, 'capitalization mixed quiz can use question selection API pilot', async () => {
        const page = await newPage(browser, browserTracker, { enableQuestionSelectionApi: true });
        const requests = [];
        const selectionPayloads = [];
        page.on('request', request => requests.push(request.url()));
        page.on('request', request => {
          if (request.url().endsWith('/api/question-selection')) {
            selectionPayloads.push(JSON.parse(request.postData() || '{}'));
          }
        });
        await visitClean(page, server.baseURL, 'topics/capitalization/index.html');
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', 'capitalization API mixed quiz');
        assert.equal(
          await page.evaluate(() => window.__selectionApiUsed === true),
          true,
          `capitalization API mixed quiz should emit API-used event; fallback reason: ${await page.evaluate(() => window.__selectionFallbackReason || '')}`
        );
        const apiTelemetry = await page.evaluate(() => window.__selectionApiDetail);
        assert.equal(apiTelemetry.source, 'api');
        assert.ok(apiTelemetry.responseBytes > 0 && apiTelemetry.responseBytes < 24 * 1024, 'capitalization API response telemetry should stay small');
        assert.equal(selectionPayloads.length, 1, 'capitalization API mixed quiz should send one selection payload');
        assert.equal(selectionPayloads[0].domain, 'capitalization');
        assert.equal(selectionPayloads[0].count, 20, 'capitalization API mixed quiz should request subtopics times per-subtopic count');
        assert.equal(
          requests.some(url => /\/assets\/question-banks\/[^/]+\.js$/.test(url)),
          false,
          'capitalization API mixed quiz should not request full bank'
        );
        await assertQuizFlow(page, 'topics/capitalization/index.html API mixed quiz');
        await page.close();
      });

      await runCase(failures, 'capitalization mixed quiz falls back when question selection API fails', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          questionSelectionApiUrl: '/api/question-selection?fail=1'
        });
        await visitClean(page, server.baseURL, 'topics/capitalization/index.html');
        await page.click('.mixed-quiz-panel a');
        await assertVisible(page, '#start-btn', 'capitalization API fallback mixed quiz');
        assert.equal(
          await page.evaluate(() => window.__selectionFallback === true),
          true,
          'capitalization API fallback should emit fallback event'
        );
        assert.match(
          await page.evaluate(() => window.__selectionFallbackReason || ''),
          /selection API returned 503/,
          'capitalization API fallback should include a reason'
        );
        await assertQuizFlow(page, 'topics/capitalization/index.html API fallback mixed quiz');
        await page.close();
      });

      for (const domain of MIXED_QUIZ_SERVER_SELECTION_DOMAINS.filter(item => item !== 'grammar' && item !== 'capitalization')) {
        await runCase(failures, `${domain} mixed quiz can use question selection API pilot`, async () => {
          const page = await newPage(browser, browserTracker, { enableQuestionSelectionApi: true });
          const requests = [];
          const selectionPayloads = [];
          const selectionStatuses = [];
          page.on('request', request => {
            requests.push(request.url());
            if (request.url().endsWith('/api/question-selection')) {
              selectionPayloads.push(JSON.parse(request.postData() || '{}'));
            }
          });
          page.on('response', response => {
            if (response.url().endsWith('/api/question-selection')) selectionStatuses.push(response.status());
          });
          await visitClean(page, server.baseURL, DOMAIN_TOPIC_PAGES[domain]);
          await page.click('.mixed-quiz-panel a');
          await assertVisible(page, '#start-btn', `${domain} API mixed quiz`);
          assert.equal(
            await page.evaluate(() => window.__selectionApiUsed === true),
            true,
            `${domain} API mixed quiz should emit API-used event; fallback reason: ${await page.evaluate(() => window.__selectionFallbackReason || '')}`
          );
          const apiTelemetry = await page.evaluate(() => window.__selectionApiDetail);
          assert.equal(apiTelemetry.source, 'api');
          assert.equal(apiTelemetry.domain, domain);
          assert.ok(
            apiTelemetry.responseBytes > 0 && apiTelemetry.responseBytes < DOMAIN_API_RESPONSE_BYTE_BUDGETS[domain],
            `${domain} API response telemetry should stay under ${DOMAIN_API_RESPONSE_BYTE_BUDGETS[domain]} bytes`
          );
          assert.equal(selectionPayloads.length, 1, `${domain} API mixed quiz should send one selection payload`);
          assert.deepEqual(selectionStatuses, [200], `${domain} API mixed quiz should receive one successful selection response`);
          assert.equal(selectionPayloads[0].domain, domain);
          assert.equal(selectionPayloads[0].count, DOMAIN_MIXED_SELECTION_COUNTS[domain]);
          assert.equal(selectionPayloads[0].setIds.length, domainSetCount(domain), `${domain} API mixed quiz should request each configured mixed subtopic once`);
          assert.equal(
            requests.some(url => /\/assets\/question-banks\/[^/]+\.js$/.test(url)),
            false,
            `${domain} API mixed quiz should not request full bank`
          );
          assertChunkRequestBudget(requests, domain, `${domain} API mixed quiz`);
          await assertQuizFlow(page, `${DOMAIN_TOPIC_PAGES[domain]} API mixed quiz`);
          await page.close();
        });

        await runCase(failures, `${domain} mixed quiz falls back when question selection API fails`, async () => {
          const page = await newPage(browser, browserTracker, {
            enableQuestionSelectionApi: true,
            questionSelectionApiUrl: '/api/question-selection?fail=1'
          });
          const requests = [];
          const selectionStatuses = [];
          page.on('request', request => requests.push(request.url()));
          page.on('response', response => {
            if (response.url().includes('/api/question-selection')) selectionStatuses.push(response.status());
          });
          await visitClean(page, server.baseURL, DOMAIN_TOPIC_PAGES[domain]);
          await page.click('.mixed-quiz-panel a');
          await assertVisible(page, '#start-btn', `${domain} API fallback mixed quiz`);
          assert.equal(
            await page.evaluate(() => window.__selectionFallback === true),
            true,
            `${domain} API fallback should emit fallback event`
          );
          assert.match(
            await page.evaluate(() => window.__selectionFallbackReason || ''),
            /selection API returned 503/,
            `${domain} API fallback should include a reason`
          );
          assert.deepEqual(selectionStatuses, [503], `${domain} API fallback should record the failing selection response`);
          assert.equal(
            requests.some(url => /\/assets\/question-banks\/[^/]+\.js$/.test(url)),
            false,
            `${domain} API fallback mixed quiz should not request full bank`
          );
          assertChunkRequestBudget(requests, domain, `${domain} API fallback mixed quiz`);
          await assertQuizFlow(page, `${DOMAIN_TOPIC_PAGES[domain]} API fallback mixed quiz`);
          await page.close();
        });
      }

      await runCase(failures, 'capitalization pilot subtopic can use question selection API', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          enableSelectionTelemetry: true,
          serverQuestionSelectionPilotSubtopics: ['capitalization-proper-names-titles']
        });
        const requests = [];
        const selectionPayloads = [];
        page.on('request', request => {
          requests.push(request.url());
          if (request.url().endsWith('/api/question-selection')) {
            selectionPayloads.push(JSON.parse(request.postData() || '{}'));
          }
        });
        await visitClean(page, server.baseURL, 'topics/capitalization/subtopics/proper-names-titles.html');
        await assertVisible(page, '#start-btn', 'capitalization API pilot subtopic');
        assert.ok(requests.some(url => url.endsWith('/api/question-selection')), 'pilot subtopic should request selection API');
        assert.equal(await page.evaluate(() => window.__selectionApiUsed === true), true, 'pilot subtopic should emit API-used event');
        assert.equal(selectionPayloads.length, 1, 'pilot subtopic should send one selection payload');
        assert.equal(selectionPayloads[0].mode, 'subtopic');
        assert.equal(selectionPayloads[0].count, 10);
        assert.equal(selectionPayloads[0].countMode, 'max');
        assert.deepEqual(selectionPayloads[0].setIds, ['capitalization-proper-names-titles']);
        const sinkTelemetry = await page.evaluate(() => window.__selectionTelemetryRecords || []);
        const apiTelemetry = sinkTelemetry.find(event => event.event === 'selection.api_used');
        assert.ok(apiTelemetry, 'pilot subtopic should record normalized API telemetry');
        assert.equal(apiTelemetry.source, 'api');
        assert.equal(apiTelemetry.domain, 'capitalization');
        assert.equal(apiTelemetry.selectedQuestionCount, 10);
        assert.ok(apiTelemetry.requestBytes > 0, 'pilot subtopic telemetry should include request bytes');
        assert.ok(apiTelemetry.responseBytes > 0, 'pilot subtopic telemetry should include response bytes');
        assert.equal(JSON.stringify(apiTelemetry).includes('questionSnapshots'), false, 'pilot subtopic telemetry should not include snapshots');
        assert.equal(JSON.stringify(apiTelemetry).includes('Choose'), false, 'pilot subtopic telemetry should not include question content');
        assert.equal(
          requests.some(url => /\/assets\/question-banks\/[^/]+\.js$/.test(url)),
          false,
          'pilot subtopic should not request full bank'
        );
        await assertQuizFlow(page, 'topics/capitalization/subtopics/proper-names-titles.html API pilot subtopic');
        const activeQuiz = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').activeQuiz);
        assert.equal(activeQuiz.questionRefs.length, 10, 'pilot subtopic active quiz should persist refs');
        assert.equal(activeQuiz.questionRefs[0].sourceSet, 'capitalization-proper-names-titles');
        await page.close();
      });

      await runCase(failures, 'capitalization pilot subtopic falls back when question selection API fails', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          enableSelectionTelemetry: true,
          serverQuestionSelectionPilotSubtopics: ['capitalization-proper-names-titles'],
          questionSelectionApiUrl: '/api/question-selection?fail=1'
        });
        await visitClean(page, server.baseURL, 'topics/capitalization/subtopics/proper-names-titles.html');
        await assertVisible(page, '#start-btn', 'capitalization API pilot subtopic fallback');
        assert.equal(
          await page.evaluate(() => window.__selectionFallback === true),
          true,
          'pilot subtopic fallback should emit fallback event'
        );
        assert.match(
          await page.evaluate(() => window.__selectionFallbackReason || ''),
          /selection API returned 503/,
          'pilot subtopic fallback should include a reason'
        );
        const sinkTelemetry = await page.evaluate(() => window.__selectionTelemetryRecords || []);
        const fallbackTelemetry = sinkTelemetry.find(event => event.event === 'selection.fallback');
        assert.ok(fallbackTelemetry, 'pilot subtopic fallback should record normalized fallback telemetry');
        assert.equal(fallbackTelemetry.source, 'fallback');
        assert.equal(fallbackTelemetry.domain, 'capitalization');
        assert.equal(fallbackTelemetry.fallbackReason, 'api_unavailable');
        assert.equal(JSON.stringify(fallbackTelemetry).includes('503'), false, 'pilot subtopic fallback telemetry should not include raw status text');
        await assertQuizFlow(page, 'topics/capitalization/subtopics/proper-names-titles.html API pilot fallback');
        await page.close();
      });

      await runCase(failures, 'capitalization pilot subtopic parent preview stays read-only with question selection API', async () => {
        const page = await newPage(browser, browserTracker, {
          enableQuestionSelectionApi: true,
          serverQuestionSelectionPilotSubtopics: ['capitalization-proper-names-titles']
        });
        await visitClean(page, server.baseURL, 'topics/capitalization/subtopics/proper-names-titles.html?parentBrowse=1');
        await assertVisible(page, '#start-btn', 'capitalization API pilot parent preview');
        await assertParentPreview(page, 'topics/capitalization/subtopics/proper-names-titles.html API pilot parent preview');
        await page.close();
      });
    }

    await runCase(failures, 'capitalization pilot subtopic loads only its chunk', async () => {
      const page = await newPage(browser, browserTracker);
      const recorder = createRequestRecorder(page);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, file);
      await assertChunkBackedSubtopicRequests(page, recorder.requests, file, REPRESENTATIVE_CHUNK_PAGES[file]);
      assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
      await assertQuizFlow(page, file);
      await page.close();
    });

    await runCase(failures, 'reference skills subtopic uses chunk and not full bank', async () => {
      const page = await newPage(browser, browserTracker);
      const recorder = createRequestRecorder(page);
      const file = 'topics/reference-skills/subtopics/alphabetical-order.html';
      await visitClean(page, server.baseURL, file);
      await assertChunkBackedSubtopicRequests(page, recorder.requests, file, REPRESENTATIVE_CHUNK_PAGES[file]);
      await assertQuizFlow(page, file);
      await page.close();
    });

    await runCase(failures, 'loader-backed active quiz can be resumed', async () => {
      const page = await newPage(browser, browserTracker);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, `${file}?practice=1`);
      await assertLoaderBackedResume(page, file);
      await page.close();
    });

    await runCase(failures, 'fresh quiz start is not converted into resume prompt', async () => {
      const page = await newPage(browser, browserTracker);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, `${file}?practice=1`);
      await assertFreshQuizStartStaysInQuestion(page, file);
      await page.close();
    });

    await runCase(failures, 'active quiz resume falls back to snapshots when refs cannot load', async () => {
      const page = await newPage(browser, browserTracker);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, `${file}?practice=1`);
      await assertSnapshotFallbackResume(page, file, {
        questionRefs: [{ id: 'missing-q0001', version: 1, contentHash: 'sha256:missing', sourceSet: 'missing-source-set', sequence: 1 }],
        questionText: 'Snapshot fallback question: choose the saved answer.'
      });
      await page.close();
    });

    await runCase(failures, 'active quiz resume uses snapshots when ref hashes changed', async () => {
      const page = await newPage(browser, browserTracker);
      const file = 'topics/capitalization/subtopics/proper-names-titles.html';
      await visitClean(page, server.baseURL, `${file}?practice=1`);
      await assertSnapshotFallbackResume(page, file, {
        questionRefs: [{ id: 'capitalization-proper-names-titles-q0001', version: 1, contentHash: 'sha256:stale', sourceSet: 'capitalization-proper-names-titles', sequence: 1 }],
        questionText: 'Snapshot hash mismatch question: choose the saved answer.'
      });
      await page.close();
    });

    for (const file of representativeSubtopics) {
      await runCase(failures, `${file} starts, answers, and advances`, async () => {
        const page = await newPage(browser, browserTracker);
        await visitClean(page, server.baseURL, file);
        await assertQuizFlow(page, file);
        await page.close();
      });

      await runCase(failures, `${file} parent preview does not create progress`, async () => {
        const page = await newPage(browser, browserTracker);
        await visitClean(page, server.baseURL, `${file}?parentBrowse=1`);
        await assertParentPreview(page, file);
        await page.close();
      });
    }

    if (representativeSubtopics.length) {
      await runCase(failures, `${representativeSubtopics[0]} completion preserves question reports`, async () => {
        const page = await newPage(browser, browserTracker);
        await visitClean(page, server.baseURL, representativeSubtopics[0]);
        await assertQuizCompletionPreservesQuestionReports(page, representativeSubtopics[0]);
        await page.close();
      });
    }

    await runCase(failures, 'topics/sound-symbols/index.html spelling lab flow', async () => {
      const page = await newPage(browser, browserTracker);
      await visitClean(page, server.baseURL, 'topics/sound-symbols/index.html');
      await assertSpellingLabFlow(page);
      await page.close();
    });

    await runCase(failures, 'topics/sound-symbols/index.html spelling parent preview does not create progress', async () => {
      const page = await newPage(browser, browserTracker);
      await visitClean(page, server.baseURL, 'topics/sound-symbols/index.html?parentBrowse=1');
      await assertSpellingParentPreview(page);
      await page.close();
    });

    for (const file of allSubtopics) {
      await runCase(failures, `${file} all-subtopic smoke`, async () => {
        const page = await newPage(browser, browserTracker);
        const recorder = createRequestRecorder(page);
        await visitClean(page, server.baseURL, file);
        await assertVisible(page, '#quiz-root', file);
        await assertAllSubtopicRouteReady(page, file);
        assertPageBudget(assert, file, recorder.summarize(), PAGE_BUDGETS[file]);
        await page.close();
      });
    }
  } finally {
    await recordTeardown(failures, 'pages.contexts.close', () => closeTrackedPagesAndContexts(browserTracker, 3000));
    await recordTeardown(failures, 'browser.close', () => closeBrowserWithDiagnostics(browser, browserTracker, 5000));
    await recordTeardown(failures, 'server.close', () => closeServerWithTimeout(server.server, server.sockets, 3000));
  }

  if (failures.length) {
    failures.forEach(failure => {
      console.error(`FAIL ${failure.name}`);
      console.error(failure.error.stack || failure.error.message || failure.error);
    });
    process.exit(1);
  }
  console.log('UI smoke passed.');
  process.exit(0);
}

async function newPage(browser, browserTracker, options = {}) {
  const page = await newTrackedPage(browser, {
    viewport: options.viewport || VIEWPORTS.desktop
  }, browserTracker);
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(8000);
  await page.addInitScript(config => {
    window.GRAMMAR_QUEST_CONFIG = Object.assign({}, window.GRAMMAR_QUEST_CONFIG, {
      disableServiceWorker: true,
      enableQuestionChunkPreload: Boolean(config.enableQuestionChunkPreload)
    });
    window.__GQ_AUTH_STATE = config.authState || null;
    window.__GQ_PRELOAD_EVENTS = [];
    window.addEventListener('grammarquest:question-preload-completed', event => {
      window.__GQ_PRELOAD_EVENTS.push(event.detail || {});
    });
  }, {
    authState: options.authState || null,
    enableQuestionChunkPreload: options.enableQuestionChunkPreload && enableQuestionChunkPreload
  });
  const untrackFirebaseRoute = browserTracker.trackRoute('assets/firebase-config.js');
  page.on('close', untrackFirebaseRoute);
  await page.route('**/assets/firebase-config.js', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.GQ_FIREBASE_CONFIG = { enabled: false, authProviders: {}, firestore: {} };'
    });
  });
  const untrackAuthRoute = browserTracker.trackRoute('assets/auth-service.js');
  page.on('close', untrackAuthRoute);
  await page.route('**/assets/auth-service.js', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: `
        (function () {
          function state() {
            if (window.__GQ_AUTH_STATE) return Object.assign({
              enabled: false,
              signedIn: true,
              parentMode: false,
              studentMode: false,
              activeStudent: null,
              syncStatus: 'local'
            }, window.__GQ_AUTH_STATE);
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
  if (options.enableQuestionSelectionApi) {
    await page.addInitScript(config => {
      window.__selectionTelemetryRecords = [];
      const selectionTelemetry = config.enableSelectionTelemetry
        ? {
          enabled: true,
          sampleRate: 1,
          transport: event => {
            window.__selectionTelemetryRecords.push(event);
          }
        }
        : config.selectionTelemetry || {};
      window.GRAMMAR_QUEST_CONFIG = Object.assign({}, window.GRAMMAR_QUEST_CONFIG, {
        disableServiceWorker: true,
        enableServerQuestionSelection: true,
        questionSelectionApiUrl: config.questionSelectionApiUrl || '/api/question-selection',
        serverQuestionSelectionPilotDomains: config.serverQuestionSelectionPilotDomains,
        serverQuestionSelectionPilotSubtopics: config.serverQuestionSelectionPilotSubtopics || [],
        selectionIntegrity: config.selectionIntegrity || {},
        selectionTelemetry
      });
      window.__selectionApiUsed = false;
      window.__selectionFallback = false;
      window.__selectionFallbackReason = '';
      window.__selectionApiDetail = null;
      window.addEventListener('grammarquest:question-selection-api-used', () => {
        window.__selectionApiUsed = true;
      });
      window.addEventListener('grammarquest:question-selection-api-used', event => {
        window.__selectionApiDetail = event.detail || null;
      });
      window.addEventListener('grammarquest:question-selection-fallback', event => {
        window.__selectionFallback = true;
        window.__selectionFallbackReason = event.detail && event.detail.reason || '';
      });
    }, {
      questionSelectionApiUrl: options.questionSelectionApiUrl || '/api/question-selection',
      serverQuestionSelectionPilotDomains: options.serverQuestionSelectionPilotDomains || MIXED_QUIZ_SERVER_SELECTION_DOMAINS,
      serverQuestionSelectionPilotSubtopics: options.serverQuestionSelectionPilotSubtopics || [],
      selectionIntegrity: options.selectionIntegrity || {},
      selectionTelemetry: options.selectionTelemetry || {},
      enableSelectionTelemetry: !!options.enableSelectionTelemetry
    });
  }
  page.__qaErrors = [];
  page.on('pageerror', error => page.__qaErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') page.__qaErrors.push(message.text());
  });
  return page;
}

async function recordTeardown(failures, name, closeResource) {
  try {
    const result = await closeResource();
    if (process.env.QA_UI_TEARDOWN_DEBUG && result) {
      console.log(`TEARDOWN ${name} ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message || error);
    failures.push({ name, error });
  }
}

async function waitForPreloadEvents(page) {
  await page.waitForFunction(() => (window.__GQ_PRELOAD_EVENTS || []).length > 0, null, { timeout: 5000 });
  return page.evaluate(() => window.__GQ_PRELOAD_EVENTS || []);
}

async function visitClean(page, baseURL, file) {
  await page.goto(`${baseURL}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  assert.deepEqual(page.__qaErrors, [], `page errors on ${file}`);
}

async function assertAllSubtopicRouteReady(page, file) {
  await page.waitForFunction(() => {
    const root = document.querySelector('#quiz-root');
    const text = root ? root.innerText || root.textContent || '' : '';
    return Boolean(
      document.querySelector('#start-btn, #story-lesson-start-practice, .choice-btn, .question-box, .results-box, .preview-question-card') ||
      /Learn First|Start Quiz|Preview Questions|coming soon|Question|Mission Complete|Keep practicing/i.test(text)
    );
  }, null, { timeout: 5000 });
  const text = await textContent(page, '#quiz-root');
  assert.match(text, /Learn First|Start Quiz|Preview Questions|coming soon|Question|Mission Complete|Keep practicing/i, file);
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
            skillIds: ['grammar.sentence-analysis'],
            standardIds: ['L.3-6.1'],
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
            skillIds: ['grammar.sentence-analysis'],
            standardIds: ['L.3-6.1'],
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

async function assertAdminOperationsPage(page) {
  await assertVisible(page, '#admin-console', 'admin-operations.html');
  await assertVisible(page, '[data-admin-section="release"]', 'admin release section');
  await assertVisible(page, '[data-admin-section="feature-flags"]', 'admin feature flags section');
  await assertVisible(page, '[data-admin-section="selection-health"]', 'admin selection health section');
  await assertVisible(page, '[data-admin-section="audit"]', 'admin audit section');
  const text = await textContent(page, '#admin-console');
  assert.match(text, /Release/i);
  assert.match(text, /Feature Flags/i);
  assert.match(text, /Selection API/i);
  assert.equal(/Smoke Student|Which sentence|correct answer|selected choice/i.test(text), false, 'admin console should not render learner or question content');
}

async function assertSettingsPage(page) {
  await assertVisible(page, '#privacy-settings', 'settings.html');
  assert.equal(await page.evaluate(() => window.GrammarQuestModuleBoundary && window.GrammarQuestModuleBoundary.settingsLoaded), true);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.pageShell), 'ready');
  assert.equal(await page.evaluate(() => Boolean(window.GrammarQuestPrivacySettingsUi)), false);
  await assertVisible(page, '#privacy-telemetry-enabled', 'settings telemetry toggle');
  await assertVisible(page, '#privacy-error-telemetry-enabled', 'settings error telemetry toggle');
  await assertVisible(page, '#privacy-performance-telemetry-enabled', 'settings performance telemetry toggle');
  await assertVisible(page, '#privacy-experiment-participation-enabled', 'settings experiment toggle');
  await page.click('#privacy-telemetry-enabled');
  await page.click('#privacy-error-telemetry-enabled');
  await page.click('#privacy-save');
  await page.waitForFunction(() => {
    const progress = JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}');
    return progress.privacyPreferences &&
      progress.privacyPreferences.telemetryEnabled === true &&
      progress.privacyPreferences.errorTelemetryEnabled === true;
  });
  const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').privacyPreferences);
  assert.equal(preferences.performanceTelemetryEnabled, false);
  assert.equal(preferences.experimentParticipationEnabled, false);
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
  assert.match(startText, /Learn First|Start Quiz|Preview Questions|coming soon/i, file);
  if (await exists(page, '#story-lesson-start-practice')) {
    await page.click('#story-lesson-start-practice');
    await assertVisible(page, '#start-btn', `${file} practice handoff`);
  }
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
  assert.match(await textContent(page, '#feedback-area'), /XP preview|server confirms/i);
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

async function assertKeyboardQuizFlow(page, file) {
  await assertVisible(page, '#start-btn', file);
  await focusByKeyboard(page, '#start-btn');
  await page.keyboard.press('Enter');
  await assertVisible(page, '.question-box', `${file} keyboard question`);
  await focusByKeyboard(page, '.confidence-btn');
  await page.keyboard.press('Space');
  await focusByKeyboard(page, '.choice-btn');
  await page.keyboard.press('Space');
  await assertVisible(page, '#feedback-area', `${file} keyboard feedback`);
  assert.match(await textContent(page, '#feedback-area'), /Correct|Not quite/);
  await focusByKeyboard(page, '#next-question-btn');
  await page.keyboard.press('Enter');
  assert.match(await textContent(page, '#quiz-root'), /Question|Results|Score|Review/i);
}

async function assertAssignmentCompletionFlow(page, baseURL) {
  await page.evaluate(() => {
    window.GrammarQuestProgress.upsertAssignment({
      id: 'assignment-smoke-1',
      title: 'Sentence Types Practice Plan',
      assignedBy: { actorId: 'teacher-1', role: 'teacher' },
      assignedTo: { learnerIds: ['current-learner'] },
      scope: { setIds: ['grammar-sentence-types'] },
      quizOptions: { count: 1, grade: '4', difficulty: 'easy', mode: 'assignment' },
      status: 'active',
      createdAt: '2026-04-29T12:00:00.000Z',
      updatedAt: '2026-04-29T12:00:00.000Z'
    }, { sync: false });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertVisible(page, '[data-assignment-id="assignment-smoke-1"]', 'assignments.html seeded assignment');
  await page.click('[data-start-assignment="assignment-smoke-1"]');
  await page.waitForURL(`${baseURL}/topics/grammar/subtopics/sentence-types.html`);
  await assertVisible(page, '#start-btn', 'assignment quiz start');

  const started = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}'));
  assert.equal(started.assignments[0].status, 'in_progress', 'assignment should move to in_progress before launch');
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('grammarQuestActiveAssignmentRequest'))).count, 1);

  await page.click('#start-btn');
  await assertVisible(page, '.question-box', 'assignment quiz question');
  await page.click('.confidence-btn');
  await page.click('.choice-btn');
  if (await exists(page, '#feedback-area')) {
    assert.match(await textContent(page, '#feedback-area'), /Correct|Not quite/);
  }
  if (await exists(page, '#next-question-btn')) {
    await page.click('#next-question-btn');
  }
  await assertVisible(page, '#restart-btn', 'assignment quiz results');

  const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}'));
  const assignment = completed.assignments.find(item => item.id === 'assignment-smoke-1');
  assert.equal(assignment.status, 'completed', 'assignment should be completed after quiz results');
  assert.ok(assignment.completedSessionId, 'assignment should retain the completion session id');
  assert.ok(Array.isArray(completed.reports.sessions) && completed.reports.sessions.length === 1, 'assignment quiz should save a report session');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('grammarQuestActiveAssignmentId')),
    null,
    'active assignment marker should be cleared'
  );
}

async function seedLeaderboardState(page) {
  await page.addInitScript(() => {
    const entries = [
      { rank: 1, participantRef: 'leaderboardParticipants/sky-reader', displayAlias: 'Sky Reader', score: 180, lastAwardedAt: '2030-04-29T10:00:00.000Z', awardCount: 4 },
      { rank: 2, participantRef: 'leaderboardParticipants/current', displayAlias: 'Comma Captain', score: 140, lastAwardedAt: '2030-04-29T09:00:00.000Z', awardCount: 3 },
      { rank: 3, participantRef: 'leaderboardParticipants/verb-voyager', displayAlias: 'Verb Voyager', score: 90, lastAwardedAt: '2030-04-28T09:00:00.000Z', awardCount: 2 }
    ];
    const projections = {
      weekly: { schemaVersion: 1, periodId: 'weekly_2030_W18', periodType: 'weekly', generatedAt: '2030-04-29T12:00:00.000Z', entries },
      monthly: { schemaVersion: 1, periodId: 'monthly_2030_04', periodType: 'monthly', generatedAt: '2030-04-29T12:00:00.000Z', entries },
      allTime: { schemaVersion: 1, periodId: 'all_time', periodType: 'all_time', generatedAt: '2030-04-29T12:00:00.000Z', entries }
    };
    localStorage.setItem('grammarQuestLeaderboardProfile', JSON.stringify({
      optedIn: true,
      participantRef: 'leaderboardParticipants/current',
      displayAlias: 'Comma Captain'
    }));
    localStorage.setItem('grammarQuestLeaderboardProjections', JSON.stringify(projections));
    localStorage.setItem('grammarQuestProgress', JSON.stringify({
      xp: { projection: { totalXp: 430, currentWeeklyXp: 85, currentMonthlyXp: 210 } }
    }));
  });
}

async function assertAdaptiveReviewCompletionFlow(page, baseURL, questionRef) {
  await page.evaluate(ref => {
    localStorage.setItem('grammarQuestProgress', JSON.stringify({
      reports: {
        sessions: [{
          id: 'review-source-session',
          completedAt: '2030-04-28T12:00:00.000Z',
          attempts: [{
            id: ref.id,
            questionId: ref.id,
            questionVersion: ref.version,
            questionHash: ref.contentHash,
            sourceSet: ref.sourceSet,
            sequence: ref.sequence,
            correct: false,
            skillIds: ['grammar.sentence-analysis'],
            standardIds: ['L.3-6.1'],
            question: 'do not persist in review queue',
            choices: ['A', 'B']
          }]
        }],
        questionReports: []
      },
      mastery: {
        skills: {
          'grammar.sentence-analysis': {
            correct: 0,
            total: 1,
            questionRefs: [ref.id]
          }
        }
      }
    }));
  }, questionRef);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertVisible(page, '#start-adaptive-review', 'adaptive review entry');
  await page.click('#start-adaptive-review');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  if (!page.url().startsWith(`${baseURL}/topics/grammar/subtopics/sentence-types.html`)) {
    assert.fail(`adaptive review did not navigate to review quiz: ${page.url()}`);
  }
  await page.waitForSelector('#start-btn', { state: 'visible', timeout: 5000 }).catch(async () => {
    assert.fail(`adaptive review quiz did not render start button: ${await textContent(page, '#quiz-root')}`);
  });

  const activeRequest = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestActiveReviewRequest') || '{}'));
  assert.equal(activeRequest.queue.items[0].questionRef.id, questionRef.id);
  assert.equal(JSON.stringify(activeRequest.queue).includes('do not persist'), false);

  await page.click('#start-btn');
  for (let step = 0; step < 20 && !(await exists(page, '#restart-btn')); step += 1) {
    await assertVisible(page, '.question-box', 'adaptive review question');
    await page.evaluate(() => {
      const confidence = document.querySelector('.confidence-btn[data-confidence="certain"]');
      if (confidence) confidence.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('#choices .choice-btn')).some(button => !button.disabled));
    await page.evaluate(() => window.GrammarQuestQuizEngine.answerVisibleChoiceForTest());
    if (await exists(page, '#restart-btn')) break;
    await page.waitForSelector('#next-question-btn, #restart-btn', { state: 'visible', timeout: 1000 }).catch(async () => {
      assert.fail(`adaptive review did not advance after answering: ${await textContent(page, '#quiz-root')}`);
    });
    if (await exists(page, '#next-question-btn')) await page.click('#next-question-btn');
  }
  await assertVisible(page, '#restart-btn', 'adaptive review results');

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}'));
  const reviewItem = progress.reviewQueue.items.find(item => item.questionRef.id === questionRef.id);
  assert.ok(['seen', 'mastered'].includes(reviewItem.status), 'adaptive review item should be updated after completion');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('grammarQuestActiveReviewRequest')),
    null,
    'active review request should be cleared'
  );
}

async function assertDueReviewCompletionFlow(page, baseURL, questionRef) {
  await page.evaluate(ref => {
    localStorage.setItem('grammarQuestProgress', JSON.stringify({
      reviewSchedules: [{
        ref,
        skillIds: ['grammar.sentence-analysis'],
        intervalDays: 2,
        ease: 2.4,
        dueAt: '2000-01-01T00:00:00.000Z',
        lastReviewedAt: '1999-12-30T00:00:00.000Z',
        streak: 1,
        lapses: 0,
        question: 'do not persist in due review'
      }],
      mastery: {
        skills: {
          'grammar.sentence-analysis': {
            correct: 4,
            total: 4,
            questionRefs: [ref.id]
          }
        }
      },
      reports: { sessions: [], questionReports: [] }
    }));
  }, questionRef);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertVisible(page, '#start-due-review', 'due review entry');
  await page.click('#start-due-review');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  if (!page.url().startsWith(`${baseURL}/topics/grammar/subtopics/sentence-types.html`)) {
    assert.fail(`due review did not navigate to review quiz: ${page.url()}`);
  }
  await assertVisible(page, '#start-btn', 'due review quiz start');
  const activeRequest = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestActiveReviewRequest') || '{}'));
  assert.equal(activeRequest.queue.items[0].reason, 'due_for_review');
  assert.equal(activeRequest.queue.items[0].questionRef.id, questionRef.id);
  assert.equal(JSON.stringify(activeRequest.queue).includes('do not persist'), false);

  await page.click('#start-btn');
  for (let step = 0; step < 20 && !(await exists(page, '#restart-btn')); step += 1) {
    await assertVisible(page, '.question-box', 'due review question');
    await page.evaluate(() => {
      const confidence = document.querySelector('.confidence-btn[data-confidence="certain"]');
      if (confidence) confidence.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('#choices .choice-btn')).some(button => !button.disabled));
    await page.evaluate(() => window.GrammarQuestQuizEngine.answerVisibleChoiceForTest());
    if (await exists(page, '#restart-btn')) break;
    await page.waitForSelector('#next-question-btn, #restart-btn', { state: 'visible', timeout: 1000 });
    if (await exists(page, '#next-question-btn')) await page.click('#next-question-btn');
  }
  await assertVisible(page, '#restart-btn', 'due review results');

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}'));
  const schedule = progress.reviewSchedules.find(item => item.ref.id === questionRef.id);
  assert.ok(schedule, 'due review schedule should remain saved');
  assert.notEqual(schedule.dueAt, '2000-01-01T00:00:00.000Z');
  assert.ok(schedule.lastReviewedAt, 'due review completion should update last reviewed time');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('grammarQuestActiveReviewRequest')),
    null,
    'active due review request should be cleared'
  );
}

async function focusByKeyboard(page, selector) {
  for (let index = 0; index < 40; index += 1) {
    const focused = await page.evaluate(targetSelector => {
      const active = document.activeElement;
      return !!(active && active.matches && active.matches(targetSelector));
    }, selector);
    if (focused) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not focus ${selector} with keyboard`);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth;
  });
  assert.ok(overflow <= 2, `${label} has horizontal overflow of ${overflow}px`);
}

async function assertTouchTargets(page, label) {
  const failures = await page.evaluate(() => {
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    return Array.from(document.querySelectorAll(selector))
      .filter(element => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute('aria-label') || element.textContent.trim() || element.id || element.className,
          width: rect.width,
          height: rect.height
        };
      })
      .filter(item => item.width < 32 || item.height < 32)
      .slice(0, 8);
  });
  assert.deepEqual(failures, [], `${label} has undersized touch targets`);
}

async function assertChunkBackedSubtopicRequests(page, requests, file, expected) {
  if (await exists(page, '#story-lesson-start-practice')) {
    await page.click('#story-lesson-start-practice');
  }
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
  const expectedChunkFiles = getExpectedChunkFiles(expected.chunkFile);
  assert.ok(
    requests.some(url => expectedChunkFiles.some(chunkFile => url.endsWith(`/${chunkFile}`))),
    `${file} should request its ${expected.domain} chunk`
  );
  assert.equal(
    requests.some(url => /\/assets\/question-banks\/[^/]+\.js(?:[?#].*)?$/.test(url)),
    false,
    `${file} should not request any full question bank`
  );
}

function getExpectedChunkFiles(chunkFile) {
  const manifest = questionManifest;
  const subchunkPrefix = chunkFile.replace(/\.js$/, '-');
  const entry = (manifest.sets || []).find(set => {
    return set.chunkFile === chunkFile ||
      set.chunkFile === chunkFile.replace(/\.js$/, '-001.js') ||
      (Array.isArray(set.chunks) && set.chunks.some(chunk => chunk.chunkFile === chunkFile || chunk.chunkFile.startsWith(subchunkPrefix)));
  });
  if (entry && Array.isArray(entry.chunks) && entry.chunks.length) return entry.chunks.map(chunk => chunk.chunkFile);
  return [chunkFile];
}

function getManifestQuestionRef(setId) {
  const set = questionManifest.sets.find(item => item.id === setId);
  const question = set && Array.isArray(set.questions) && set.questions[0];
  assert.ok(question, `expected manifest question for ${setId}`);
  return {
    id: question.id,
    sourceSet: question.sourceSet || set.id,
    version: question.version,
    contentHash: question.contentHash,
    sequence: question.sequence
  };
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

async function assertFreshQuizStartStaysInQuestion(page, file) {
  await assertVisible(page, '#start-btn', file);
  await page.click('#start-btn');
  await assertVisible(page, '.question-box', `${file} started question`);

  const activeQuizAfterStart = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}').activeQuiz || null;
  });
  assert.equal(activeQuizAfterStart, null, `${file} should not save a resumable quiz before the first answer`);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('grammarquest:parent-browse', { detail: {} }));
  });
  await assertVisible(page, '.question-box', `${file} question remains after auth refresh`);
  assert.equal(await exists(page, '#resume-quiz-btn'), false, `${file} should not show resume prompt for a fresh start`);
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

async function assertSessionSignedOutClearsManagedStudent(page) {
  const result = await page.evaluate(() => {
    localStorage.setItem('grammarQuestActiveStudentId', 'student-1');
    localStorage.setItem('grammarQuestActiveStudentName', 'Maya');
    window.GrammarQuestProgress.saveProgress({ totalGems: 99 }, { sync: false });
    window.dispatchEvent(new CustomEvent('grammarquest:session-signed-out', {
      detail: { clearActiveStudent: true }
    }));
    window.GrammarQuestProgress.saveProgress({ totalGems: 1 }, { sync: false });
    return {
      activeStudentId: localStorage.getItem('grammarQuestActiveStudentId'),
      activeStudentName: localStorage.getItem('grammarQuestActiveStudentName'),
      defaultProgress: JSON.parse(localStorage.getItem('grammarQuestProgress') || '{}'),
      studentProgress: JSON.parse(localStorage.getItem('grammarQuestProgress:student-1') || '{}')
    };
  });

  assert.equal(result.activeStudentId, null);
  assert.equal(result.activeStudentName, null);
  assert.equal(result.defaultProgress.totalGems, 1);
  assert.equal(result.studentProgress.totalGems, 99);
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

function domainSetCount(domain) {
  return questionManifest.sets.filter(set => set.domain === domain).length;
}

function assertChunkRequestBudget(requests, domain, label) {
  const chunkUrls = requests.filter(url => url.includes(`/assets/question-chunks/${domain}/`));
  const requestedSetIds = getRequestedChunkSetIds(requests, domain);
  assert.ok(chunkUrls.length > 0, `${label} should hydrate from ${domain} chunks`);
  assert.ok(
    requestedSetIds.size > 0,
    `${label} should hydrate at least one configured ${domain} subtopic`
  );
  assert.ok(
    requestedSetIds.size <= domainSetCount(domain),
    `${label} should not request more ${domain} subtopics than configured`
  );
}

function getRequestedChunkSetIds(requests, domain) {
  const requestedSetIds = new Set();
  const domainSets = questionManifest.sets.filter(set => set.domain === domain);
  for (const set of domainSets) {
    const chunkFiles = Array.isArray(set.chunks) && set.chunks.length
      ? set.chunks.map(chunk => chunk.chunkFile)
      : [set.chunkFile].filter(Boolean);
    if (chunkFiles.some(chunkFile => requests.some(url => url.endsWith(`/${chunkFile}`)))) {
      requestedSetIds.add(set.id);
    }
  }
  return requestedSetIds;
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
      if (pathname === '/api/question-selection') {
        handleQuestionSelectionApi(request, response, parsed);
        return;
      }
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
        server,
        sockets,
        close: () => closeServerWithTimeout(server, sockets, 3000)
      });
    });
  });
}

function handleQuestionSelectionApi(request, response, parsed) {
  if (request.method !== 'POST') {
    response.writeHead(405);
    response.end('Method not allowed');
    return;
  }
  if (parsed.searchParams.get('fail') === '1') {
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'simulated failure' }));
    return;
  }

  let body = '';
  request.on('data', chunk => {
    body += chunk;
  });
  request.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const result = await questionSelectionApiHarness.buildResponse(payload, {
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
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function publicKeyConfig() {
  return {
    [testKeys.kid]: {
      algorithm: testKeys.algorithm,
      publicKey: testKeys.publicKey
    }
  };
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
