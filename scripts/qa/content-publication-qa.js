#!/usr/bin/env node

function aggregatePublicationQa(options = {}) {
  const checks = Array.isArray(options.checks) ? options.checks : [];
  const results = checks.map(check => {
    const errors = Array.isArray(check.errors) ? check.errors : [];
    const warnings = Array.isArray(check.warnings) ? check.warnings : [];
    const blocking = errors.length > 0 || check.stale === true || check.blocking === true;
    return {
      id: String(check.id || 'check'),
      status: blocking ? 'failed' : 'passed',
      blocking,
      errorCount: errors.length + (check.stale === true ? 1 : 0),
      warningCount: warnings.length
    };
  });
  const blocking = results.filter(result => result.blocking);
  return {
    status: blocking.length ? 'failed' : 'passed',
    results,
    blocking
  };
}

if (require.main === module) {
  const result = aggregatePublicationQa({ checks: [] });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  aggregatePublicationQa
};
