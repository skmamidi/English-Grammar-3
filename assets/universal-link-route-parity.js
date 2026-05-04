(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestUniversalLinkRouteParity = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ALLOWED_HOSTS = new Set(['grammarquest.app', 'www.grammarquest.app', 'localhost']);
  const SAFE_ID_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
  const SAFE_DOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
  const SAFE_GRADE_PATTERN = /^(3|4|5|6)$/;
  const SAFE_DIFFICULTY_PATTERN = /^(easy|medium|hard)$/;
  const DESTRUCTIVE_ACTIONS = new Set([
    'delete',
    'delete-account',
    'delete_account',
    'sign-out',
    'sign_out',
    'cancel-subscription',
    'cancel_subscription',
    'remove-learner',
    'remove_learner'
  ]);

  function buildRouteParityFixtures() {
    const routes = [
      route('/', destination('home', 'Home')),
      route('/index.html', destination('home', 'Home')),
      route('/topics/grammar/index.html', destination('topic_index', 'TopicIndex', { domain: 'grammar' })),
      route('/topics/grammar/subtopics/sentence-types.html', destination('subtopic_quiz', 'Quiz', { domain: 'grammar', subtopic: 'sentence-types' })),
      route('/assignments.html', destination('assignment', 'Assignments')),
      route('/assignments.html?assignmentId=assignment-1', destination('assignment', 'AssignmentDetail', { assignmentId: 'assignment-1' })),
      route('/reports.html', destination('reports', 'Reports')),
      route('/settings.html', destination('settings', 'Settings')),
      route('/account.html', destination('account', 'Account')),
      route('/subscription.html', destination('subscription', 'Subscription')),
      route('/support.html', destination('support', 'Support'))
    ];
    return {
      schemaVersion: 1,
      allowedHosts: Array.from(ALLOWED_HOSTS).sort(),
      routes
    };
  }

  function route(webPath, nativeDestination) {
    return {
      webPath,
      nativeDestination,
      destructiveAction: false
    };
  }

  function destination(type, screen, params = {}) {
    return { type, screen, params };
  }

  function mapWebRouteToNativeDestination(value) {
    const parsed = parseRoute(value);
    const pathname = parsed.pathname;
    const params = Object.fromEntries(parsed.searchParams.entries());

    if (pathname === '/' || pathname === '/index.html') return destination('home', 'Home');
    let match = pathname.match(/^\/topics\/([^/]+)\/index\.html$/);
    if (match) return destination('topic_index', 'TopicIndex', { domain: match[1] });
    match = pathname.match(/^\/topics\/([^/]+)\/subtopics\/([^/]+)\.html$/);
    if (match) {
      const routeParams = { domain: match[1], subtopic: match[2] };
      if (params.grade) routeParams.grade = params.grade;
      if (params.difficulty) routeParams.difficulty = params.difficulty;
      return destination('subtopic_quiz', 'Quiz', routeParams);
    }
    if (pathname === '/assignments.html') {
      return params.assignmentId
        ? destination('assignment', 'AssignmentDetail', { assignmentId: params.assignmentId })
        : destination('assignment', 'Assignments');
    }
    if (pathname === '/reports.html' || pathname === '/question-reports.html') return destination('reports', 'Reports');
    if (pathname === '/settings.html') return destination('settings', 'Settings');
    if (pathname === '/account.html') return destination('account', 'Account');
    if (pathname === '/subscription.html') return destination('subscription', 'Subscription');
    if (pathname === '/support.html' || pathname === '/help.html') return destination('support', 'Support');
    return destination('unsupported', '', {});
  }

  function validateRouteParityContract(contract) {
    const errors = [];
    const input = contract && typeof contract === 'object' ? contract : {};
    if (input.schemaVersion !== 1) errors.push('route_parity_schema_version_required');
    if (!Array.isArray(input.routes) || !input.routes.length) errors.push('route_parity_routes_required');
    (Array.isArray(input.routes) ? input.routes : []).forEach((routeItem, index) => {
      if (!String(routeItem && routeItem.webPath || '').startsWith('/')) errors.push(`route_${index}_web_path_must_be_absolute`);
      if (!routeItem || !routeItem.nativeDestination || !routeItem.nativeDestination.type) errors.push(`route_${index}_native_destination_required`);
      if (routeItem && routeItem.destructiveAction === true) errors.push(`route_${index}_destructive_action_forbidden`);
      validateRouteParams(routeItem && routeItem.nativeDestination || {}).forEach(error => errors.push(error));
    });
    return Array.from(new Set(errors));
  }

  function validateUniversalLink(link) {
    const errors = [];
    const parsed = parseUniversalLink(link);
    if (!parsed) return ['universal_link_invalid'];
    if (!ALLOWED_HOSTS.has(parsed.hostname)) errors.push('universal_link_host_not_allowed');
    const destination = mapWebRouteToNativeDestination(`${parsed.pathname}${parsed.search}`);
    if (destination.type === 'unsupported') errors.push('native_destination_not_supported');
    collectDestructiveActions(parsed.searchParams).forEach(() => errors.push('destructive_deep_link_action_forbidden'));
    validateRouteParams(destination).forEach(error => errors.push(error));
    return Array.from(new Set(errors));
  }

  function validateRouteParams(nativeDestination) {
    const errors = [];
    const params = nativeDestination && nativeDestination.params || {};
    if (params.domain && !SAFE_DOMAIN_PATTERN.test(params.domain)) errors.push('route_parameter_invalid:domain');
    if (params.subtopic && !SAFE_DOMAIN_PATTERN.test(params.subtopic)) errors.push('route_parameter_invalid:subtopic');
    if (params.assignmentId && !SAFE_ID_PATTERN.test(params.assignmentId)) errors.push('route_parameter_invalid:assignmentId');
    if (params.grade && !SAFE_GRADE_PATTERN.test(params.grade)) errors.push('route_parameter_invalid:grade');
    if (params.difficulty && !SAFE_DIFFICULTY_PATTERN.test(params.difficulty)) errors.push('route_parameter_invalid:difficulty');
    return errors;
  }

  function collectDestructiveActions(searchParams) {
    const actions = [];
    ['action', 'intent', 'operation'].forEach(key => {
      const value = String(searchParams.get(key) || '').trim().toLowerCase();
      if (DESTRUCTIVE_ACTIONS.has(value)) actions.push(value);
    });
    return actions;
  }

  function parseUniversalLink(link) {
    try {
      const parsed = new URL(String(link || ''));
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function parseRoute(value) {
    const raw = String(value || '/');
    const base = raw.startsWith('http') ? raw : `https://grammarquest.app${raw.startsWith('/') ? raw : `/${raw}`}`;
    return new URL(base);
  }

  return {
    buildRouteParityFixtures,
    mapWebRouteToNativeDestination,
    validateRouteParityContract,
    validateUniversalLink
  };
});
