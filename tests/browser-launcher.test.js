const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildBrowserLaunchOptions,
  classifyBrowserLaunchFailure,
  getCrossBrowserEngines,
  requireKnownBrowserEngine
} = require('./helpers/browser-launcher');

test('browser launcher accepts the supported Playwright engines', () => {
  assert.equal(requireKnownBrowserEngine('chromium'), 'chromium');
  assert.equal(requireKnownBrowserEngine('firefox'), 'firefox');
  assert.equal(requireKnownBrowserEngine('webkit'), 'webkit');
});

test('browser launcher rejects unknown engine names', () => {
  assert.throws(
    () => requireKnownBrowserEngine('opera'),
    /Unsupported browser engine "opera"/
  );
});

test('browser launcher parses the cross-browser engine matrix from env', () => {
  assert.deepEqual(getCrossBrowserEngines({}), ['chromium', 'firefox', 'webkit']);
  assert.deepEqual(getCrossBrowserEngines({
    QA_CROSS_BROWSER_ENGINES: 'chromium, webkit'
  }), ['chromium', 'webkit']);
});

test('browser launcher supports executable overrides per engine', () => {
  assert.deepEqual(buildBrowserLaunchOptions('chromium', {
    PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }), {
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  assert.deepEqual(buildBrowserLaunchOptions('firefox', {
    PLAYWRIGHT_FIREFOX_EXECUTABLE: '/Applications/Firefox.app/Contents/MacOS/firefox'
  }), {
    headless: true,
    executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox'
  });
  assert.deepEqual(buildBrowserLaunchOptions('webkit', {
    PLAYWRIGHT_WEBKIT_EXECUTABLE: '/Applications/WebKit.app/Contents/MacOS/WebKit'
  }), {
    headless: true,
    executablePath: '/Applications/WebKit.app/Contents/MacOS/WebKit'
  });
});

test('browser launcher skips unavailable optional engines locally with setup guidance', () => {
  const classification = classifyBrowserLaunchFailure(new Error("Executable doesn't exist at /tmp/firefox"), {
    engine: 'firefox',
    ci: false
  });

  assert.equal(classification.skip, true);
  assert.match(classification.message, /Skipping firefox/);
  assert.match(classification.message, /npm run install:browsers:all/);
});

test('browser launcher fails closed for unavailable engines in CI', () => {
  const classification = classifyBrowserLaunchFailure(new Error("Executable doesn't exist at /tmp/webkit"), {
    engine: 'webkit',
    ci: true
  });

  assert.equal(classification.skip, false);
  assert.match(classification.message, /webkit is unavailable in CI/);
});
