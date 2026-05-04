const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

test('package lock pins Playwright for reproducible installs', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');

  assert.equal(pkg.devDependencies['axe-core'], '4.11.4');
  assert.equal(lock.packages[''].devDependencies['axe-core'], '4.11.4');
  assert.equal(lock.packages['node_modules/axe-core'].version, '4.11.4');
  assert.equal(pkg.devDependencies.playwright, '1.59.1');
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.packages[''].devDependencies.playwright, '1.59.1');
  assert.equal(lock.packages['node_modules/playwright'].version, '1.59.1');
  assert.equal(lock.packages['node_modules/playwright-core'].version, '1.59.1');
});

test('package scripts expose reproducible browser install and full QA gate', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.scripts['install:browsers'], 'playwright install chromium');
  assert.equal(pkg.scripts['install:browsers:all'], 'playwright install chromium firefox webkit');
  assert.match(pkg.scripts.test, /npm run qa:questions/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:schema/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:json-source/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:question-consistency/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:manifest/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:chunks/);
  assert.match(pkg.scripts['qa:questions'], /npm run qa:chunk-size/);
  assert.match(pkg.scripts.test, /npm run qa:content/);
  assert.match(pkg.scripts.test, /npm run test:unit/);
  assert.match(pkg.scripts.test, /npm run test:ui/);
  assert.match(pkg.scripts.test, /npm run test:a11y/);
  assert.match(pkg.scripts.test, /npm run test:offline/);
  assert.match(pkg.scripts['test:fast'], /npm run qa:app-shell/);
  assert.equal(pkg.scripts['test:a11y'], 'node tests/accessibility-smoke.spec.js && npm run test:a11y:engine');
  assert.equal(pkg.scripts['test:a11y:engine'], 'node tests/accessibility-engine.spec.js');
  assert.equal(pkg.scripts['test:a11y:preferences'], 'node tests/accessibility-preferences.spec.js');
  assert.equal(pkg.scripts['test:offline'], 'node tests/offline-smoke.spec.js');
  assert.equal(pkg.scripts['test:visual'], 'node tests/visual-regression.spec.js');
  assert.equal(pkg.scripts['test:perf'], 'node tests/runtime-performance-smoke.spec.js');
  assert.equal(pkg.scripts['test:ui:teardown'], 'QA_UI_TEARDOWN_DEBUG=1 node tests/ui-smoke.spec.js');
  assert.equal(pkg.scripts['test:progressive'], 'node tests/progressive-enhancement-smoke.spec.js');
  assert.match(pkg.scripts['test:full'], /npm run test:progressive/);
  assert.equal(pkg.scripts['test:browser:cross'], 'node tests/cross-browser-smoke.spec.js');
  assert.equal(pkg.scripts['test:api:perf'], 'STRICT_PERF_BUDGETS=1 node --test tests/question-selection-api-budget.test.js');
  assert.equal(pkg.scripts['test:rules'], 'node --test tests/backend-policy-rules.test.js tests/provider-security-rules.test.js');
  assert.equal(pkg.scripts['security:scan'], 'node scripts/security/scan-secrets.js');
  assert.equal(pkg.scripts['security:licenses'], 'node scripts/security/check-licenses.js');
  assert.equal(pkg.scripts['security:audit'], 'npm audit --audit-level=high');
  assert.equal(pkg.scripts['build:frontend'], 'node scripts/build-frontend.js');
  assert.equal(pkg.scripts['qa:app-shell'], 'node scripts/qa/app-shell-size-budget.js');
  assert.equal(pkg.scripts['qa:app-shell-size'], 'node scripts/qa/app-shell-size-budget.js');
  assert.equal(pkg.scripts['qa:static-assets'], 'node scripts/qa/static-asset-qa.js');
  assert.equal(pkg.scripts['qa:page-inventory'], 'node scripts/qa/page-inventory.js');
  assert.equal(pkg.scripts['qa:operational-costs'], 'node scripts/qa/operational-cost-budget.js');
  assert.equal(pkg.scripts['qa:failure-drills'], 'node scripts/qa/failure-injection-drills.js');
  assert.equal(pkg.scripts['qa:backup-rollback'], 'node scripts/qa/backup-rollback-rehearsals.js');
  assert.equal(pkg.scripts['qa:incident-review'], 'node scripts/qa/incident-review-policy.js');
  assert.equal(pkg.scripts['qa:environment-parity'], 'node scripts/qa/environment-parity.js');
  assert.equal(pkg.scripts['qa:ai-authoring'], 'node scripts/qa/ai-authoring-guardrails-qa.js');
  assert.equal(pkg.scripts['qa:module-boundaries'], 'node scripts/qa/module-boundary-audit.js');
  assert.equal(pkg.scripts['qa:deprecations'], 'node scripts/qa/deprecation-inventory.js');
  assert.equal(pkg.scripts['qa:staging-smoke'], 'node scripts/qa/staging-smoke.js');
  assert.equal(pkg.scripts['qa:config-rotation'], 'node scripts/qa/config-rotation-rehearsal.js');
  assert.equal(pkg.scripts['qa:deployment-attestation'], 'node scripts/qa/deployment-attestation.js');
  assert.match(pkg.scripts['qa:content'], /npm run qa:ai-authoring/);
  assert.match(pkg.scripts['test:fast'], /npm run qa:static-assets/);
  assert.equal(pkg.scripts['qa:pr-readiness'], 'node scripts/qa/pr-readiness-monitor.js');
  assert.equal(pkg.scripts['qa:lessons'], 'node scripts/qa/story-lesson-qa.js');
  assert.ok(fs.existsSync(path.join(repoRoot, 'content-review', 'story-lesson-review-records.json')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'story-lesson-review-rubric.md')));
  assert.match(pkg.scripts['test:unit'], /tests\/access-control\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/frontend-build-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/domain-type-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/story-lesson-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/lesson-progress-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/story-lesson-generation\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/story-lesson-qa\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/shared-domain-portability\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/cross-platform-session-storage-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/native-learner-sync-acceptance\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/universal-link-route-parity\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/cross-platform-release-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-readiness-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-owner-profile-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-catalog-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/subscription-ux-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/transactional-communication-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-security-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-support-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-provider-capability-matrix\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-domain-contracts\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/payment-provider-adapter-boundary\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/checkout-method-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/checkout-launch-availability-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-webhook-ledger-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-entitlement-projection\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-status-presentation\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/payment-history-presentation\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-management-action-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-state-presentation-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/fake-provider-billing-fixtures\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/subscription-route-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/subscription-plan-choice-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-ux-regression-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-data-inventory-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-launch-checklist-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-operations-job-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-support-workflow-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-observability-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-payment-rehearsal-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-rollback-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/cross-platform-commerce-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-market-readiness-matrix\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/app-shell-size-budget\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/static-asset-qa\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/runtime-performance-probe\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/page-shell\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/progressive-enhancement-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/component-harness\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/components\/status-components\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/components\/control-components\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/secret-scan\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/license-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/guardian-access\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/system-admin-access\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/audit-log-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-signing\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-health\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-telemetry\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/production-slo-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/failure-injection-drill-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/backup-rollback-rehearsal-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/incident-review-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/environment-parity-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/ui-copy-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/policy-aware-feature-flags\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-api-budget\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-selection-service\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/backend-policy-rules\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/provider-security-rules\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/deployment-attestation\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/platform-content-package-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/native-design-token-export\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/learner-state-repository\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/learner-goals-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/learner-goal-projection-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/learner-data-lifecycle-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/learner-data-retention-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/privacy-docs\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/compliance-release-checklist\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/architecture-decision-records\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/module-boundary-audit\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/deprecation-inventory\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/provider-adapter-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/staging-deployment-smoke-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/config-rotation-rehearsal-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/assignment-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/assignment-repository-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/classroom-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/assignment-quiz-adapter\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/adaptive-review-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/adaptive-review-selection\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/mastery-model-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/mastery-projection-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/spaced-repetition-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/review-schedule-projection\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/learning-analytics-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/aggregate-learning-analytics-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/aggregate-learning-analytics-cli\.test\.js/);
  assert.equal(pkg.scripts['analytics:learning-summary'], 'node scripts/analytics/summarize-learning-events.js');
  assert.equal(pkg.scripts['monitor:synthetic'], 'node scripts/monitor/run-synthetic-monitors.js');
  assert.match(pkg.scripts['test:unit'], /tests\/recommendation-evaluation\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/recommendation-fairness\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/content-discovery-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/content-discovery-ui\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/content-authoring-guardrails-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/ai-authoring-guardrails-qa\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/source-remediation-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/source-attribution\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/source-license-qa\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/curriculum-review-queue-dashboard\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/content-change-impact-analysis\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/curriculum-release-channel-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/reviewer-workload-sla-report\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/authoring-fixture-library\.test\.js/);
  assert.equal(pkg.scripts['qa:source-license'], 'node scripts/qa/source-license-qa.js');
  assert.match(pkg.scripts['test:unit'], /tests\/chunk-size-budget\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/question-skill-taxonomy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/pr-readiness-monitor\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/ui-smoke-runner-contract\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/browser-launcher\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/offline-cache-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/service-worker-cache\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/visual-state-matrix\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/accessibility-engine-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/design-token-accessibility\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/operations-docs\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/synthetic-monitor-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/operational-cost-budget\.test\.js/);
  assert.equal(pkg.scripts['questions:normalize'], 'node scripts/assign-question-ids.js --write');
  assert.equal(pkg.scripts['questions:write'], 'npm run manifest:write');
  assert.match(pkg.scripts['release:manifest'], /generate-release-manifest/);
});

