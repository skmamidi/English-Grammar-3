(function (root, factory) {
  'use strict';

  const discoveryDomain = root.GrammarQuestContentDiscoveryDomain ||
    (typeof require === 'function' ? require('./content-discovery-domain') : null);
  const assignmentDomain = root.GrammarQuestAssignmentDomain ||
    (typeof require === 'function' ? require('./assignment-domain') : null);
  const api = factory(discoveryDomain, assignmentDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestContentDiscoveryUI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (discoveryDomain, assignmentDomain) {
  'use strict';

  function selectDiscoveryResults(manifestOrIndex, filters = {}) {
    if (!discoveryDomain) return [];
    return discoveryDomain.searchContentDiscovery(manifestOrIndex, Object.assign({ limit: 12 }, filters));
  }

  function renderContentDiscovery(options = {}) {
    const manifest = options.manifest || {};
    const filters = normalizeFilters(options.filters);
    const actor = options.actor || {};
    const index = discoveryDomain.buildContentDiscoveryIndex(manifest);
    const results = selectDiscoveryResults(index, filters);
    const teacher = canPrefillAssignments(actor);

    return [
      '<section class="discovery-panel" aria-labelledby="discovery-title">',
      '  <div class="discovery-heading">',
      '    <div>',
      '      <div class="quest-kicker">Content Discovery</div>',
      '      <h1 id="discovery-title" class="page-title">Find Practice</h1>',
      '    </div>',
      `    <span class="discovery-count">${results.length} result${results.length === 1 ? '' : 's'}</span>`,
      '  </div>',
      renderSearchForm(index, filters),
      renderResults(results, { teacher }),
      '</section>'
    ].join('\n');
  }

  function createAssignmentPrefill(result = {}, options = {}) {
    const actor = options.actor || {};
    if (!canPrefillAssignments(actor)) throw new Error('assignment_prefill_requires_teacher');
    const now = typeof options.now === 'function' ? options.now() : new Date().toISOString();
    const assignment = {
      id: `assignment-${safeString(result.setId || result.id)}`,
      title: `${safeString(result.title || result.setId)} Practice`,
      assignedBy: {
        actorId: safeString(actor.id || actor.actorId),
        role: safeString(actor.role)
      },
      assignedTo: {
        learnerIds: [],
        classIds: []
      },
      scope: {
        domainIds: [safeString(result.domain)].filter(Boolean),
        setIds: [safeString(result.setId || result.id)].filter(Boolean),
        skillIds: [],
        standardIds: [],
        questionRefs: []
      },
      quizOptions: {
        count: 10,
        grade: '4',
        difficulty: 'medium',
        mode: 'assignment'
      },
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    return assignmentDomain && assignmentDomain.normalizeAssignment
      ? assignmentDomain.normalizeAssignment(assignment)
      : assignment;
  }

  function initContentDiscoveryPage(options = {}) {
    if (typeof document === 'undefined') return null;
    const root = document.querySelector(options.rootSelector || '#content-discovery-root');
    if (!root) return null;
    const manifest = options.manifest || window.QUESTION_MANIFEST || {};
    const actor = options.actor || readActor();

    function renderFromForm() {
      const params = new URLSearchParams(window.location.search);
      const form = document.querySelector('#content-discovery-form');
      if (form) {
        const data = new FormData(form);
        ['query', 'domain', 'grade', 'difficulty', 'skillId', 'standardId'].forEach(key => {
          const value = String(data.get(key) || '').trim();
          if (value) params.set(key, value);
          else params.delete(key);
        });
        const next = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', params.toString() ? next : window.location.pathname);
      }
      const filters = Object.fromEntries(params.entries());
      root.innerHTML = renderContentDiscovery({ manifest, filters, actor });
      bindActions(root, manifest, actor);
    }

    root.innerHTML = renderContentDiscovery({
      manifest,
      filters: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
      actor
    });
    bindActions(root, manifest, actor);
    root.addEventListener('submit', event => {
      if (event.target && event.target.id === 'content-discovery-form') {
        event.preventDefault();
        renderFromForm();
      }
    });
    root.addEventListener('change', event => {
      if (event.target && event.target.closest('#content-discovery-form')) renderFromForm();
    });
    return { render: renderFromForm };
  }

  function renderSearchForm(index, filters) {
    return [
      '<form id="content-discovery-form" class="discovery-filters" role="search" aria-label="Search content">',
      `  <label for="content-search">Search<input id="content-search" name="query" type="search" value="${escapeHtml(filters.query)}" placeholder="Skill, topic, or standard"></label>`,
      `  <label for="content-domain">Domain<select id="content-domain" name="domain">${option('', 'All domains', filters.domain)}${index.facets.domains.map(value => option(value, titleCase(value), filters.domain)).join('')}</select></label>`,
      `  <label for="content-grade">Grade<select id="content-grade" name="grade">${option('', 'Any grade', filters.grade)}${index.facets.grades.map(value => option(String(value), `Grade ${value}`, filters.grade)).join('')}</select></label>`,
      `  <label for="content-difficulty">Difficulty<select id="content-difficulty" name="difficulty">${option('', 'Any difficulty', filters.difficulty)}${index.facets.difficulties.map(value => option(value, titleCase(value), filters.difficulty)).join('')}</select></label>`,
      '  <button type="submit" class="btn">Search</button>',
      '</form>'
    ].join('\n');
  }

  function renderResults(results, options = {}) {
    if (!results.length) {
      return '<div class="discovery-empty" role="status">No matching practice found.</div>';
    }
    return [
      '<ol class="discovery-results" aria-label="Practice results">',
      results.map(result => renderResult(result, options)).join('\n'),
      '</ol>'
    ].join('\n');
  }

  function renderResult(result, options = {}) {
    const route = discoveryDomain.resolveDiscoveryRoute(result);
    const tags = [
      titleCase(result.domain),
      `${result.coverage.questionCount} questions`,
      result.coverage.gradesSupported.length ? `Grades ${result.coverage.gradesSupported.join(', ')}` : '',
      result.coverage.difficultiesSupported.join(', ')
    ].filter(Boolean);
    return [
      '<li class="discovery-result">',
      `  <h2>${escapeHtml(result.title)}</h2>`,
      `  <p>${escapeHtml(result.topic || result.setId)}</p>`,
      `  <div class="discovery-meta">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`,
      '  <div class="discovery-actions">',
      `    <a class="btn" href="${escapeHtml(route.practicePath || route.subtopicPath)}">Start practice</a>`,
      `    <button type="button" class="btn secondary" data-copy-route="${escapeHtml(route.subtopicPath)}">Copy route</button>`,
      options.teacher ? `    <button type="button" class="btn secondary" data-assignment-prefill="${escapeHtml(result.setId)}">Prefill assignment</button>` : '',
      '  </div>',
      '</li>'
    ].filter(Boolean).join('\n');
  }

  function bindActions(root, manifest, actor) {
    root.querySelectorAll('[data-copy-route]').forEach(button => {
      button.addEventListener('click', () => {
        const route = button.getAttribute('data-copy-route') || '';
        const absolute = new URL(route, window.location.href).toString();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(absolute).catch(() => {});
        button.textContent = 'Route copied';
      });
    });
    root.querySelectorAll('[data-assignment-prefill]').forEach(button => {
      button.addEventListener('click', () => {
        const result = selectDiscoveryResults(manifest, { setId: button.getAttribute('data-assignment-prefill'), limit: 1 })[0];
        const assignment = createAssignmentPrefill(result, { actor });
        window.localStorage.setItem('grammarQuestAssignmentPrefill', JSON.stringify(assignment));
        window.location.href = 'assignments.html?prefill=1';
      });
    });
  }

  function normalizeFilters(filters = {}) {
    return {
      query: safeString(filters.query),
      domain: safeString(filters.domain),
      grade: safeString(filters.grade),
      difficulty: safeString(filters.difficulty).toLowerCase(),
      skillId: safeString(filters.skillId),
      standardId: safeString(filters.standardId),
      limit: Math.max(1, Number(filters.limit) || 12)
    };
  }

  function canPrefillAssignments(actor = {}) {
    return safeString(actor.role) === 'teacher' || safeString(actor.role) === 'system_admin';
  }

  function readActor() {
    try {
      const raw = JSON.parse(window.localStorage.getItem('grammarQuestSession') || '{}');
      return {
        id: raw.user && (raw.user.uid || raw.user.id) || raw.actorId || '',
        role: raw.role || ''
      };
    } catch (_) {
      return { id: '', role: '' };
    }
  }

  function option(value, label, selected) {
    return `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  }

  function titleCase(value) {
    return safeString(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function escapeHtml(value) {
    return safeString(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  return {
    createAssignmentPrefill,
    initContentDiscoveryPage,
    renderContentDiscovery,
    selectDiscoveryResults
  };
});
