# Content QA Fixtures

Focused content QA fixtures are built in `tests/content.test.js` with small in-memory banks so each rule can set a fresh `contentHash` after applying the exact mutation under test.

Covered rules:

- `duplicate-prompt-in-set`
- `empty-choice`
- `duplicate-choice`
- `duplicate-correct-answer-text`
- `placeholder-text`
- `excessive-whitespace`
- `weak-explanation-rationale`
- `overlong-choice`
