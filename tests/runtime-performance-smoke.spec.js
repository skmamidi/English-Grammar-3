#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const { createRequestRecorder } = require('./helpers/request-metrics');
const {
  collectRuntimePerformanceMetrics,
  installRuntimePerformanceProbe
} = require('./helpers/runtime-performance-probe');
const {
  evaluateRuntimePerformanceBudget,
  getRuntimePerformanceBudgets,
  writeRuntimePerformanceArtifact
} = require('./helpers/runtime-performance-budgets');
const {
  closeBrowserWithDiagnostics,
  closeServerWithTimeout,
  closeTrackedPagesAndContexts,
  createBrowserResourceTracker,
  newTrackedPage,
  runCase
} = require('./helpers/smoke-runner');

const repoRoot = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.QA_PORT) || 4185;
const strict = process.env.STRICT_RUNTIME_PERF_BUDGETS === '1';
const budgets = getRuntimePerformanceBudgets({ strict });
const artifactDir = path.join(repoRoot, 'test-results', 'performance');

const FLOWS = [
  { flow: 'large-grammar-mixed-quiz', route: 'topics/grammar/index.html' },
  { flow: 'reading-comprehension-subtopic', route: 'topics/reading-comprehension/subtopics/main-idea-supporting-details.html' },
  { flow: 'adaptive-review-queue', route: 'index.html', seed: seedReviewState },
  { flow: 'parent-dashboard-projection', route: 'guardian-dashboard.html', seed: seedDashboardState },
  { flow: 'assignment-launch', route: 'assignments.html', seed: seedAssignmentState }
];

async function main() {
  const server = await startStaticServer(requestedPort);
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const tracker = createBrowserResourceTracker();
  const failures = [];

  try {
    for (const flow of FLOWS) {
      await runCase(failures, `${flow.flow} stays within runtime performance budgets`, async () => {
        const page = await newTrackedPage(browser, tracker);
        await installRuntimePerformanceProbe(page);
        if (flow.seed) await page.addInitScript(flow.seed);
        const recorder = createRequestRecorder(page);
        const start = Date.now();
        await page.goto(`${server.baseURL}/${flow.route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        const metrics = await collectRuntimePerformanceMetrics(page, {
          flow: flow.flow,
          route: `/${flow.route}`,
          hydrationMs: Date.now() - start,
          requestSummary: recorder.summarize()
        });
        const result = evaluateRuntimePerformanceBudget(metrics, budgets);
        writeRuntimePerformanceArtifact(result, { dir: artifactDir });
        assert.deepEqual(result.errors, [], `${flow.flow} budget errors: ${JSON.stringify(result, null, 2)}`);
      });
    }
  } finally {
    await closeTrackedPagesAndContexts(tracker, 3000);
    await closeBrowserWithDiagnostics(browser, tracker, 5000);
    await server.close();
  }

  if (failures.length) {
    failures.forEach(failure => console.error(failure.stack || failure.message || failure));
    process.exit(1);
  }
  console.log('Runtime performance smoke passed.');
}

function seedReviewState() {
  const progress = {
    savedSessions: [{
      completedAt: '2030-04-29T12:00:00.000Z',
      attempts: [
        { questionId: 'grammar-sentence-types-q0001', correct: false, skillIds: ['grammar.sentence-analysis'] },
        { questionId: 'grammar-sentence-types-q0002', correct: true, skillIds: ['grammar.sentence-analysis'] }
      ]
    }],
    spacedRepetition: {
      schedules: [{
        ref: { id: 'grammar-sentence-types-q0001', sourceSet: 'grammar-sentence-types', version: 1 },
        skillIds: ['grammar.sentence-analysis'],
        dueAt: '2030-04-28T12:00:00.000Z',
        intervalDays: 1,
        ease: 2
      }]
    },
    mastery: { skills: { 'grammar.sentence-analysis': { correct: 1, total: 4 } } }
  };
  localStorage.setItem('grammarQuestProgress', JSON.stringify(progress));
}

function seedDashboardState() {
  localStorage.setItem('grammarQuestProgress', JSON.stringify({
    savedSessions: [{
      completedAt: '2030-04-29T12:00:00.000Z',
      attempts: [
        { questionId: 'grammar-q1', correct: false, skillIds: ['grammar.fragments'] },
        { questionId: 'grammar-q2', correct: true, skillIds: ['grammar.fragments'] },
        { questionId: 'vocab-q1', correct: true, skillIds: ['vocabulary.context'] }
      ]
    }],
    assignments: [{ id: 'assignment-1', status: 'active', scope: { skillIds: ['grammar.fragments'] } }]
  }));
}

function seedAssignmentState() {
  localStorage.setItem('grammarQuestAssignments', JSON.stringify([{
    id: 'assignment-1',
    title: 'Runtime Budget Assignment',
    status: 'active',
    scope: { setIds: ['grammar-sentence-types'], skillIds: ['grammar.sentence-analysis'] }
  }]));
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
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function getChromiumLaunchOptions() {
  return Object.assign(
    { headless: true },
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}
  );
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
