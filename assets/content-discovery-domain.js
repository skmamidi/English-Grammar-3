(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestContentDiscoveryDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SUBTOPIC_ALIASES = Object.freeze({
    'vocabulary-base-words': 'base-words-prefix-suffix',
    'vocabulary-roots-word-origins': 'roots-word-origins'
  });

  function buildContentDiscoveryIndex(manifest) {
    const sets = normalizeSets(manifest && manifest.sets);
    return {
      schemaVersion: 1,
      sets,
      facets: {
        domains: uniqueSortedLower(sets.map(set => set.domain)),
        skills: uniqueSorted(sets.flatMap(set => set.skills.map(skill => skill.skillId))),
        standards: uniqueSorted(sets.flatMap(set => set.standards.map(standard => standard.standardId))),
        grades: uniqueSortedNumbers(sets.flatMap(set => set.coverage.gradesSupported)),
        difficulties: uniqueSortedLower(sets.flatMap(set => set.coverage.difficultiesSupported))
      }
    };
  }

  function searchContentDiscovery(manifestOrIndex, filters = {}) {
    const index = Array.isArray(manifestOrIndex && manifestOrIndex.sets) && manifestOrIndex.schemaVersion === 1 && manifestOrIndex.facets
      ? manifestOrIndex
      : buildContentDiscoveryIndex(manifestOrIndex);
    const normalizedFilters = normalizeFilters(filters);
    const queryTokens = tokenize(normalizedFilters.query);
    if (!queryTokens.length && !hasStructuredFilters(normalizedFilters)) return [];

    return index.sets
      .map(set => ({ set, score: scoreSet(set, queryTokens) }))
      .filter(entry => !queryTokens.length || entry.score > 0)
      .filter(entry => matchesFilters(entry.set, normalizedFilters))
      .sort((left, right) => right.score - left.score ||
        right.set.coverage.questionCount - left.set.coverage.questionCount ||
        left.set.title.localeCompare(right.set.title) ||
        left.set.setId.localeCompare(right.set.setId))
      .slice(0, normalizedFilters.limit)
      .map(entry => entry.set);
  }

  function resolveDiscoveryRoute(result) {
    const setId = safeString(result && (result.setId || result.id));
    const domain = safeString(result && result.domain);
    if (!setId || !domain) {
      return {
        topicPath: '',
        subtopicPath: '',
        unavailableReason: 'missing_set_or_domain'
      };
    }
    const slug = SUBTOPIC_ALIASES[setId] || stripDomainPrefix(setId, domain);
    return {
      topicPath: `topics/${domain}/index.html`,
      subtopicPath: slug ? `topics/${domain}/subtopics/${slug}.html` : '',
      unavailableReason: slug ? '' : 'missing_subtopic_slug'
    };
  }

  function normalizeSets(sets) {
    return (Array.isArray(sets) ? sets : []).map(normalizeSet).filter(set => set.setId);
  }

  function normalizeSet(set) {
    const input = set && typeof set === 'object' ? set : {};
    const skills = normalizeCoverage(input.skillCoverage, 'skillId');
    const standards = normalizeCoverage(input.standardCoverage, 'standardId');
    const result = {
      setId: safeString(input.id || input.setId),
      domain: safeString(input.domain),
      title: safeString(input.title || input.id || input.setId),
      topic: safeString(input.topic),
      skills,
      standards,
      coverage: {
        questionCount: Math.max(0, Math.round(Number(input.questionCount) || 0)),
        gradesSupported: uniqueSortedNumbers(input.gradesSupported),
        difficultiesSupported: uniqueSorted(input.difficultiesSupported)
      }
    };
    return Object.assign(result, resolveDiscoveryRoute(result), {
      searchText: buildSearchText(result)
    });
  }

  function normalizeCoverage(values, key) {
    return (Array.isArray(values) ? values : []).map(item => ({
      [key]: safeString(item && item[key]),
      questionCount: Math.max(0, Math.round(Number(item && item.questionCount) || 0))
    })).filter(item => item[key]);
  }

  function normalizeFilters(filters) {
    const input = filters && typeof filters === 'object' ? filters : {};
    return {
      query: safeString(input.query),
      domain: safeString(input.domain),
      setId: safeString(input.setId),
      skillId: safeString(input.skillId),
      standardId: safeString(input.standardId),
      grade: input.grade === undefined || input.grade === null || input.grade === '' ? null : Number(input.grade),
      difficulty: safeString(input.difficulty).toLowerCase(),
      limit: clampLimit(input.limit)
    };
  }

  function hasStructuredFilters(filters) {
    return !!(filters.domain || filters.setId || filters.skillId || filters.standardId || filters.grade || filters.difficulty);
  }

  function matchesFilters(set, filters) {
    if (filters.domain && set.domain !== filters.domain) return false;
    if (filters.setId && set.setId !== filters.setId) return false;
    if (filters.skillId && !set.skills.some(skill => skill.skillId === filters.skillId)) return false;
    if (filters.standardId && !set.standards.some(standard => standard.standardId === filters.standardId)) return false;
    if (filters.grade && !set.coverage.gradesSupported.includes(filters.grade)) return false;
    if (filters.difficulty && !set.coverage.difficultiesSupported.includes(filters.difficulty)) return false;
    return true;
  }

  function scoreSet(set, queryTokens) {
    if (!queryTokens.length) return 1;
    const text = set.searchText;
    let score = 0;
    for (const token of queryTokens) {
      if (!text.includes(token)) return 0;
      if (tokenize(set.title).includes(token)) score += 6;
      else if (tokenize(set.setId).includes(token)) score += 4;
      else if (tokenize(set.topic).includes(token)) score += 3;
      else score += 1;
    }
    return score;
  }

  function buildSearchText(set) {
    return tokenize([
      set.setId,
      set.domain,
      set.title,
      set.topic,
      set.skills.map(skill => skill.skillId).join(' '),
      set.standards.map(standard => standard.standardId).join(' ')
    ].join(' ')).join(' ');
  }

  function stripDomainPrefix(setId, domain) {
    const prefix = `${domain}-`;
    return setId.startsWith(prefix) ? setId.slice(prefix.length) : setId;
  }

  function tokenize(value) {
    return safeString(value)
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function clampLimit(value) {
    const number = Math.round(Number(value) || 25);
    return Math.min(100, Math.max(1, number));
  }

  function uniqueSorted(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
  }

  function uniqueSortedLower(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(value => safeString(value).toLowerCase()).filter(Boolean))).sort();
  }

  function uniqueSortedNumbers(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite))).sort((a, b) => a - b);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildContentDiscoveryIndex,
    resolveDiscoveryRoute,
    searchContentDiscovery
  };
});
