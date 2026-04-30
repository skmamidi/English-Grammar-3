const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyAccessibilityPolicy,
  normalizeAxeViolations,
  validateAccessibilityAllowlist
} = require('./helpers/accessibility-engine');

test('normalizes axe violations into deterministic domain findings', () => {
  const findings = normalizeAxeViolations({
    pageLabel: 'Reports',
    violations: [
      {
        id: 'color-contrast',
        impact: 'serious',
        help: 'Elements must meet minimum color contrast ratio thresholds',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
        nodes: [
          { target: ['.muted', 'span:nth-child(2)'], html: '<span class="muted">Low</span>' },
          { target: ['#summary'], html: '<section id="summary">Summary</section>' }
        ]
      },
      {
        id: 'region',
        impact: 'moderate',
        help: 'All page content should be contained by landmarks',
        nodes: [{ target: ['body > div'] }]
      }
    ]
  });

  assert.deepEqual(findings, [
    {
      page: 'Reports',
      ruleId: 'color-contrast',
      impact: 'serious',
      selector: '#summary',
      help: 'Elements must meet minimum color contrast ratio thresholds',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast'
    },
    {
      page: 'Reports',
      ruleId: 'color-contrast',
      impact: 'serious',
      selector: '.muted, span:nth-child(2)',
      help: 'Elements must meet minimum color contrast ratio thresholds',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast'
    },
    {
      page: 'Reports',
      ruleId: 'region',
      impact: 'moderate',
      selector: 'body > div',
      help: 'All page content should be contained by landmarks',
      helpUrl: ''
    }
  ]);
});

test('allowlist entries require owner, rationale, selector, and review date', () => {
  assert.throws(() => validateAccessibilityAllowlist([
    { page: 'Reports', ruleId: 'region', selector: 'main' }
  ], { now: '2026-04-30' }), /owner/);

  assert.throws(() => validateAccessibilityAllowlist([
    {
      page: 'Reports',
      ruleId: 'region',
      selector: 'main',
      owner: 'accessibility-review',
      rationale: 'Tracked while shell landmarks migrate.'
    }
  ], { now: '2026-04-30' }), /reviewOn or expiresOn/);

  assert.doesNotThrow(() => validateAccessibilityAllowlist([
    {
      page: 'Reports',
      ruleId: 'region',
      selector: 'main',
      owner: 'accessibility-review',
      rationale: 'Tracked while shell landmarks migrate.',
      reviewOn: '2026-06-30'
    }
  ], { now: '2026-04-30' }));
});

test('policy fails serious and critical findings but keeps allowlisted moderate findings as warnings', () => {
  const findings = [
    {
      page: 'Reports',
      ruleId: 'color-contrast',
      impact: 'serious',
      selector: '#summary',
      help: 'Elements must meet minimum color contrast ratio thresholds',
      helpUrl: ''
    },
    {
      page: 'Reports',
      ruleId: 'region',
      impact: 'moderate',
      selector: 'body > div',
      help: 'All page content should be contained by landmarks',
      helpUrl: ''
    }
  ];

  const policy = applyAccessibilityPolicy({
    findings,
    allowlist: [
      {
        page: 'Reports',
        ruleId: 'region',
        selector: 'body > div',
        owner: 'accessibility-review',
        rationale: 'Landmark cleanup is tracked in the page-shell backlog.',
        reviewOn: '2026-06-30'
      }
    ],
    now: '2026-04-30'
  });

  assert.deepEqual(policy.failures.map(finding => finding.ruleId), ['color-contrast']);
  assert.deepEqual(policy.warnings.map(finding => finding.ruleId), ['region']);
  assert.deepEqual(policy.staleAllowlistEntries, []);
});

test('policy rejects stale allowlist entries when selectors disappear', () => {
  const policy = applyAccessibilityPolicy({
    findings: [],
    allowlist: [
      {
        page: 'Reports',
        ruleId: 'region',
        selector: 'body > div',
        owner: 'accessibility-review',
        rationale: 'No longer present should be removed.',
        reviewOn: '2026-06-30'
      }
    ],
    now: '2026-04-30'
  });

  assert.equal(policy.failures.length, 0);
  assert.deepEqual(policy.staleAllowlistEntries.map(entry => entry.selector), ['body > div']);
});