test('release manifest and rollback playbook contracts exist', () => {
  const generator = fs.readFileSync(path.join(repoRoot, 'scripts', 'generate-release-manifest.js'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const rollback = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'release-and-rollback.md'), 'utf8');
  const operationsIndex = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'README.md'), 'utf8');

  assert.match(generator, /buildReleaseManifest/);
  assert.match(checklist, /release manifest/i);
  assert.match(checklist, /runbook-stale-question-artifacts/);
  assert.match(operationsIndex, /runbook-selection-api-failure/);
  assert.match(rollback, /disable server selection/i);
  assert.match(rollback, /disable preloading/i);
  assert.match(rollback, /service worker cache/i);
});

test('github qa workflow uses npm ci, installs chromium, and runs npm test', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'qa.yml'), 'utf8');

  assert.match(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*true/);
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /node-version:\s*24/);
  assert.match(workflow, /cache:\s*npm/);
  assert.match(workflow, /timeout-minutes:\s*10/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm run security:scan/);
  assert.match(workflow, /run:\s*npm run security:licenses/);
  assert.match(workflow, /run:\s*npm run security:audit/);
  assert.match(workflow, /run:\s*npx playwright install --with-deps chromium/);
  assert.match(workflow, /run:\s*npm run test:rules/);
  assert.match(workflow, /run:\s*npm test/);
  assert.doesNotMatch(workflow, /node-version:\s*20/);
  assert.doesNotMatch(workflow, /ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION/);
  assert.doesNotMatch(workflow, /actions\/checkout@v4/);
  assert.doesNotMatch(workflow, /actions\/setup-node@v4/);
});

