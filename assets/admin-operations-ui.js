(function () {
  'use strict';

  const access = window.GrammarQuestAccessControl;
  const serviceApi = window.GrammarQuestAdminOperationsService;
  const service = serviceApi.createAdminOperationsService({
    releaseManifest: () => window.GrammarQuestReleaseManifest || {},
    featureFlags: () => window.GrammarQuestFeatureFlags || window.GRAMMAR_QUEST_FEATURE_FLAGS || {},
    selectionTelemetrySummary: () => window.GrammarQuestSelectionTelemetrySummary || { totalEvents: 0, groups: {} },
    cacheMetadata: () => getCacheMetadata(),
    artifactMetadata: () => getArtifactMetadata(),
    auditEvents: () => window.GrammarQuestAuditEvents || getLocalAuditEvents()
  });

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    const actor = await getActor();
    if (!access.canAccess(actor, access.Capabilities.viewAdminConsole, {
      type: access.ResourceTypes.ADMIN_CONSOLE,
      id: 'operations'
    })) {
      showDenied();
      return;
    }

    try {
      const projection = await service.getConsoleProjection({ actor });
      renderProjection(projection);
    } catch (error) {
      showDenied();
    }
  }

  async function getActor() {
    const auth = window.GrammarQuestAuth;
    const state = auth && typeof auth.ready === 'function'
      ? await auth.ready()
      : auth && typeof auth.getState === 'function'
        ? auth.getState()
        : {};
    if (state && state.signedIn && state.role) {
      return { id: state.user && state.user.uid || state.actorId || 'signed-in-user', role: state.role };
    }
    if (state && state.signedIn && !state.role) {
      return { id: state.user && state.user.uid || 'signed-in-user', role: '' };
    }
    return { id: 'local-admin', role: access.Roles.SYSTEM_ADMIN };
  }

  function showDenied() {
    setStatus('Denied');
    document.getElementById('admin-denied').classList.remove('hidden');
    document.getElementById('admin-console').classList.add('hidden');
  }

  function renderProjection(projection) {
    document.getElementById('admin-denied').classList.add('hidden');
    document.getElementById('admin-console').classList.remove('hidden');
    setStatus(projection.warnings.length ? `${projection.warnings.length} warning${projection.warnings.length === 1 ? '' : 's'}` : 'Healthy');
    renderKeyValues('admin-release-grid', Object.assign({}, projection.release, projection.artifacts));
    renderFlags(projection.featureFlags);
    renderSelectionHealth(projection.selectionHealth);
    renderKeyValues('admin-cache-grid', projection.cacheHealth);
    renderAudit(projection.auditSummary);
    renderWarnings(projection.warnings);
  }

  function renderFlags(flags) {
    const tbody = document.getElementById('admin-flags-table');
    const rows = Object.keys(flags).sort().map(key => {
      const item = flags[key];
      const value = Object.prototype.hasOwnProperty.call(item, 'enabled') ? item.enabled : item.value;
      return `<tr><th scope="row">${escapeHtml(formatLabel(key))}</th><td>${escapeHtml(formatValue(value))}</td></tr>`;
    });
    tbody.innerHTML = rows.join('') || '<tr><td colspan="2">No flags configured</td></tr>';
  }

  function renderSelectionHealth(summary) {
    const root = document.getElementById('admin-selection-grid');
    const groups = summary.groups || [];
    const items = [{ label: 'Total events', value: summary.totalEvents || 0 }];
    groups.slice(0, 6).forEach(group => {
      items.push({
        label: `${group.domain} ${group.mode}`,
        value: `API ${formatPercent(group.apiSuccessRate)} / fallback ${formatPercent(group.fallbackRate)}`
      });
    });
    root.innerHTML = items.map(renderMetric).join('');
  }

  function renderAudit(summary) {
    const tbody = document.getElementById('admin-audit-table');
    const rows = (summary.recentEvents || []).map(event => `
      <tr>
        <td>${escapeHtml(event.createdAt || 'Unknown')}</td>
        <td>${escapeHtml(event.action || 'Unknown')}</td>
        <td>${escapeHtml([event.resourceType, event.resourceId].filter(Boolean).join(' / ') || 'Operational')}</td>
        <td>${escapeHtml(event.metadata && event.metadata.reason || '')}</td>
      </tr>
    `);
    tbody.innerHTML = rows.join('') || '<tr><td colspan="4">No high-risk audit events</td></tr>';
  }

  function renderWarnings(warnings) {
    const root = document.getElementById('admin-warning-list');
    root.innerHTML = warnings.length
      ? warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')
      : '<li>No operational warnings</li>';
  }

  function renderKeyValues(id, values) {
    const root = document.getElementById(id);
    const entries = Object.keys(values || {}).filter(key => values[key] !== undefined && values[key] !== '');
    root.innerHTML = entries.length
      ? entries.map(key => renderMetric({ label: formatLabel(key), value: values[key] })).join('')
      : renderMetric({ label: 'Status', value: 'Unavailable' });
  }

  function renderMetric(item) {
    return `
      <div class="admin-metric">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(formatValue(item.value))}</strong>
      </div>
    `;
  }

  function getArtifactMetadata() {
    const manifest = window.QUESTION_MANIFEST || {};
    const sets = Array.isArray(manifest.sets) ? manifest.sets : [];
    return {
      questionManifestSourceHash: manifest.artifact && manifest.artifact.sourceHash || '',
      sourceSetCount: sets.length,
      chunkCount: sets.reduce((count, set) => count + (Array.isArray(set.chunks) ? set.chunks.length : 1), 0),
      totalQuestions: manifest.totalQuestions || 0
    };
  }

  function getCacheMetadata() {
    const release = window.GrammarQuestReleaseManifest || {};
    const activeVersion = window.GrammarQuestActiveCacheVersion || release.serviceWorkerCacheVersion || '';
    return {
      expectedVersion: release.serviceWorkerCacheVersion || '',
      activeVersion,
      controlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
      staleCaches: window.GrammarQuestStaleCaches || []
    };
  }

  function getLocalAuditEvents() {
    return [{
      id: 'local-audit',
      actorId: 'local-admin',
      actorRole: access.Roles.SYSTEM_ADMIN,
      action: access.Capabilities.viewAuditSummary,
      resourceType: access.ResourceTypes.AUDIT_LOG,
      resourceId: 'operations',
      createdAt: new Date(0).toISOString(),
      metadata: { reason: 'Local console load' }
    }];
  }

  function setStatus(value) {
    document.getElementById('admin-ops-status').textContent = value;
  }

  function formatLabel(value) {
    return String(value || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function formatValue(value) {
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value == null ? '' : value);
  }

  function formatPercent(value) {
    return `${Math.round((Number(value) || 0) * 100)}%`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
