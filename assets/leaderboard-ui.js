(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLeaderboardUi = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => api.renderLeaderboardRoute());
    } else {
      api.renderLeaderboardRoute();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const domain = root.GrammarQuestLeaderboardDomain ||
    (typeof require === 'function' ? require('./leaderboard-domain') : null);

  const PERIODS = Object.freeze([
    { id: 'weekly', label: 'Weekly', heading: 'Weekly leaderboard' },
    { id: 'monthly', label: 'Monthly', heading: 'Monthly leaderboard' },
    { id: 'allTime', label: 'All-time', heading: 'All-time leaderboard' }
  ]);

  function buildLeaderboardRouteViewModel(input = {}) {
    const period = normalizePeriod(input.period);
    const profile = normalizeProfile(Object.assign({}, input.profile || {}, {
      participantRef: input.participantRef || input.profile && input.profile.participantRef,
      participantId: input.participantId || input.profile && input.profile.participantId
    }));
    const personalXp = normalizePersonalXp(input.xpSummary);
    const online = input.online !== false;
    const tabs = PERIODS.map(tab => Object.assign({}, tab, { selected: tab.id === period }));

    if (!online) {
      return stateModel('offline', period, tabs, {
        personalXp,
        stateCopy: 'Leaderboard rankings are unavailable offline. Reconnect to refresh rankings; personal practice still works.'
      });
    }

    if (profile.optedIn !== true) {
      return stateModel('opted_out', period, tabs, {
        personalXp,
        stateCopy: 'Leaderboard participation is off. A linked guardian or assigned teacher can manage guardian-controlled opt-in while your personal XP remains visible.'
      });
    }

    const projection = readProjection(input.projections, period);
    if (!projection) {
      return stateModel('empty', period, tabs, {
        profile,
        personalXp,
        stateCopy: 'No materialized rankings are ready for this period yet.'
      });
    }

    const readModel = domain && typeof domain.buildLeaderboardReadModel === 'function'
      ? domain.buildLeaderboardReadModel(projection, {
        participantRef: profile.participantRef,
        limit: input.limit || 50
      })
      : fallbackReadModel(projection, profile);

    if (!readModel.topEntries.length) {
      return stateModel('empty', period, tabs, {
        profile,
        personalXp,
        stateCopy: 'No opted-in rankings are ready for this period yet.'
      });
    }

    return {
      schemaVersion: 1,
      state: 'ready',
      period,
      periodLabel: tabs.find(tab => tab.id === period).heading,
      periodTabs: tabs,
      generatedAt: safeString(readModel.generatedAt),
      topEntries: readModel.topEntries.map(sanitizeEntry),
      ownEntry: readModel.ownEntry ? sanitizeEntry(readModel.ownEntry) : null,
      personalXp,
      stateCopy: `${tabs.find(tab => tab.id === period).heading} from materialized XP projections.`
    };
  }

  function renderLeaderboard(model) {
    const view = model && typeof model === 'object' ? model : buildLeaderboardRouteViewModel();
    return `
      <section class="leaderboard-shell" aria-labelledby="leaderboard-title">
        <div class="leaderboard-state">
          <span class="quest-kicker">XP rankings</span>
          <h1 id="leaderboard-title">${escapeHtml(view.periodLabel || 'Leaderboard')}</h1>
          <p>${escapeHtml(view.stateCopy)}</p>
        </div>
        <div class="leaderboard-tabs" role="tablist" aria-label="Leaderboard periods">
          ${view.periodTabs.map(tab => `
            <button class="leaderboard-tab focus-ring" type="button" role="tab" data-min-target="44" data-focus-visible="true" data-leaderboard-period="${escapeHtml(tab.id)}" aria-selected="${tab.selected ? 'true' : 'false'}">${escapeHtml(tab.label)}</button>
          `).join('')}
        </div>
        ${renderStateBody(view)}
      </section>
    `;
  }

  function renderStateBody(view) {
    if (view.state === 'offline') return stateCard('Offline rankings', 'Reconnect to refresh leaderboard rankings. Quiz practice and personal XP summaries remain available.');
    if (view.state === 'opted_out') {
      return `
        <article class="leaderboard-privacy-card">
          <h2>Personal XP</h2>
          <p>Global ranks are hidden until guardian-controlled opt-in is enabled.</p>
          <div class="leaderboard-personal-xp"><strong>${escapeHtml(view.personalXp.totalXp)}</strong><span>Total XP</span></div>
          <a class="btn btn-secondary" href="guardian-dashboard.html">Review opt-in controls</a>
        </article>
      `;
    }
    if (view.state === 'empty') return stateCard('No rankings yet', 'This period has no opted-in rankings. Keep practicing; leaderboard display is never required.');
    return `
      ${renderOwnRank(view.ownEntry)}
      <div class="leaderboard-table-wrap">
        <table class="leaderboard-table" role="table" aria-label="${escapeHtml(view.periodLabel)} rankings">
          <caption>${escapeHtml(view.periodLabel)} rankings</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Alias</th>
              <th scope="col">XP</th>
            </tr>
          </thead>
          <tbody>
            ${view.topEntries.map(entry => `
              <tr${view.ownEntry && entry.participantRef === view.ownEntry.participantRef ? ' class="is-own-rank"' : ''}>
                <td>#${escapeHtml(entry.rank)}</td>
                <td>${escapeHtml(entry.displayAlias)}</td>
                <td>${escapeHtml(entry.score)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOwnRank(entry) {
    if (!entry) return '<article class="own-rank-card"><h2>Your rank</h2><p>Your opted-in rank will appear after this period materializes.</p></article>';
    return `
      <article class="own-rank-card" aria-label="Your rank">
        <h2>Your rank</h2>
        <strong>#${escapeHtml(entry.rank)}</strong>
        <span>${escapeHtml(entry.displayAlias)} · ${escapeHtml(entry.score)} XP</span>
      </article>
    `;
  }

  function stateCard(title, copy) {
    return `<article class="leaderboard-empty-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></article>`;
  }

  function renderLeaderboardRoute() {
    const rootElement = typeof document !== 'undefined' ? document.getElementById('leaderboard-root') : null;
    if (!rootElement) return;
    const state = loadRouteState();
    const render = () => {
      const period = getSelectedPeriod(rootElement) || getPeriodFromLocation();
      rootElement.innerHTML = renderLeaderboard(buildLeaderboardRouteViewModel(Object.assign({}, state, {
        period,
        online: typeof navigator === 'undefined' ? true : navigator.onLine !== false
      })));
      attachHandlers(rootElement);
    };
    render();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => {
        Object.assign(state, loadRouteState());
        render();
      });
    }
  }

  function attachHandlers(rootElement) {
    rootElement.querySelectorAll('[data-leaderboard-period]').forEach(button => {
      button.addEventListener('click', () => {
        rootElement.dataset.period = button.dataset.leaderboardPeriod;
        rootElement.innerHTML = renderLeaderboard(buildLeaderboardRouteViewModel(Object.assign(loadRouteState(), {
          period: button.dataset.leaderboardPeriod,
          online: typeof navigator === 'undefined' ? true : navigator.onLine !== false
        })));
        attachHandlers(rootElement);
      });
    });
  }

  function loadRouteState() {
    return {
      profile: readJson('grammarQuestLeaderboardProfile') || {},
      projections: readJson('grammarQuestLeaderboardProjections') || {},
      xpSummary: readProgressXpSummary()
    };
  }

  function readProgressXpSummary() {
    const progress = readJson('grammarQuestProgress') || {};
    const projection = progress.xp && progress.xp.projection || {};
    return {
      totalXp: projection.totalXp,
      weeklyXp: projection.currentWeeklyXp
    };
  }

  function readProjection(projections, period) {
    const source = projections && typeof projections === 'object' ? projections : {};
    return source[period] || null;
  }

  function fallbackReadModel(projection, profile) {
    const entries = (Array.isArray(projection && projection.entries) ? projection.entries : []).map(sanitizeEntry);
    return {
      generatedAt: safeString(projection && projection.generatedAt),
      topEntries: entries,
      ownEntry: entries.find(entry => entry.participantRef === profile.participantRef) || null
    };
  }

  function stateModel(state, period, periodTabs, overrides) {
    return Object.assign({
      schemaVersion: 1,
      state,
      period,
      periodLabel: periodTabs.find(tab => tab.id === period).heading,
      periodTabs,
      topEntries: [],
      ownEntry: null,
      personalXp: { totalXp: 0, weeklyXp: 0 },
      stateCopy: ''
    }, overrides || {});
  }

  function normalizeProfile(profile) {
    const input = profile && typeof profile === 'object' ? profile : {};
    return {
      optedIn: input.optedIn === true,
      participantRef: normalizeParticipantRef(input.participantRef || input.participantId),
      displayAlias: safeString(input.displayAlias || input.alias)
    };
  }

  function normalizeParticipantRef(value) {
    const ref = safeString(value);
    if (!ref) return '';
    if (/^leaderboardParticipants\/[A-Za-z0-9_-]+$/.test(ref)) return ref;
    if (/^[A-Za-z0-9_-]+$/.test(ref)) return `leaderboardParticipants/${ref}`;
    return '';
  }

  function sanitizeEntry(entry) {
    const input = entry && typeof entry === 'object' ? entry : {};
    return {
      rank: Math.max(1, Math.round(Number(input.rank) || 1)),
      participantRef: normalizeParticipantRef(input.participantRef),
      displayAlias: safeString(input.displayAlias || input.alias || 'Opted-in learner'),
      score: Math.max(0, Math.round(Number(input.score || input.xp) || 0))
    };
  }

  function normalizePersonalXp(summary) {
    const input = summary && typeof summary === 'object' ? summary : {};
    return {
      totalXp: Math.max(0, Math.round(Number(input.totalXp) || 0)),
      weeklyXp: Math.max(0, Math.round(Number(input.weeklyXp) || 0))
    };
  }

  function normalizePeriod(value) {
    const period = safeString(value);
    return PERIODS.some(tab => tab.id === period) ? period : 'weekly';
  }

  function getSelectedPeriod(rootElement) {
    return rootElement && rootElement.dataset ? rootElement.dataset.period : '';
  }

  function getPeriodFromLocation() {
    if (typeof window === 'undefined' || !window.location) return 'weekly';
    return normalizePeriod(new URLSearchParams(window.location.search).get('period'));
  }

  function readJson(key) {
    try {
      return JSON.parse(root.localStorage && root.localStorage.getItem(key) || 'null');
    } catch (error) {
      return null;
    }
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  return {
    PERIODS,
    buildLeaderboardRouteViewModel,
    renderLeaderboard,
    renderLeaderboardRoute
  };
});