test('scheduled PR readiness monitor checks recent completions and ready queue', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'pr-readiness-monitor.yml'), 'utf8');
  const registry = readJson('docs/prs/status.json');

  assert.match(workflow, /cron:\s*'\*\/30 \* \* \* \*'/);
  assert.match(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*true/);
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /node-version:\s*24/);
  assert.match(workflow, /run:\s*npm run qa:pr-readiness/);
  assert.match(workflow, /run:\s*npm run test:fast/);
  assert.equal(registry.policy.readyPrMinimum, 5);
  assert.ok(registry.prs.filter(pr => pr.status === 'ready').length >= 5);
  assert.ok(registry.prs.some(pr => pr.status === 'completed' && pr.review?.status === 'passed'));
});

test('github workflows use approved pinned action majors and no insecure runtime opt-out', () => {
  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  const approvedActions = new Map([
    ['actions/checkout', new Set(['v6'])],
    ['actions/setup-node', new Set(['v6'])],
    ['actions/upload-artifact', new Set(['v7'])]
  ]);

  fs.readdirSync(workflowsDir)
    .filter(file => /\.ya?ml$/.test(file))
    .forEach(file => {
      const source = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      assert.doesNotMatch(source, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE20:\s*true/i, `${file} must not opt into old action runtimes`);
      assert.doesNotMatch(source, /ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION/i, `${file} must not allow insecure action runtimes`);
      assert.doesNotMatch(source, /node-version:\s*(1[0-9]|20|22)\b/, `${file} must use Node 24`);
      Array.from(source.matchAll(/uses:\s*([^\s#]+)/g)).forEach(match => {
        const actionRef = match[1];
        const [name, version] = actionRef.split('@');
        assert.ok(version, `${file} ${actionRef} must pin an action version`);
        assert.ok(approvedActions.has(name), `${file} ${actionRef} must be in the approved action allowlist`);
        assert.ok(approvedActions.get(name).has(version), `${file} ${actionRef} must use an approved major`);
      });
    });
});

test('ui smoke defaults to Playwright-managed Chromium with env override only', () => {
  const smoke = fs.readFileSync(path.join(repoRoot, 'tests', 'ui-smoke.spec.js'), 'utf8');

  assert.match(smoke, /PLAYWRIGHT_CHROMIUM_EXECUTABLE/);
  assert.doesNotMatch(smoke, /Google Chrome\.app|Chromium\.app/);
});

test('ui smoke runner has deterministic teardown guards', () => {
  const smoke = fs.readFileSync(path.join(repoRoot, 'tests', 'ui-smoke.spec.js'), 'utf8');
  const helper = fs.readFileSync(path.join(repoRoot, 'tests', 'helpers', 'smoke-runner.js'), 'utf8');

  assert.match(smoke, /createBrowserResourceTracker/);
  assert.match(smoke, /closeTrackedPagesAndContexts\(browserTracker,\s*3000\)/);
  assert.match(smoke, /closeBrowserWithDiagnostics\(browser,\s*browserTracker,\s*5000\)/);
  assert.match(smoke, /closeServerWithTimeout\(server,\s*sockets,\s*3000\)/);
  assert.match(helper, /clearTimeout\(timeoutId\)/);
  assert.match(helper, /openContextCount/);
  assert.match(helper, /pageUrls/);
  assert.match(helper, /closeAllConnections/);
  assert.match(helper, /socket\.destroy\(\)/);
  assert.doesNotMatch(smoke, /process\.exit\(0\)\s*;\s*\/\//);
});

test('regular browser smoke disables service worker registration while offline smoke owns it', () => {
  const uiSmoke = fs.readFileSync(path.join(repoRoot, 'tests', 'ui-smoke.spec.js'), 'utf8');
  const a11ySmoke = fs.readFileSync(path.join(repoRoot, 'tests', 'accessibility-smoke.spec.js'), 'utf8');
  const offlineSmoke = fs.readFileSync(path.join(repoRoot, 'tests', 'offline-smoke.spec.js'), 'utf8');

  assert.match(uiSmoke, /disableServiceWorker:\s*true/);
  assert.match(a11ySmoke, /disableServiceWorker:\s*true/);
  assert.match(offlineSmoke, /navigator\.serviceWorker\.ready/);
});

test('live default tests do not load legacy JS question banks as canonical source', () => {
  const jsonSourceTests = fs.readFileSync(path.join(repoRoot, 'tests', 'question-bank-json-source.test.js'), 'utf8');

  assert.doesNotMatch(jsonSourceTests, /loadQuestionBanks\(\{\s*sourceType:\s*['"]legacy['"]\s*\}\)/);
  assert.match(jsonSourceTests, /fixtures['"], ['"]legacy-bank-conversion/);
});

test('question authoring guide documents the canonical content workflow', () => {
  const guide = fs.readFileSync(path.join(repoRoot, 'docs', 'question-authoring.md'), 'utf8');

  assert.match(guide, /assets\/question-bank-source\/\*\.json/);
  assert.match(guide, /npm run questions:normalize/);
  assert.match(guide, /npm run questions:write/);
  assert.match(guide, /npm run qa:content/);
  assert.match(guide, /contentHash/);
  assert.match(guide, /visualScene/);
  assert.match(guide, /assets\/question-chunks\/\*\*\/\*\.js/);
});

test('ui smoke covers subtopic selection telemetry', () => {
  const smoke = fs.readFileSync(path.join(repoRoot, 'tests', 'ui-smoke.spec.js'), 'utf8');

  assert.match(smoke, /capitalization pilot subtopic can use question selection API/);
  assert.match(smoke, /pilot subtopic should record normalized API telemetry/);
  assert.match(smoke, /pilot subtopic fallback should record normalized fallback telemetry/);
  assert.match(smoke, /api_unavailable/);
});

test('production pages load learner state repository before progress store', () => {
  const offenders = findHtmlFiles(repoRoot).filter(file => {
    const html = fs.readFileSync(file, 'utf8');
    const progressIndex = html.indexOf('assets/progress-store.js');
    if (progressIndex < 0) return false;
    const repositoryIndex = html.indexOf('assets/learner-state-repository.js');
    return repositoryIndex < 0 || repositoryIndex > progressIndex;
  }).map(file => path.relative(repoRoot, file).split(path.sep).join('/'));

  assert.deepEqual(offenders, []);
});

test('production pages load lesson progress domain before learner state repository', () => {
  const offenders = findHtmlFiles(repoRoot).filter(file => {
    const html = fs.readFileSync(file, 'utf8');
    const repositoryIndex = html.indexOf('assets/learner-state-repository.js');
    if (repositoryIndex < 0) return false;
    const lessonProgressIndex = html.indexOf('assets/lesson-progress-domain.js');
    return lessonProgressIndex < 0 || lessonProgressIndex > repositoryIndex;
  }).map(file => path.relative(repoRoot, file).split(path.sep).join('/'));

  assert.deepEqual(offenders, []);
});

test('role and permission domain model is documented', () => {
  const accessControl = fs.readFileSync(path.join(repoRoot, 'assets', 'access-control.js'), 'utf8');
  const roleDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'roles-and-permissions.md'), 'utf8');

  assert.match(accessControl, /PARENT_GUARDIAN/);
  assert.match(accessControl, /SYSTEM_ADMIN/);
  assert.match(accessControl, /canAccess/);
  assert.match(roleDocs, /Parent\/guardian is not a system admin/);
  assert.match(roleDocs, /deny by default/);
});

test('guardian access boundary has relationship fixtures and contracts', () => {
  const guardianTest = fs.readFileSync(path.join(repoRoot, 'tests', 'guardian-access.test.js'), 'utf8');
  const fixture = fs.readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'access-control', 'guardian-links.json'), 'utf8');
  const roleDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'roles-and-permissions.md'), 'utf8');

  assert.match(guardianTest, /canOpenParentPreview/);
  assert.match(guardianTest, /canViewLearnerProgress/);
  assert.match(fixture, /"guardianId"/);
  assert.match(roleDocs, /Parent preview/);
  assert.match(roleDocs, /authenticated guardian/);
});

test('system admin audit boundary has contracts and docs', () => {
  const adminTest = fs.readFileSync(path.join(repoRoot, 'tests', 'system-admin-access.test.js'), 'utf8');
  const adminOpsTest = fs.readFileSync(path.join(repoRoot, 'tests', 'admin-operations-domain.test.js'), 'utf8');
  const pkg = readJson('package.json');
  const auditTest = fs.readFileSync(path.join(repoRoot, 'tests', 'audit-log-domain.test.js'), 'utf8');
  const auditDomain = fs.readFileSync(path.join(repoRoot, 'assets', 'audit-log-domain.js'), 'utf8');
  const adminDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'system-admin-role.md'), 'utf8');

  assert.match(adminTest, /manageSelectionRollout/);
  assert.match(adminTest, /viewAdminConsole/);
  assert.match(adminOpsTest, /buildAdminOperationsProjection/);
  assert.match(pkg.scripts['test:unit'], /tests\/admin-operations-domain\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/admin-operations-service\.test\.js/);
  assert.match(auditTest, /sanitizeAuditMetadata/);
  assert.match(auditDomain, /canUseSupportAccess/);
  assert.match(adminDocs, /Audit/);
  assert.match(adminDocs, /support access/i);
});

test('visual regression suite and design token contract exist', () => {
  const pkg = readJson('package.json');
  const styles = fs.readFileSync(path.join(repoRoot, 'assets', 'styles.css'), 'utf8');
  const visualTest = fs.readFileSync(path.join(repoRoot, 'tests', 'visual-regression.spec.js'), 'utf8');
  const visualDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'ui-regression.md'), 'utf8');
  const baselineDir = path.join(repoRoot, 'tests', 'visual-baselines');
  const baselines = fs.readdirSync(baselineDir).filter(file => file.endsWith('.json'));

  assert.match(pkg.scripts.test, /npm run test:visual/);
  assert.match(styles, /design-tokens\.css/);
  assert.match(visualTest, /toVisualSignature/);
  assert.match(visualTest, /writeVisualFailureArtifacts/);
  assert.match(visualTest, /writeScreenshotDriftArtifact/);
  assert.match(visualDocs, /baseline/i);
  assert.match(visualDocs, /semantic/i);
  assert.match(visualDocs, /runtime/i);
  assert.ok(baselines.length >= 8, 'expected reviewed visual baselines');
  baselines.forEach(file => {
    const baseline = readJson(path.join('tests', 'visual-baselines', file));
    assert.equal(typeof baseline.runtime.browserName, 'string', `${file} records browser name`);
    assert.equal(typeof baseline.runtime.browserVersion, 'string', `${file} records browser version`);
    assert.equal(typeof baseline.runtime.platform, 'string', `${file} records platform`);
    assert.deepEqual(baseline.runtime.viewport, baseline.viewport, `${file} records runtime viewport`);
    assert.equal(typeof baseline.runtime.deviceScaleFactor, 'number', `${file} records device scale factor`);
  });
});

