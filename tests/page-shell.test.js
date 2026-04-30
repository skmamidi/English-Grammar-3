const assert = require('node:assert/strict');
const test = require('node:test');

const shell = require('../assets/page-shell');

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
