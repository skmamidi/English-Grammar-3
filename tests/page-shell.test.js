const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const shell = require('../assets/page-shell');
const routeInventory = require('../scripts/qa/page-inventory');

const repoRoot = path.resolve(__dirname, '..');

test('page shell initializes lifecycle hooks without requiring optional services', async () => {
  const document = createDocument();
  const result = await shell.initializePageShell({
    document,
    window: {},
    pageId: 'settings',
    authService: null,
    telemetry: null,
    serviceWorker: null
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.authState.enabled, false);
  assert.deepEqual(result.events.map(event => event.type), ['shell:init', 'shell:auth-unavailable', 'shell:ready']);
  assert.equal(document.documentElement.dataset.pageShell, 'ready');
});

test('page shell blocks telemetry until consent-aware config allows it', async () => {
  const telemetryCalls = [];
  await shell.initializePageShell({
    document: createDocument(),
    window: {},
    pageId: 'settings',
    authService: { ready: () => Promise.resolve({ signedIn: true, consent: { telemetry: false } }) },
    telemetry: { install: options => telemetryCalls.push(options) },
    telemetryConfig: { enabled: true, consent: { telemetry: false } }
  });

  assert.deepEqual(telemetryCalls, []);
});

test('page shell surfaces service worker failures without raw stack traces', async () => {
  const document = createDocument();
  const result = await shell.initializePageShell({
    document,
    window: {},
    pageId: 'settings',
    serviceWorker: {
      register() {
        throw new Error('raw stack token secret should not leak');
      }
    },
    serviceWorkerConfig: { enabled: true }
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.events.some(event => event.type === 'shell:service-worker-failed'));
  assert.match(document.body.innerHTML, /Offline support is unavailable/);
  assert.equal(document.body.innerHTML.includes('secret'), false);
});

test('route composition inventory covers every production html route', () => {
  const inventory = routeInventory.buildRouteCompositionInventory({ root: repoRoot });
  const routePaths = inventory.routes.map(route => route.path);

  assert.deepEqual(routePaths, routeInventory.listHtmlFiles(repoRoot));
  assert.equal(inventory.routes.every(route => route.type && route.requiredShellAssets.includes('assets/styles.css')), true);
  assert.equal(inventory.routes.some(route => route.path.includes('node_modules')), false);
  assert.equal(inventory.routes.some(route => route.path.includes('test-results')), false);
});

test('route composition inventory classifies shells optional scripts and legacy globals', () => {
  const inventory = routeInventory.buildRouteCompositionInventory({ root: repoRoot });
  const byPath = new Map(inventory.routes.map(route => [route.path, route]));

  assert.equal(byPath.get('index.html').type, 'home');
  assert.equal(byPath.get('topics/grammar/index.html').type, 'topic-index');
  assert.equal(byPath.get('topics/grammar/subtopics/sentence-types.html').type, 'quiz');
  assert.equal(byPath.get('guardian-dashboard.html').type, 'dashboard');
  assert.equal(byPath.get('admin-operations.html').type, 'operations');
  assert.equal(byPath.get('discovery.html').type, 'content-discovery');
  assert.equal(byPath.get('settings.html').usesSharedShell, true);
  assert.equal(byPath.get('index.html').serviceWorkerParticipation, 'registers');
  assert.ok(byPath.get('guardian-dashboard.html').optionalScripts.includes('assets/app-telemetry.js'));
  assert.ok(byPath.get('topics/grammar/subtopics/sentence-types.html').legacyGlobals.includes('QUIZ_SET_ID'));
  assert.deepEqual(inventory.legacyGlobals, ['QUIZ_SET_ID']);
});

test('route composition documentation explains update rules and generated payload exclusions', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'frontend-architecture.md'), 'utf8');

  assert.match(docs, /route composition inventory/i);
  assert.match(docs, /npm run qa:page-inventory/);
  assert.match(docs, /generated question payloads/i);
  assert.match(docs, /legacy globals/i);
});

function createDocument() {
  const listeners = {};
  const body = {
    innerHTML: '',
    insertAdjacentHTML(_position, html) {
      this.innerHTML += html;
    }
  };
  return {
    body,
    documentElement: { dataset: {} },
    readyState: 'complete',
    addEventListener(name, handler) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(handler);
    },
    dispatchEvent(event) {
      (listeners[event.type] || []).forEach(handler => handler(event));
    },
    createEvent(type, detail) {
      return { type, detail };
    }
  };
}
