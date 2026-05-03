(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestDeprecationInventory = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const fs = typeof require === 'function' ? require('node:fs') : null;
  const path = typeof require === 'function' ? require('node:path') : null;

  const REQUIRED_DEPRECATION_TYPES = Object.freeze([
    'legacy_global',
    'unmigrated_route_script',
    'compatibility_alias',
    'orphaned_fixture',
    'duplicate_helper',
    'dead_code_candidate'
  ]);

  const VALID_STATUSES = Object.freeze([
    'active_compatibility',
    'fixture_only',
    'dead_code_candidate'
  ]);

  const VALID_RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);

  const DEPRECATION_INVENTORY = Object.freeze([
    item({
      id: 'dep-quiz-set-id-global',
      type: 'legacy_global',
      status: 'active_compatibility',
      symbol: 'QUIZ_SET_ID',
      owner: 'frontend-platform',
      reasonRetained: 'Subtopic quiz HTML routes still declare the selected set through a tiny inline global during page-shell migration.',
      introducedByPr: 'PR-119',
      replacement: 'Route-owned page-shell configuration passed through data attributes or generated route metadata.',
      removalCriteria: 'Remove after every subtopic route initializes quiz selection from page-shell route metadata with UI and offline smoke coverage.',
      reviewDate: '2026-07-31',
      riskLevel: 'medium',
      tests: ['tests/page-shell.test.js', 'tests/module-boundary-audit.test.js']
    }),
    item({
      id: 'dep-quiz-engine-route-script',
      type: 'unmigrated_route_script',
      status: 'active_compatibility',
      path: 'assets/quiz-engine.js',
      owner: 'frontend-platform',
      reasonRetained: 'Quiz routes still load the legacy route script while shared page-shell migration proceeds incrementally.',
      introducedByPr: 'PR-103',
      replacement: 'Shared page-shell quiz entry module with explicit route composition ownership.',
      removalCriteria: 'Remove when quiz routes use a shared shell entry and no production HTML route references assets/quiz-engine.js.',
      reviewDate: '2026-07-31',
      riskLevel: 'high',
      tests: ['tests/page-shell.test.js', 'tests/ui-smoke-runner-contract.test.js']
    }),
    item({
      id: 'dep-feature-flag-legacy-aliases',
      type: 'compatibility_alias',
      status: 'active_compatibility',
      path: 'assets/feature-flag-domain.js',
      owner: 'platform',
      reasonRetained: 'Feature flag defaults still preserve older rollout names while policy-aware feature gates become the canonical surface.',
      introducedByPr: 'PR-132',
      replacement: 'Policy-aware feature definitions evaluated through evaluatePolicyAwareFeatureFlag.',
      removalCriteria: 'Remove old flag names after one release where policy-aware callers cover preloading, telemetry, experiments, native, and billing previews.',
      reviewDate: '2026-07-31',
      riskLevel: 'medium',
      tests: ['tests/feature-flag-domain.test.js', 'tests/policy-aware-feature-flags.test.js']
    }),
    item({
      id: 'dep-legacy-bank-conversion-fixture',
      type: 'orphaned_fixture',
      status: 'fixture_only',
      path: 'tests/fixtures/legacy-bank-conversion/expected-question-bank-source.json',
      owner: 'content-platform',
      reasonRetained: 'Legacy bank conversion history is retained only as fixture evidence that canonical JSON generation remains deterministic.',
      introducedByPr: 'PR-21',
      replacement: 'Canonical question JSON under assets/question-bank-source and generated chunks under assets/question-chunks.',
      removalCriteria: 'Remove after legacy conversion tests are replaced by source-schema provenance tests that no longer need historical fixture snapshots.',
      reviewDate: '2026-07-31',
      riskLevel: 'low',
      tests: ['tests/question-bank-json-source.test.js', 'tests/json-generation-pipeline.test.js']
    }),
    item({
      id: 'dep-bank-loader-legacy-source-option',
      type: 'duplicate_helper',
      status: 'fixture_only',
      path: 'scripts/qa/bank-loader.js',
      owner: 'content-platform',
      reasonRetained: 'The QA bank loader still contains legacy source-type handling for fixture-only conversion and migration tests.',
      introducedByPr: 'PR-21',
      replacement: 'JSON source loaders used by question-source schema, manifest, and chunk generation QA.',
      removalCriteria: 'Remove legacy source-type branches after no tests or scripts request legacy, javascript, or js source modes.',
      reviewDate: '2026-07-31',
      riskLevel: 'medium',
      tests: ['tests/question-bank-json-source.test.js', 'tests/question-authoring-tools.test.js']
    }),
    item({
      id: 'dep-questions-master-backup',
      type: 'dead_code_candidate',
      status: 'dead_code_candidate',
      path: 'assets/questions_master.js.backup',
      owner: 'content-platform',
      reasonRetained: 'The backup file is a historical migration leftover and is not part of the production runtime path.',
      introducedByPr: 'PR-22',
      replacement: 'Canonical JSON source banks and generated manifest/chunk artifacts.',
      removalCriteria: 'Delete after content owners confirm no fixture, authoring, or rollback process references the backup file.',
      reviewDate: '2026-07-31',
      riskLevel: 'low',
      tests: ['tests/deprecated-bank-retirement.test.js', 'tests/module-boundary-audit.test.js']
    })
  ]);

  function item(input) {
    return Object.freeze(Object.assign({}, input));
  }

  function validateDeprecationInventory(items, options = {}) {
    const root = options.root || '';
    const now = options.now instanceof Date ? options.now : new Date();
    const errors = [];
    const seen = new Set();

    (items || []).forEach(row => {
      const id = safeString(row.id);
      if (!id) errors.push('id is required');
      if (seen.has(id)) errors.push(`${id} id must be unique`);
      seen.add(id);

      requireField(errors, id, row.type, 'type');
      requireField(errors, id, row.owner, 'owner');
      requireField(errors, id, row.reasonRetained, 'reason retained');
      requireField(errors, id, row.introducedByPr, 'introduced by PR');
      requireField(errors, id, row.replacement, 'replacement');
      requireField(errors, id, row.removalCriteria, 'removal criteria');
      requireField(errors, id, row.reviewDate, 'review date');

      if (!REQUIRED_DEPRECATION_TYPES.includes(row.type)) errors.push(`${id} type is invalid`);
      if (!VALID_STATUSES.includes(row.status)) errors.push(`${id} status is invalid`);
      if (!VALID_RISK_LEVELS.includes(row.riskLevel)) errors.push(`${id} risk level is invalid`);
      if (!/^PR-\d+$/.test(safeString(row.introducedByPr))) errors.push(`${id} introduced by PR must use PR-###`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(safeString(row.reviewDate))) errors.push(`${id} review date must be ISO yyyy-mm-dd`);
      if (row.reviewDate && new Date(`${row.reviewDate}T23:59:59Z`) < now) errors.push(`${id} review date is expired`);
      if (!row.path && !row.symbol) errors.push(`${id} path or symbol is required`);
      if (!Array.isArray(row.tests) || row.tests.length === 0) errors.push(`${id} tests are required`);

      if (fs && path && root && row.path && !fs.existsSync(path.join(root, row.path))) {
        errors.push(`${id} path does not exist: ${row.path}`);
      }
      if (fs && path && root && Array.isArray(row.tests)) {
        row.tests.forEach(testPath => {
          if (!fs.existsSync(path.join(root, testPath))) errors.push(`${id} test does not exist: ${testPath}`);
        });
      }
    });

    REQUIRED_DEPRECATION_TYPES.forEach(type => {
      if (!(items || []).some(row => row.type === type)) errors.push(`${type} inventory coverage is required`);
    });

    return { ok: errors.length === 0, errors };
  }

  function summarizeDeprecationInventory(items) {
    return (items || []).reduce((summary, item) => {
      summary.total += 1;
      summary.byType[item.type] = (summary.byType[item.type] || 0) + 1;
      summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + 1;
      summary.byRisk[item.riskLevel] = (summary.byRisk[item.riskLevel] || 0) + 1;
      return summary;
    }, { total: 0, byType: {}, byStatus: {}, byRisk: {} });
  }

  function requireField(errors, id, value, label) {
    if (!safeString(value)) errors.push(`${id} ${label} is required`);
  }

  function safeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  return {
    DEPRECATION_INVENTORY,
    REQUIRED_DEPRECATION_TYPES,
    summarizeDeprecationInventory,
    validateDeprecationInventory
  };
});