test('package scripts expose fast browser and full regression gates', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.scripts['test:fast'], 'npm run qa:questions && npm run qa:app-shell && npm run qa:static-assets && npm run test:unit');
  assert.equal(pkg.scripts['test:browser'], 'npm run test:ui');
  assert.equal(pkg.scripts['test:browser:all'], 'npm run test:ui:all');
  assert.match(pkg.scripts['test:full'], /npm run test:fast/);
  assert.match(pkg.scripts['test:full'], /npm run qa:content/);
  assert.match(pkg.scripts['test:full'], /npm run test:browser/);
  assert.match(pkg.scripts['test:full'], /npm run test:browser:all/);
  assert.match(pkg.scripts['test:full'], /npm run test:a11y/);
  assert.match(pkg.scripts['test:full'], /npm run test:a11y:preferences/);
  assert.match(pkg.scripts['test:full'], /npm run test:visual/);
  assert.match(pkg.scripts['test:full'], /npm run test:perf/);
  assert.match(pkg.scripts['test:full'], /npm run test:offline/);
});

test('scheduled full regression workflow is reproducible and artifact-backed', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'full-regression.yml'), 'utf8');

  assert.match(workflow, /schedule:/);
  assert.match(workflow, /cron:\s*['"]0 10 \* \* \*['"]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /release\/\*\*/);
  assert.match(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*true/);
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /node-version:\s*24/);
  assert.match(workflow, /cache:\s*npm/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npx playwright install --with-deps chromium firefox webkit/);
  assert.match(workflow, /run:\s*npm run release:manifest/);
  assert.match(workflow, /run:\s*npm run test:full/);
  assert.match(workflow, /run:\s*npm run test:browser:cross/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /if:\s*failure\(\)/);
  assert.match(workflow, /playwright-report/);
  assert.match(workflow, /test-results/);
  assert.match(workflow, /test-results\/visual/);
  assert.match(workflow, /tests\/visual-baselines/);
  assert.doesNotMatch(workflow, /node-version:\s*20/);
  assert.doesNotMatch(workflow, /ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION/);
  assert.doesNotMatch(workflow, /actions\/checkout@v4/);
  assert.doesNotMatch(workflow, /actions\/setup-node@v4/);
  assert.doesNotMatch(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /actions\/upload-artifact@v5/);
});

