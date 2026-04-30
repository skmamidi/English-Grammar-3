#!/usr/bin/env node

function buildStandardsCoverageReport(options = {}) {
  const sources = Array.isArray(options.sources) ? options.sources : [];
  const byKey = new Map();
  sources.forEach(source => {
    Object.keys(source.sets || {}).forEach(setId => {
      const set = source.sets[setId] || {};
      (Array.isArray(set.questions) ? set.questions : []).forEach(question => {
        const metadata = question.metadata || {};
        const grades = Array.isArray(metadata.gradeLevels) ? metadata.gradeLevels : [''];
        const skills = normalizeList(metadata.skillIds || metadata.skills);
        const standards = normalizeList(metadata.standardIds || metadata.standards);
        const difficulty = String(metadata.primaryDifficulty || metadata.intrinsicDifficulty || '');
        grades.forEach(grade => {
          (skills.length ? skills : ['']).forEach(skillId => {
            (standards.length ? standards : ['']).forEach(standardId => {
              const key = [source.domain, setId, grade, skillId, standardId, difficulty].join('|');
              if (!byKey.has(key)) {
                byKey.set(key, {
                  domain: source.domain,
                  setId,
                  grade: String(grade),
                  skillId,
                  standardId,
                  difficulty,
                  questionCount: 0,
                  warningCount: 0
                });
              }
              byKey.get(key).questionCount += 1;
            });
          });
        });
      });
    });
  });
  return {
    rows: Array.from(byKey.values()).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  };
}

function normalizeList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))).sort();
}

if (require.main === module) {
  console.log(JSON.stringify(buildStandardsCoverageReport({ sources: [] }), null, 2));
}

module.exports = {
  buildStandardsCoverageReport
};
