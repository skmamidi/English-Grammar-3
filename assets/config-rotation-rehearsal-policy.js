(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestConfigRotationRehearsalPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_ROTATION_CONFIG_TYPES = Object.freeze([
    'public_signing_keys',
    'signer_reference',
    'allowed_origins',
    'telemetry_endpoint',
    'feature_flag_rollback',
    'provider_adapter_config',
    'stale_config_recovery'
  ]);
  const APPROVED_COMMAND_PREFIXES = Object.freeze(['npm run ', 'node --test ', 'node scripts/']);

  const CONFIG_ROTATION_REHEARSALS = Object.freeze([
    rehearsal('rotation-public-signing-keys', 'public_signing_keys', 'platform',
      'Confirm both current and next public key ids are present in browser verification metadata.',
      'Trust old and new public keys for response TTL plus rollout and cache propagation window.',
      'Restore previous public key metadata while both key ids remain active.',
      'node --test tests/question-selection-runtime-contract.test.js tests/question-selection-signing.test.js',
      'Health/readiness reports expired or missing active public key ids.',
      ['node --test tests/question-selection-runtime-contract.test.js']),
    rehearsal('rotation-signer-reference', 'signer_reference', 'platform',
      'Confirm production signer reference exists as metadata only and no private key value is present.',
      'Switch signer reference after public verification metadata trusts both old and new ids.',
      'Switch signer reference back to prior id and keep old public key active until responses expire.',
      'node --test tests/question-selection-runtime-contract.test.js tests/secret-scan.test.js',
      'Runtime readiness reports signer_unavailable or missing private key reference metadata.',
      ['node --test tests/question-selection-runtime-contract.test.js', 'npm run security:scan']),
    rehearsal('rotation-allowed-origins', 'allowed_origins', 'platform',
      'Confirm staging and production origin lists match environment parity expectations.',
      'Temporarily allow old and new origins during DNS or hosting transition.',
      'Revert allowed-origin config to the previous approved list.',
      'node --test tests/api-request-guard.test.js tests/environment-parity-policy.test.js',
      'API guard rejects the expected staging origin or accepts an unexpected origin.',
      ['node --test tests/api-request-guard.test.js tests/environment-parity-policy.test.js']),
    rehearsal('rotation-telemetry-endpoint', 'telemetry_endpoint', 'privacy',
      'Confirm telemetry remains disabled by default and endpoint changes are privacy-gated.',
      'Run old and new endpoints in shadow or disabled mode before enabling collection.',
      'Set telemetry flags back to disabled and restore previous endpoint metadata.',
      'node --test tests/app-telemetry-privacy.test.js tests/telemetry-privacy-contract.test.js',
      'Telemetry summary shows endpoint failure, unsafe payload rejection, or disabled transport mismatch.',
      ['node --test tests/app-telemetry-privacy.test.js tests/telemetry-privacy-contract.test.js']),
    rehearsal('rotation-feature-flag-rollback', 'feature_flag_rollback', 'platform',
      'Confirm risky flags fail closed and rollback levers are documented before change.',
      'Keep prior flag hash available until release manifest and staging smoke agree on the new hash.',
      'Restore prior feature flag config hash and run staging smoke dry-run.',
      'node --test tests/feature-flag-domain.test.js tests/policy-aware-feature-flags.test.js',
      'Release manifest feature flag hash differs from staging smoke snapshot.',
      ['node --test tests/feature-flag-domain.test.js tests/policy-aware-feature-flags.test.js', 'npm run qa:staging-smoke -- --dry-run']),
    rehearsal('rotation-provider-adapter-config', 'provider_adapter_config', 'backend-platform',
      'Confirm provider pilot is disabled by default and staging enablement uses synthetic health metadata.',
      'Enable provider adapter config in staging only while local fallback remains available.',
      'Unset provider pilot config and confirm provider_pilot_disabled readiness.',
      'node --test tests/provider-adapter-contract.test.js tests/module-boundary-audit.test.js',
      'Provider health metadata is unavailable, permission denied, stale schema, or malformed.',
      ['node --test tests/provider-adapter-contract.test.js tests/module-boundary-audit.test.js']),
    rehearsal('rotation-stale-config-recovery', 'stale_config_recovery', 'operations',
      'Confirm release, frontend, service-worker, and feature-flag metadata align before promotion.',
      'Keep previous release manifest and cache version available until staging smoke passes.',
      'Redeploy previous release manifest and service-worker cache version.',
      'node --test tests/staging-deployment-smoke-policy.test.js tests/release-manifest.test.js',
      'Staging smoke reports stale release manifest, service-worker cache, feature flag, or health metadata.',
      ['node --test tests/staging-deployment-smoke-policy.test.js tests/release-manifest.test.js'])
  ]);

  function rehearsal(id, configType, owner, precheck, overlapStrategy, rollback, verification, staleConfigDetection, commands) {
    return Object.freeze({
      id,
      configType,
      owner,
      precheck,
      overlapStrategy,
      rollback,
      verification,
      staleConfigDetection,
      evidenceSanitizer: 'sanitizeRotationEvidence',
      commands: Object.freeze(commands)
    });
  }

  function validateRotationRehearsals(rehearsals) {
    const errors = [];
    const seen = new Set();
    (rehearsals || []).forEach(item => {
      ['id', 'configType', 'owner', 'precheck', 'overlapStrategy', 'rollback', 'verification', 'staleConfigDetection', 'evidenceSanitizer'].forEach(field => {
        if (!safeString(item[field])) errors.push(`${item.id || 'rotation'} ${label(field)} is required`);
      });
      if (seen.has(item.id)) errors.push(`${item.id} id must be unique`);
      seen.add(item.id);
      if (!REQUIRED_ROTATION_CONFIG_TYPES.includes(item.configType)) errors.push(`${item.id} config type is invalid`);
      if (item.evidenceSanitizer !== 'sanitizeRotationEvidence') errors.push(`${item.id} evidence sanitizer must be sanitizeRotationEvidence`);
      if (!Array.isArray(item.commands) || item.commands.length === 0) errors.push(`${item.id} commands are required`);
      (item.commands || []).forEach(command => {
        if (!APPROVED_COMMAND_PREFIXES.some(prefix => command.startsWith(prefix))) errors.push(`${item.id} command must use an approved local command`);
      });
    });
    REQUIRED_ROTATION_CONFIG_TYPES.forEach(type => {
      if (!(rehearsals || []).some(item => item.configType === type)) errors.push(`missing required config rotation ${type}`);
    });
    return { ok: errors.length === 0, errors };
  }

  function sanitizeRotationEvidence(value) {
    if (Array.isArray(value)) return value.map(sanitizeRotationEvidence);
    if (!value || typeof value !== 'object') return typeof value === 'string' ? stripQuery(value) : value;
    return Object.keys(value).sort().reduce((safe, key) => {
      if (/(secret|token|password|privatekey|credential|learnerid|studentid|email|rawenv|raw)/i.test(key)) return safe;
      safe[key] = sanitizeRotationEvidence(value[key]);
      return safe;
    }, {});
  }

  function buildRotationRehearsalSummary(rehearsals) {
    return (rehearsals || []).reduce((summary, item) => {
      summary.total += 1;
      summary.byConfigType[item.configType] = (summary.byConfigType[item.configType] || 0) + 1;
      summary.byOwner[item.owner] = (summary.byOwner[item.owner] || 0) + 1;
      return summary;
    }, { total: 0, byConfigType: {}, byOwner: {} });
  }

  function label(field) {
    return field.replace(/[A-Z]/g, match => ` ${match.toLowerCase()}`);
  }

  function stripQuery(value) {
    return value.replace(/[?#].*$/, '');
  }

  function safeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  return {
    CONFIG_ROTATION_REHEARSALS,
    REQUIRED_ROTATION_CONFIG_TYPES,
    buildRotationRehearsalSummary,
    sanitizeRotationEvidence,
    validateRotationRehearsals
  };
});
