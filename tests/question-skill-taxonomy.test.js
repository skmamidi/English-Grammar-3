const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildQuestionSkillTags,
  loadSkillTaxonomy,
  validateSkillTaxonomy,
  validateQuestionSkillTags
} = require('../scripts/qa/question-skill-taxonomy');

test('question skill taxonomy is a valid controlled vocabulary', () => {
  const taxonomy = loadSkillTaxonomy();
  const result = validateSkillTaxonomy(taxonomy);

  assert.deepEqual(result.errors, []);
  assert.ok(result.skillsById.has('grammar.sentence-analysis'));
  assert.equal(result.skillsById.get('grammar.sentence-analysis').label, 'Sentence Analysis');
  assert.ok(result.standardIds.has('L.3-6.1'));
});

test('legacy metadata skills deterministically map to stable skill ids', () => {
  const taxonomy = loadSkillTaxonomy();
  const question = {
    metadata: {
      skills: ['sentence analysis', 'usage'],
      standards: ['L.3-6.1']
    }
  };

  assert.deepEqual(buildQuestionSkillTags({ question, domain: 'grammar', taxonomy }), {
    skillIds: ['grammar.sentence-analysis', 'grammar.usage'],
    standardIds: ['L.3-6.1']
  });
});

test('unknown explicit skill ids fail taxonomy validation', () => {
  const taxonomy = loadSkillTaxonomy();
  const question = {
    id: 'grammar-schema-fixture-q0001',
    metadata: {
      sourceSet: 'grammar-schema-fixture',
      skillIds: ['grammar.not-a-real-skill'],
      standardIds: ['L.3-6.1']
    }
  };

  const result = validateQuestionSkillTags({
    question,
    domain: 'grammar',
    setId: 'grammar-schema-fixture',
    taxonomy
  });

  assert.ok(result.errors.some(error => /unknown skillId "grammar\.not-a-real-skill"/.test(error)));
});

test('domain-incompatible explicit skill ids fail taxonomy validation', () => {
  const taxonomy = loadSkillTaxonomy();
  const question = {
    id: 'grammar-schema-fixture-q0001',
    metadata: {
      sourceSet: 'grammar-schema-fixture',
      skillIds: ['vocabulary.word-study']
    }
  };

  const result = validateQuestionSkillTags({
    question,
    domain: 'grammar',
    setId: 'grammar-schema-fixture',
    taxonomy
  });

  assert.ok(result.errors.some(error => /does not belong to domain "grammar"/.test(error)));
});
