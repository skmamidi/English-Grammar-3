(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerDataRetentionPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_RETENTION_POLICY = Object.freeze({
    activeLearnerDays: 3650,
    inactiveLearnerDays: 730,
    auditLogDays: 2555,
    backupDays: 90,
    deletionTombstoneDays: 365
  });

  function evaluateLearnerDataRetention(input = {}, options = {}) {
    const policy = Object.assign({}, DEFAULT_RETENTION_POLICY, options.policy || {});
    const now = typeof options.now === 'function' ? options.now() : (options.now || new Date().toISOString());
    return {
      inactiveLearners: olderThan(input.learners, 'lastUpdatedAt', now, policy.inactiveLearnerDays),
      expiredBackups: olderThan(input.backups, 'exportedAt', now, policy.backupDays),
      expiredAuditEvents: olderThan(input.auditEvents, 'createdAt', now, policy.auditLogDays),
      expiredTombstones: olderThan(input.tombstones, 'deletedAt', now, policy.deletionTombstoneDays)
    };
  }

  function retentionCutoff(now, days) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - Math.max(0, Number(days) || 0));
    return date.toISOString();
  }

  function olderThan(values, field, now, days) {
    const cutoff = retentionCutoff(now, days);
    return (Array.isArray(values) ? values : []).filter(item => compareIso(item && item[field], cutoff) < 0);
  }

  function compareIso(left, right) {
    return (Date.parse(left || '') || 0) - (Date.parse(right || '') || 0);
  }

  return {
    DEFAULT_RETENTION_POLICY,
    evaluateLearnerDataRetention,
    retentionCutoff
  };
});
