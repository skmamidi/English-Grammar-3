#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeGuidedMission,
  normalizeMissionSummary
} = require('../assets/guided-mission-domain');

const repoRoot = path.resolve(__dirname, '..');
const DEFAULT_GUIDED_MISSION_SOURCE_DIR = path.join('assets', 'guided-mission-source');
const DEFAULT_GUIDED_MISSION_CATALOG_JSON = path.join('assets', 'guided-mission-catalog.json');
const DEFAULT_GUIDED_MISSION_CATALOG_JS = path.join('assets', 'guided-mission-catalog.js');
const GENERATOR_VERSION = 1;
const GENERATED_AT = '2030-05-04T00:00:00.000Z';

function loadGuidedMissionSources(options = {}) {
  const root = options.root || repoRoot;
  const sourceDir = path.join(root, options.sourceDir || DEFAULT_GUIDED_MISSION_SOURCE_DIR);
  const files = fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir).filter(file => file.endsWith('.json')).sort()
    : [];
  const missions = files.map(file => {
    const relativePath = path.posix.join(options.sourceDir || DEFAULT_GUIDED_MISSION_SOURCE_DIR, file);
    return Object.assign({}, readJson(path.join(root, relativePath)), { sourceFile: relativePath });
  });

  return {
    missions,
    sourceFiles: files.map(file => path.posix.join(options.sourceDir || DEFAULT_GUIDED_MISSION_SOURCE_DIR, file))
  };
}

function generateGuidedMissionArtifacts(options = {}) {
  const root = options.root || repoRoot;
  const questionManifest = options.questionManifest || readJson(path.join(root, 'assets', 'question-manifest.json'));
  const sourceLoad = loadGuidedMissionSources({ root, sourceDir: options.sourceDir });
  const missions = sourceLoad.missions
    .map(mission => normalizeGuidedMission(mission, { manifest: questionManifest }))
    .sort((left, right) => left.missionId.localeCompare(right.missionId));
  const summaries = sourceLoad.missions
    .map(mission => normalizeMissionSummary(mission, { manifest: questionManifest }))
    .sort((left, right) => left.missionId.localeCompare(right.missionId));
  const sourceHash = hashJson(sourceLoad.missions.map(stripSourceFile));
  const catalog = {
    schemaVersion: 1,
    artifact: {
      type: 'guided-mission-catalog',
      artifactSchemaVersion: 1,
      generatorVersion: GENERATOR_VERSION,
      sourceType: 'json',
      sourceHash,
      sourceFiles: sourceLoad.sourceFiles
    },
    generatedAt: GENERATED_AT,
    totalMissions: summaries.length,
    coverage: buildCoverageSummary({ missions, questionManifest }),
    missions: summaries
  };
  const files = [
    {
      relativePath: DEFAULT_GUIDED_MISSION_CATALOG_JSON,
      contents: `${JSON.stringify(catalog, null, 2)}\n`
    },
    {
      relativePath: DEFAULT_GUIDED_MISSION_CATALOG_JS,
      contents: buildGuidedMissionCatalogScript(catalog)
    }
  ];

  return { catalog, missions, files };
}

function buildCoverageSummary({ missions, questionManifest }) {
  const missionSetIds = new Set();
  const missionSkillIds = new Set();
  (Array.isArray(missions) ? missions : []).forEach(mission => {
    (mission.subtopicRefs || []).forEach(ref => {
      if (ref.setId) missionSetIds.add(ref.setId);
    });
    (mission.skillRefs || []).forEach(ref => {
      if (ref.skillId) missionSkillIds.add(ref.skillId);
    });
  });
  const manifestSets = Array.isArray(questionManifest && questionManifest.sets) ? questionManifest.sets : [];
  const coveredDomains = new Set();
  manifestSets.forEach(set => {
    if (missionSetIds.has(set.id)) coveredDomains.add(set.domain);
  });
  return {
    missionCount: missions.length,
    referencedSetCount: missionSetIds.size,
    referencedSkillCount: missionSkillIds.size,
    coveredDomainCount: coveredDomains.size,
    coveredDomains: Array.from(coveredDomains).sort()
  };
}

function buildGuidedMissionCatalogScript(catalog) {
  return `/**
 * English Language Quiz App - guided mission catalog.
 * Generated from canonical guided mission source.
 * Generator version: ${GENERATOR_VERSION}.
 */
(function () {
  'use strict';
  window.GUIDED_MISSION_CATALOG=${JSON.stringify(stripRuntimeCatalog(catalog))};
})();
`;
}

function writeGuidedMissionArtifacts(generated = generateGuidedMissionArtifacts(), options = {}) {
  const root = options.root || repoRoot;
  const written = [];
  generated.files.forEach(file => {
    const fullPath = path.join(root, file.relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.contents);
    written.push(file.relativePath);
  });
  return { written };
}

function stripRuntimeCatalog(catalog) {
  const input = catalog && typeof catalog === 'object' ? catalog : {};
  const artifact = Object.assign({}, input.artifact || {});
  delete artifact.sourceFiles;
  return Object.assign({}, input, { artifact });
}

function stripSourceFile(mission) {
  const clone = Object.assign({}, mission);
  delete clone.sourceFile;
  return clone;
}

function hashJson(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (require.main === module) {
  const shouldWrite = process.argv.includes('--write');
  const generated = generateGuidedMissionArtifacts();
  if (shouldWrite) {
    const result = writeGuidedMissionArtifacts(generated);
    console.log(`Wrote ${result.written.length} guided mission artifact(s).`);
  } else {
    console.log(`Generated ${generated.catalog.totalMissions} guided mission(s) in dry run.`);
  }
}

module.exports = {
  DEFAULT_GUIDED_MISSION_CATALOG_JS,
  DEFAULT_GUIDED_MISSION_CATALOG_JSON,
  DEFAULT_GUIDED_MISSION_SOURCE_DIR,
  buildGuidedMissionCatalogScript,
  generateGuidedMissionArtifacts,
  loadGuidedMissionSources,
  writeGuidedMissionArtifacts
};
