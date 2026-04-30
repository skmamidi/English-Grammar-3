const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const recommendations = require('../assets/weak-skill-recommendation-domain');

const fixturesDir = path.join(__dirname, 'fixtures', 'recommendation-evaluation');

test('recommendation evaluation fixtures have deterministic top reason codes', () => {
  const files = fs.readdirSync(fixturesDir).filter(file => file.endsWith('.json')).sort();
  assert.deepEqual(files, [
    'assignment-struggle.json',
    'clear-weak-skill.json',
    'mixed-difficulty-exposure.json',
    'no-recommendation-needed.json',
    'overdue-review.json',
    'recent-recovery.json',
    'related-skill-misses.json',
    'sparse-history.json'
  ]);

  files.forEach(file => {
    const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
    const result = recommendations.generateWeakSkillRecommendations(fixture.input);
    const actualReasonCodes = result.recommendations.map(item => item.reasonCode);
    assert.deepEqual(actualReasonCodes.slice(0, fixture.expectedTopReasonCodes.length), fixture.expectedTopReasonCodes, file);
    assert.equal(JSON.stringify(result).includes('raw prompt'), false, file);
    assert.equal(JSON.stringify(result).includes('raw answer'), false, file);
  });
});
