const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'quiz-engine.js'), 'utf8');

test('mixed quiz question-count dropdown offers one through ten per selected subtopic', () => {
  assert.match(source, /const limitOptions = \['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'\]/);
  assert.match(source, /Questions per selected subtopic/);
  assert.doesNotMatch(source, /Math\.max\(4, number\)/);
});
