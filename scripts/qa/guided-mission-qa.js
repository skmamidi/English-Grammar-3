#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const {
  validateGuidedMission
} = require('../../assets/guided-mission-domain');
const {
  generateGuidedMissionArtifacts,
  loadGuidedMissionSources
} = require('../generate-guided-missions');

const repoRoot = path.resolve(__dirname, '..', '..');

function runGuidedMissionQa(options = {}) {
  const root = options.root || repoRoot;
  const questionManifest = options.questionManifest || readJson(path.join(root, 'assets', 'question-manifest.json'));
  const storyLessonManifest = options.storyLessonManifest || readJson(path.join(root, 'assets', 'story-lesson-manifest.json'));
  const { missions } = Array.isArray(options.missions)
    ? { missions: options.missions }
    : loadGuidedMissionSources({ root });
  const expected = generateGuidedMissionArtifacts({ root, questionManifest });
  const coverage = validateGuidedMissionCatalogCoverage({
    missions,
    questionManifest,
    storyLessonManifest
  });
  const freshness = validateGuidedMissionFreshness({ root, expected });

  return {
    errors: coverage.errors.concat(freshness.errors),
    coverage: coverage.summary,
    freshness
  };
}

function validateGuidedMissionCatalogCoverage(options = {}) {
  const missions = Array.isArray(options.missions) ? options.missions : [];
  const questionManifest = options.questionManifest || { sets: [] };
  const storyLessonManifest = options.storyLessonManifest || { lessons: [] };
  const manifestSets = new Map((Array.isArray(questionManifest.sets) ? questionManifest.sets : [])
    .map(set => [safeString(set.id || set.setId), set]));
  const lessonSets = new Set((Array.isArray(storyLessonManifest.lessons) ? storyLessonManifest.lessons : [])
    .map(lesson => safeString(lesson.setId)).filter(Boolean));
  const knownSkillIds = new Set();
  const coveredDomains = new Set();
  const missionIds = new Set();
  const errors = [];

  (Array.isArray(questionManifest.sets) ? questionManifest.sets : []).forEach(set => {
    (Array.isArray(set.skillCoverage) ? set.skillCoverage : []).forEach(skill => {
      const skillId = safeString(skill && skill.skillId);
      if (skillId) knownSkillIds.add(skillId);
    });
  });

  missions.forEach(mission => {
    const missionId = safeString(mission && (mission.missionId || mission.id));
    if (missionIds.has(missionId)) {
      errors.push(issue('duplicate_guided_mission_id', `${missionId} is used by more than one mission source.`));
    }
    missionIds.add(missionId);
    const validationErrors = validateGuidedMission(mission, { manifest: questionManifest });
    if (validationErrors.length) {
      errors.push(issue('invalid_guided_mission_source', `${missionId || 'unknown mission'}: ${validationErrors.join(', ')}`));
    }
    const subtopicRefs = Array.isArray(mission && mission.subtopicRefs) ? mission.subtopicRefs : [];
    subtopicRefs.forEach(ref => {
      const setId = safeString(ref && ref.setId);
      const set = manifestSets.get(setId);
      if (set) coveredDomains.add(set.domain);
      if (setId && !lessonSets.has(setId)) {
        errors.push(issue('missing_guided_mission_lesson_ref', `${missionId} references ${setId}, but no story lesson summary exists.`));
      }
    });
    const skillRefs = Array.isArray(mission && mission.skillRefs) ? mission.skillRefs : [];
    skillRefs.forEach(ref => {
      const skillId = safeString(ref && ref.skillId);
      if (skillId && !knownSkillIds.has(skillId)) {
        errors.push(issue('unknown_guided_mission_skill_ref', `${missionId} references unknown skill ${skillId}.`));
      }
    });
  });

  if (missions.length < 2) errors.push(issue('guided_mission_catalog_too_small', 'At least two guided missions are required to prove cross-domain catalog behavior.'));
  if (coveredDomains.size < 2) errors.push(issue('guided_mission_catalog_domain_coverage_low', 'Guided mission catalog must cover at least two question domains in this PR.'));

  return {
    errors,
    summary: {
      missionCount: missions.length,
      coveredDomainCount: coveredDomains.size,
      coveredDomains: Array.from(coveredDomains).sort(),
      knownSkillCount: knownSkillIds.size
    }
  };
}

function validateGuidedMissionFreshness({ root = repoRoot, expected }) {
  const errors = [];
  (expected && expected.files || []).forEach(file => {
    const fullPath = path.join(root, file.relativePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(issue(freshnessCode(file.relativePath, 'missing'), `${file.relativePath} is missing.`));
      return;
    }
    const actual = fs.readFileSync(fullPath, 'utf8');
    if (actual !== file.contents) {
      errors.push(issue(freshnessCode(file.relativePath, 'stale'), `${file.relativePath} is stale. Run node scripts/generate-guided-missions.js --write.`));
    }
  });
  return { errors };
}

function freshnessCode(relativePath, prefix) {
  if (/guided-mission-catalog\.json$/.test(relativePath)) return `${prefix}_guided_mission_catalog_json`;
  if (/guided-mission-catalog\.js$/.test(relativePath)) return `${prefix}_guided_mission_catalog_script`;
  return `${prefix}_guided_mission_artifact`;
}

function issue(code, message) {
  return { code, message };
}

function safeString(value) {
  return String(value || '').trim();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (require.main === module) {
  const result = runGuidedMissionQa();
  if (result.errors.length) {
    result.errors.forEach(error => console.error(`ERROR: ${error.code}: ${error.message}`));
    process.exit(1);
  }
  console.log(`Guided mission QA passed: ${result.coverage.missionCount} missions, ${result.coverage.coveredDomainCount} domains.`);
}

module.exports = {
  runGuidedMissionQa,
  validateGuidedMissionCatalogCoverage,
  validateGuidedMissionFreshness
};
