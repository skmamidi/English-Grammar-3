#!/usr/bin/env node

function buildStandardsCoverageReport(options = {}) {
  const sources = Array.isArray(options.sources) ? options.sources : [];
  const byKey = new Map();
  const warnings = [];
  let questionCount = 0;
  sources.forEach(source => {
    Object.keys(source.sets || {}).forEach(setId => {
      const set = source.sets[setId] || {};
      (Array.isArray(set.questions) ? set.questions : []).forEach(question => {
        questionCount += 1;
        const metadata = question.metadata || {};
        const grades = Array.isArray(metadata.gradeLevels) ? metadata.gradeLevels : [''];
        const skills = normalizeList(metadata.skillIds || metadata.skills);
        const standards = normalizeList(metadata.standardIds || metadata.standards);
        const difficulty = String(metadata.primaryDifficulty || metadata.intrinsicDifficulty || '');
        const missing = [];
        if (!skills.length) missing.push('skillId');
        if (!standards.length) missing.push('standardId');
        if (!difficulty) missing.push('difficulty');
        if (missing.length) {
          warnings.push({
            ruleId: 'missing-standards-coverage-tags',
            domain: source.domain,
            setId,
            questionId: question && question.id || '',
            missing
          });
        }
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
                  warningCount: 0,
                  errorCount: 0
                });
              }
              const row = byKey.get(key);
              row.questionCount += 1;
              if (missing.length) row.warningCount += 1;
            });
          });
        });
      });
    });
  });
  const rows = Array.from(byKey.values()).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const gaps = buildCoverageGaps(rows, options.expectedCoverage);
  gaps.forEach(gap => warnings.push({
    ruleId: 'standards-coverage-gap',
    domain: gap.domain,
    grade: gap.grade,
    standardId: gap.standardId,
    questionCount: gap.questionCount,
    minQuestionCount: gap.minQuestionCount
  }));
  return {
    rows,
    gaps,
    warnings,
    summary: {
      questionCount,
      rowCount: rows.length,
      gapCount: gaps.length,
      warningCount: warnings.length,
      errorCount: 0
    }
  };
}

function buildCoverageGaps(rows, expectedCoverage) {
  return (Array.isArray(expectedCoverage) ? expectedCoverage : [])
    .map(expectation => {
      const questionCount = rows
        .filter(row => matchesExpectation(row, expectation))
        .reduce((sum, row) => sum + row.questionCount, 0);
      return {
        domain: String(expectation.domain || ''),
        grade: String(expectation.grade || ''),
        standardId: String(expectation.standardId || ''),
        skillId: String(expectation.skillId || ''),
        questionCount,
        minQuestionCount: Number(expectation.minQuestionCount) || 0
      };
    })
    .filter(gap => gap.questionCount < gap.minQuestionCount);
}

function matchesExpectation(row, expectation) {
  if (expectation.domain && row.domain !== expectation.domain) return false;
  if (expectation.grade && row.grade !== String(expectation.grade)) return false;
  if (expectation.standardId && row.standardId !== expectation.standardId) return false;
  if (expectation.skillId && row.skillId !== expectation.skillId) return false;
  return true;
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
