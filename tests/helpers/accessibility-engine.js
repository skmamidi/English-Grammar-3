const fs = require('node:fs');
const path = require('node:path');

const BLOCKING_IMPACTS = new Set(['critical', 'serious']);
const WARNING_IMPACTS = new Set(['moderate']);

function normalizeAxeViolations({ pageLabel, violations }) {
  return Array.from(violations || [])
    .flatMap(violation => Array.from(violation.nodes || []).map(node => ({
      page: String(pageLabel || ''),
      ruleId: String(violation.id || ''),
      impact: String(violation.impact || 'unknown'),
      selector: normalizeSelector(node.target),
      help: String(violation.help || ''),
      helpUrl: String(violation.helpUrl || '')
    })))
    .sort(compareFindings);
}

function applyAccessibilityPolicy({ findings, allowlist = [], now = new Date().toISOString().slice(0, 10) }) {
  validateAccessibilityAllowlist(allowlist, { now });
  const normalizedFindings = Array.from(findings || []).map(normalizeFinding);
  const normalizedAllowlist = allowlist.map(normalizeAllowlistEntry);
  const allowlistKeys = new Set(normalizedAllowlist.map(allowlistKey));
  const findingKeys = new Set(normalizedFindings.map(allowlistKey));

  const failures = [];
  const warnings = [];

  normalizedFindings.forEach(finding => {
    if (allowlistKeys.has(allowlistKey(finding))) {
      warnings.push(finding);
      return;
    }
    if (BLOCKING_IMPACTS.has(finding.impact)) failures.push(finding);
    else if (WARNING_IMPACTS.has(finding.impact)) warnings.push(finding);
  });

  return {
    failures: failures.sort(compareFindings),
    warnings: warnings.sort(compareFindings),
    staleAllowlistEntries: normalizedAllowlist
      .filter(entry => !findingKeys.has(allowlistKey(entry)))
      .sort(compareAllowlistEntries)
  };
}

function validateAccessibilityAllowlist(allowlist = [], { now = new Date().toISOString().slice(0, 10) } = {}) {
  Array.from(allowlist).forEach((entry, index) => {
    const label = `allowlist[${index}]`;
    ['page', 'ruleId', 'selector', 'owner', 'rationale'].forEach(field => {
      if (!hasText(entry && entry[field])) throw new Error(`${label} missing ${field}`);
    });
    if (!hasText(entry.reviewOn) && !hasText(entry.expiresOn)) {
      throw new Error(`${label} missing reviewOn or expiresOn`);
    }
    if (hasText(entry.reviewOn)) assertDateNotExpired(entry.reviewOn, now, `${label} reviewOn`);
    if (hasText(entry.expiresOn)) assertDateNotExpired(entry.expiresOn, now, `${label} expiresOn`);
  });
}

async function injectAccessibilityEngine(page) {
  const axePath = require.resolve('axe-core/axe.min.js');
  await page.addScriptTag({ path: axePath });
}

async function scanAccessibilityPage(page, { pageLabel, context = 'body', axeOptions } = {}) {
  const hasAxe = await page.evaluate(() => Boolean(window.axe && window.axe.run));
  if (!hasAxe) await injectAccessibilityEngine(page);
  const results = await page.evaluate(async ({ contextSelector, options }) => {
    return window.axe.run(contextSelector, options || {});
  }, { contextSelector: context, options: axeOptions || defaultAxeOptions() });
  return {
    page: String(pageLabel || ''),
    raw: results,
    findings: normalizeAxeViolations({ pageLabel, violations: results.violations })
  };
}

function writeAccessibilityArtifact(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function defaultAxeOptions() {
  return {
    resultTypes: ['violations'],
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
    }
  };
}

function normalizeSelector(target) {
  if (Array.isArray(target)) return target.map(part => String(part).trim()).filter(Boolean).join(', ');
  return String(target || '').trim();
}

function normalizeFinding(finding) {
  return {
    page: String(finding.page || ''),
    ruleId: String(finding.ruleId || ''),
    impact: String(finding.impact || 'unknown'),
    selector: normalizeSelector(finding.selector),
    help: String(finding.help || ''),
    helpUrl: String(finding.helpUrl || '')
  };
}

function normalizeAllowlistEntry(entry) {
  return {
    page: String(entry.page || ''),
    ruleId: String(entry.ruleId || ''),
    selector: normalizeSelector(entry.selector),
    owner: String(entry.owner || ''),
    rationale: String(entry.rationale || ''),
    reviewOn: String(entry.reviewOn || ''),
    expiresOn: String(entry.expiresOn || '')
  };
}

function allowlistKey(entry) {
  return [entry.page, entry.ruleId, normalizeSelector(entry.selector)].join('\u001f');
}

function compareFindings(left, right) {
  return left.page.localeCompare(right.page)
    || left.ruleId.localeCompare(right.ruleId)
    || compareSelectors(left.selector, right.selector)
    || left.impact.localeCompare(right.impact);
}

function compareAllowlistEntries(left, right) {
  return left.page.localeCompare(right.page)
    || left.ruleId.localeCompare(right.ruleId)
    || compareSelectors(left.selector, right.selector);
}

function compareSelectors(left, right) {
  const leftValue = String(left);
  const rightValue = String(right);
  return selectorRank(leftValue) - selectorRank(rightValue)
    || leftValue.localeCompare(rightValue, 'en', { sensitivity: 'variant', numeric: true });
}

function selectorRank(selector) {
  if (selector.startsWith('#')) return 0;
  if (selector.startsWith('.')) return 1;
  return 2;
}

function assertDateNotExpired(value, now, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  if (value < now) throw new Error(`${label} is expired`);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

module.exports = {
  applyAccessibilityPolicy,
  injectAccessibilityEngine,
  normalizeAxeViolations,
  scanAccessibilityPage,
  validateAccessibilityAllowlist,
  writeAccessibilityArtifact
};
