const { chromium, firefox, webkit } = require('playwright');

const SUPPORTED_BROWSER_ENGINES = ['chromium', 'firefox', 'webkit'];
const BROWSER_TYPES = {
  chromium,
  firefox,
  webkit
};
const EXECUTABLE_ENV = {
  chromium: 'PLAYWRIGHT_CHROMIUM_EXECUTABLE',
  firefox: 'PLAYWRIGHT_FIREFOX_EXECUTABLE',
  webkit: 'PLAYWRIGHT_WEBKIT_EXECUTABLE'
};

function requireKnownBrowserEngine(engine) {
  const normalized = String(engine || '').trim().toLowerCase();
  if (!SUPPORTED_BROWSER_ENGINES.includes(normalized)) {
    throw new Error(`Unsupported browser engine "${engine}". Supported engines: ${SUPPORTED_BROWSER_ENGINES.join(', ')}`);
  }
  return normalized;
}

function getCrossBrowserEngines(env = process.env) {
  const value = String(env.QA_CROSS_BROWSER_ENGINES || '').trim();
  if (!value) return SUPPORTED_BROWSER_ENGINES.slice();
  return value
    .split(',')
    .map(item => requireKnownBrowserEngine(item))
    .filter((item, index, items) => items.indexOf(item) === index);
}

function buildBrowserLaunchOptions(engine, env = process.env) {
  const normalized = requireKnownBrowserEngine(engine);
  const options = { headless: true };
  const executablePath = String(env[EXECUTABLE_ENV[normalized]] || '').trim();
  if (executablePath) options.executablePath = executablePath;
  return options;
}

async function launchBrowserForEngine(engine, options = {}) {
  const normalized = requireKnownBrowserEngine(engine);
  const env = options.env || process.env;
  const launchOptions = buildBrowserLaunchOptions(normalized, env);
  return BROWSER_TYPES[normalized].launch(launchOptions);
}

function classifyBrowserLaunchFailure(error, options = {}) {
  const engine = requireKnownBrowserEngine(options.engine);
  const ci = Boolean(options.ci);
  const message = String(error && (error.message || error.stack) || error || '');
  const unavailable = /Executable doesn't exist|browserType\.launch|Host system is missing dependencies|playwright install/i.test(message);
  if (ci || !unavailable) {
    return {
      skip: false,
      message: ci
        ? `${engine} is unavailable in CI; run npm run install:browsers:all in the workflow before test:browser:cross.`
        : `${engine} launch failed: ${message}`
    };
  }
  return {
    skip: true,
    message: `Skipping ${engine}: browser engine is unavailable locally. Run npm run install:browsers:all or set ${EXECUTABLE_ENV[engine]} to a browser executable.`
  };
}

module.exports = {
  SUPPORTED_BROWSER_ENGINES,
  buildBrowserLaunchOptions,
  classifyBrowserLaunchFailure,
  getCrossBrowserEngines,
  launchBrowserForEngine,
  requireKnownBrowserEngine
};
