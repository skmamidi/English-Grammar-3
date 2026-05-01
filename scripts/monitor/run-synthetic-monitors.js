#!/usr/bin/env node

const {
  DEFAULT_SYNTHETIC_MONITOR_POLICY,
  buildSyntheticFailureSummary,
  sanitizeSyntheticMonitorResult,
  validateSyntheticMonitorPolicy
} = require('../../assets/synthetic-monitor-policy');

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://127.0.0.1:8000',
    json: false,
    dryRun: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--base-url') {
      index += 1;
      options.baseUrl = argv[index];
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function buildSyntheticMonitorTargets(policy = DEFAULT_SYNTHETIC_MONITOR_POLICY, baseUrl = 'http://127.0.0.1:8000') {
  const validation = validateSyntheticMonitorPolicy(policy);
  const base = new URL(baseUrl);
  base.search = '';
  base.hash = '';
  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;

  return validation.policy.monitors.map(monitor => {
    const relativePath = monitor.targetPath.replace(/^\/+/, '');
    const url = new URL(`${basePath}${relativePath}`, base);
    url.search = '';
    url.hash = '';
    return Object.assign({}, monitor, {
      url: url.toString()
    });
  });
}

async function runSyntheticMonitors(policy = DEFAULT_SYNTHETIC_MONITOR_POLICY, options = {}) {
  const targets = buildSyntheticMonitorTargets(policy, options.baseUrl || 'http://127.0.0.1:8000');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || Date.now;

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to run synthetic monitors.');
  }

  const results = [];
  for (const target of targets) {
    results.push(await runSyntheticMonitorTarget(target, { fetchImpl, now }));
  }

  const summary = buildSyntheticFailureSummary(policy, results);
  return Object.assign({}, summary, { results });
}

async function runSyntheticMonitorTarget(target, options) {
  const startedAt = options.now();
  try {
    const response = await options.fetchImpl(target.url, {
      method: target.method,
      signal: AbortSignal.timeout(target.timeoutMs)
    });
    const status = Number(response?.status) || 0;
    const body = target.method === 'HEAD' ? '' : await safeReadText(response);
    const assertionResult = evaluateAssertions(target.assertions, status, body);
    return sanitizeSyntheticMonitorResult({
      id: target.id,
      ok: assertionResult.ok,
      status,
      targetUrl: target.url,
      durationMs: Math.max(0, Math.round(options.now() - startedAt)),
      error: assertionResult.error
    });
  } catch (error) {
    return sanitizeSyntheticMonitorResult({
      id: target.id,
      ok: false,
      status: 0,
      targetUrl: target.url,
      durationMs: Math.max(0, Math.round(options.now() - startedAt)),
      error: error && error.name === 'TimeoutError' ? 'synthetic monitor timed out' : 'synthetic monitor request failed'
    });
  }
}

function evaluateAssertions(assertions, status, body) {
  for (const assertion of assertions) {
    if (assertion.startsWith('status:')) {
      const expected = Number(assertion.slice('status:'.length));
      if (status !== expected) {
        return { ok: false, error: `expected status ${expected}, received ${status}` };
      }
    } else if (assertion.startsWith('body:')) {
      const expectedText = assertion.slice('body:'.length).toLowerCase();
      if (!String(body || '').toLowerCase().includes(expectedText)) {
        return { ok: false, error: 'expected public page marker was not present' };
      }
    }
  }
  return { ok: true, error: '' };
}

async function safeReadText(response) {
  if (!response || typeof response.text !== 'function') return '';
  try {
    const text = await response.text();
    return String(text || '').slice(0, 4096);
  } catch {
    return '';
  }
}

async function runCli() {
  const options = parseArgs(process.argv);
  const policy = DEFAULT_SYNTHETIC_MONITOR_POLICY;
  if (options.dryRun) {
    const validation = validateSyntheticMonitorPolicy(policy);
    const targets = buildSyntheticMonitorTargets(policy, options.baseUrl);
    printResult({ ok: validation.valid, errors: validation.errors, targets }, options.json);
    process.exitCode = validation.valid ? 0 : 1;
    return;
  }

  const summary = await runSyntheticMonitors(policy, { baseUrl: options.baseUrl });
  printResult(summary, options.json);
  process.exitCode = summary.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.targets) {
    console.log(`Synthetic monitor targets: ${result.targets.length}`);
    result.targets.forEach(target => console.log(`- ${target.id} ${target.url}`));
    return;
  }

  console.log(result.ok ? 'Synthetic monitors passed.' : 'Synthetic monitors failed.');
  (result.failures || []).forEach(failure => {
    console.log(`- ${failure.id}: ${failure.nextStep} Runbook: ${failure.runbook}`);
  });
}

if (require.main === module) {
  runCli().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  buildSyntheticMonitorTargets,
  parseArgs,
  runSyntheticMonitorTarget,
  runSyntheticMonitors
};
