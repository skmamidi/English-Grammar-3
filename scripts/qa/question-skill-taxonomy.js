#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { repoRoot } = require('./bank-loader');
const { CHUNK_MIGRATION_ORDER } = require('../question-chunk-config');

const DEFAULT_TAXONOMY_PATH = path.join(repoRoot, 'assets', 'question-skill-taxonomy.json');
const SKILL_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const STANDARD_ID_PATTERN = /^[A-Z]{1,4}(?:\/[A-Z]{1,4})?(?:\.[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)*(?:-[A-Za-z0-9]+)?$/;
const PLACEHOLDER_PATTERN = /\b(todo|tbd|placeholder|unknown|fixme)\b/i;

function loadSkillTaxonomy(file = DEFAULT_TAXONOMY_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateSkillTaxonomy(taxonomy = loadSkillTaxonomy()) {
  const errors = [];
  const skillsById = new Map();
  const labelsByDomain = new Map();
  const standardIds = new Set(Array.isArray(taxonomy && taxonomy.standards) ? taxonomy.standards.map(String) : []);

  if (!taxonomy || typeof taxonomy !== 'object' || Array.isArray(taxonomy)) {
    return { errors: ['taxonomy must be a JSON object.'], skillsById, labelsByDomain, standardIds };
  }
  if (taxonomy.version !== 1) errors.push('taxonomy.version must be 1.');
  if (!Array.isArray(taxonomy.skills) || !taxonomy.skills.length) {
    errors.push('taxonomy.skills must be a non-empty array.');
  }

  (taxonomy.skills || []).forEach((skill, index) => {
    const label = `skill ${index + 1}`;
    if (!skill || typeof skill !== 'object' || Array.isArray(skill)) {
      errors.push(`${label}: skill must be an object.`);
      return;
    }
    if (!skill.id || typeof skill.id !== 'string' || !SKILL_ID_PATTERN.test(skill.id)) {
      errors.push(`${label}: id must be stable lowercase machine-readable text.`);
    } else if (skillsById.has(skill.id)) {
      errors.push(`${label}: duplicate skill id "${skill.id}".`);
    } else {
      skillsById.set(skill.id, skill);
    }
    if (!skill.label || typeof skill.label !== 'string' || !skill.label.trim()) {
      errors.push(`${label}: label is required.`);
    }
    if (!skill.domain || !CHUNK_MIGRATION_ORDER.includes(skill.domain)) {
      errors.push(`${label}: domain "${skill.domain}" is not a known question domain.`);
    }
    normalizeStrings(skill.standards).forEach(standard => standardIds.add(standard));
  });

  (taxonomy.skills || []).forEach(skill => {
    if (!skill || !skill.domain || !skill.id) return;
    const labels = [skill.label].concat(Array.isArray(skill.aliases) ? skill.aliases : []);
    labels.forEach(label => {
      const key = getDomainLabelKey(skill.domain, label);
      if (!labelsByDomain.has(key)) labelsByDomain.set(key, skill.id);
    });
  });

  standardIds.forEach(standard => {
    if (!STANDARD_ID_PATTERN.test(standard)) {
      errors.push(`standard "${standard}" is not a supported standards identifier.`);
    }
  });

  return { errors, skillsById, labelsByDomain, standardIds };
}

function buildQuestionSkillTags({ question, domain, taxonomy = loadSkillTaxonomy() }) {
  const index = validateSkillTaxonomy(taxonomy);
  const metadata = question && question.metadata || {};
  const explicitSkillIds = normalizeStrings(metadata.skillIds);
  const legacySkillIds = normalizeStrings(metadata.skills)
    .map(label => index.labelsByDomain.get(getDomainLabelKey(domain, label)))
    .filter(Boolean);
  const skillIds = uniqueSorted(explicitSkillIds.length ? explicitSkillIds : legacySkillIds);
  const explicitStandardIds = normalizeStrings(metadata.standardIds);
  const legacyStandardIds = normalizeStrings(metadata.standards);
  const skillStandardIds = skillIds.flatMap(skillId => {
    const skill = index.skillsById.get(skillId);
    return normalizeStrings(skill && skill.standards);
  });
  const standardIds = uniqueSorted(explicitStandardIds.length ? explicitStandardIds : legacyStandardIds.concat(skillStandardIds));

  return { skillIds, standardIds };
}

function validateQuestionSkillTags({ question, domain, setId, taxonomy = loadSkillTaxonomy() }) {
  const errors = [];
  const warnings = [];
  const index = validateSkillTaxonomy(taxonomy);
  const metadata = question && question.metadata || {};
  const label = `${setId || domain || 'question'} | ${question && question.id || 'question'}`;
  const skillIds = normalizeStrings(metadata.skillIds);
  const standardIds = normalizeStrings(metadata.standardIds);

  errors.push(...index.errors.map(error => `taxonomy: ${error}`));
  validateExplicitIds({
    ids: skillIds,
    kind: 'skillId',
    label,
    known: index.skillsById,
    errors,
    validateKnown(id) {
      const skill = index.skillsById.get(id);
      if (skill && skill.domain !== domain) {
        errors.push(`${label}: skillId "${id}" does not belong to domain "${domain}".`);
      }
    }
  });
  validateExplicitIds({
    ids: standardIds,
    kind: 'standardId',
    label,
    known: index.standardIds,
    errors
  });

  normalizeStrings(metadata.standards).forEach(id => {
    if (!index.standardIds.has(id)) {
      errors.push(`${label}: unknown standardId "${id}".`);
    }
  });

  const derived = buildQuestionSkillTags({ question, domain, taxonomy });
  if (skillIds.length && !derived.skillIds.length) {
    warnings.push(`${label}: no usable skillIds were resolved.`);
  }

  return { errors, warnings, tags: derived };
}

function validateExplicitIds({ ids, kind, label, known, errors, validateKnown }) {
  const seen = new Set();
  ids.forEach(id => {
    if (seen.has(id)) errors.push(`${label}: duplicate ${kind} "${id}".`);
    seen.add(id);
    if (PLACEHOLDER_PATTERN.test(id)) errors.push(`${label}: placeholder ${kind} "${id}".`);
    const isKnown = known instanceof Map ? known.has(id) : known.has(id);
    if (!isKnown) {
      errors.push(`${label}: unknown ${kind} "${id}".`);
      return;
    }
    if (typeof validateKnown === 'function') validateKnown(id);
  });
}

function enrichQuestionWithSkillTags(question, options) {
  const tags = buildQuestionSkillTags(Object.assign({}, options, { question }));
  const metadata = Object.assign({}, question && question.metadata || {}, tags);
  return Object.assign({}, question, { metadata });
}

function getDomainLabelKey(domain, label) {
  return `${String(domain || '').toLowerCase()}::${normalizeLabel(label)}`;
}

function normalizeLabel(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeStrings(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean);
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

module.exports = {
  DEFAULT_TAXONOMY_PATH,
  buildQuestionSkillTags,
  enrichQuestionWithSkillTags,
  loadSkillTaxonomy,
  validateQuestionSkillTags,
  validateSkillTaxonomy
};
