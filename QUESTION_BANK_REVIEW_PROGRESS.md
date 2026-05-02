# Question Bank Review Progress

Goal: review the bank one sub-topic at a time so each question has a useful strategy hint, specific study aid, and answer feedback that connects directly to the prompt and choices.

Workflow for each sub-topic:
1. Inspect every question in the sub-topic and group the question types.
2. Improve study aid content, strategy-hint source text, and correct/incorrect explanations.
3. Record QA checks that would have caught the issues.
4. Implement the QA checks before moving on.
5. Regenerate question artifacts and run validation.

## Progress

| Status | Sub-topic | Questions | Notes |
| --- | --- | ---: | --- |
| Complete | `punctuation-abbreviations-acronyms` | 185 | Replaced generic study aids; fixed routing for state abbreviations, title abbreviations, acronyms, semicolons, colons, parentheses, introductory commas, dialogue, speaker tags, hyphens, dashes, capitalization, pronoun choice, and sentence-combining prompts. Added QA checks for generic study aids and mismatched abbreviation explanations. |
| Complete | Cross-bank capitalization prompt-routing sweep | 72 updated | Fixed the reported family-title/direct-quote item, removed the split `mo ther` choice, repaired `family reunion`, and routed capitalization prompts to specific explanations for family titles, sentence starts, interrupted dialogue, language/course titles, capitalization concept questions, and comma-separated word-list questions. Added QA checks for split family-title choices and capitalization explanations that drift into dialogue, spelling, reference, or word-meaning rationales. |
| In progress | `punctuation-periods-abbreviations` | 24 | First inspection complete. Mixed content includes title abbreviations, state abbreviations, Latin abbreviations, D.C. punctuation, formal-language selection, "Correct as is," weekday/month abbreviations, and measurement abbreviations. Needs another focused pass before completion. |

## QA Ideas Log

### `punctuation-abbreviations-acronyms`
- Flag any question whose prompt asks about semicolons, colons, parentheses, introductory commas, dialogue, speaker tags, hyphens, or dashes but whose explanation says "standard abbreviation".
- Flag postal-state abbreviation feedback that calls a two-letter postal code an acronym or talks about periods instead of the state-code match.
- Flag study aids in this set when the definition is the broad generic punctuation definition instead of the specific rule for the prompt.
- Flag strategy/study clues that mention question marks or direct speech when the prompt is about abbreviations or postal codes.

Implemented:
- `generic-explanation-rationale` now catches abbreviation feedback on non-abbreviation prompts and acronym language on state-abbreviation prompts.
- `generic-study-aid` now rejects broad punctuation study aid content in the reviewed abbreviation/acronym sub-topic.

Validation:
- `npm run qa:content`: 0 errors, existing warning backlog unchanged.
- `npm run qa:questions`: passed.
- `node --test tests/content.test.js tests/question-bank-json-source.test.js tests/json-generation-pipeline.test.js`: 40/40 passing.

### `punctuation-periods-abbreviations`
- Flag generic abbreviation feedback such as "standard abbreviation form" when the accepted answer is a specific weekday, month, measurement, D.C. punctuation, or "Correct as is" case.
- Flag broad punctuation study aid in this set when the prompt is actually about formal language or place-name punctuation.
- Add prompt-specific handling for a.m./p.m., U.S., e.g., pp., D.C., weekday abbreviations, month abbreviations, and measurement abbreviations.

Status:
- In progress. Initial routing/study-aid fixes started, but not yet marked reviewed.

### Cross-bank capitalization prompt-routing sweep
- Flag answer choices in "Which words should be capitalized?" items when family-title words are accidentally split, such as `mo ther`.
- Flag capitalization explanations that talk about dialogue punctuation, quotation marks, spoken words, spelling, reference features, homophones, or word relationships instead of capitalization.
- Add separate explanation paths for true word-list capitalization questions, "first word should be capitalized" questions, always/not-always capitalization concept questions, language/course-title questions, and interrupted-dialogue capitalization questions.

Implemented:
- `split-capitalization-choice-word` rejects split family-title choices in capitalization word-list prompts.
- `generic-explanation-rationale` now rejects capitalization feedback that drifts into dialogue-punctuation, spelling, reference, homophone, or word-relationship language.
- Generator routing now uses capitalization-specific helpers before falling back to vocabulary, spelling, punctuation, or reference explanations.

Validation:
- `npm run qa:content`: 0 errors, existing 3586 warning backlog unchanged.
- `npm run qa:questions`: passed.
- `node --test tests/content.test.js tests/question-bank-json-source.test.js tests/json-generation-pipeline.test.js`: 41/41 passing.