test('all github workflows stay on the Node 24 actions runtime', () => {
  const workflows = findWorkflowFiles(path.join(repoRoot, '.github', 'workflows'));

  assert.ok(workflows.length > 0, 'expected at least one workflow file');
  workflows.forEach(file => {
    const workflow = fs.readFileSync(file, 'utf8');
    const name = path.relative(repoRoot, file).split(path.sep).join('/');

    assert.match(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*true/, `${name} opts into Node 24 action runtime`);
    assert.doesNotMatch(workflow, /node-version:\s*20/, `${name} must not run project tests on Node 20`);
    assert.doesNotMatch(workflow, /ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION/, `${name} must not opt out of secure action runtimes`);
    assert.doesNotMatch(workflow, /actions\/checkout@v4/, `${name} must not use checkout v4`);
    assert.doesNotMatch(workflow, /actions\/setup-node@v4/, `${name} must not use setup-node v4`);
  });
});

test('release checklist documents full gates and generated artifact freshness', () => {
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');

  assert.match(checklist, /npm run questions:write/);
  assert.match(checklist, /npm run qa:content/);
  assert.match(checklist, /npm run test:fast/);
  assert.match(checklist, /npm run test:browser/);
  assert.match(checklist, /npm run test:full/);
  assert.match(checklist, /npm run test:api:perf/);
  assert.match(checklist, /scheduled full regression/i);
  assert.match(checklist, /telemetry/i);
  assert.match(checklist, /fallback/i);
});

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
}

function findWorkflowFiles(workflowDir) {
  return fs.readdirSync(workflowDir)
    .filter(file => /\.ya?ml$/.test(file))
    .map(file => path.join(workflowDir, file));
}

function findHtmlFiles(root) {
  const files = [];
  walk(root, files);
  return files;
}

function walk(current, files) {
  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    const name = path.basename(current);
    if (name === 'node_modules' || name === '.git') return;
    fs.readdirSync(current).forEach(entry => walk(path.join(current, entry), files));
    return;
  }
  if (current.endsWith('.html')) files.push(current);
}
