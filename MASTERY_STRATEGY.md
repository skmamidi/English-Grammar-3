# 99.9 English Mastery Strategy

This app is being shaped into a standards-mapped mastery system for grades 3-6 English assessment readiness, including MAP Growth, state SOL-style tests, Common Core ELA, and NAEP-style reading expectations.

## Implementation Principles

1. Track mastery by evidence, not just quiz completion.
2. Preserve the existing practice flow while adding better metadata and reporting.
3. Prefer adaptive selection based on demonstrated skill gaps.
4. Expand content toward complex reading, revision, evidence, and vocabulary in context.
5. Treat grade level as the starting point; top-percentile practice must include above-grade challenge work.

## Question Metadata Target

Every new or revised item should include:

```js
metadata: {
  gradeLevels: [3, 4, 5, 6],
  difficultyByGrade: { "3": "hard", "4": "medium", "5": "easy", "6": "easy" },
  primaryDifficulty: "medium",
  ritBand: "200-210",
  standards: ["CCSS.L.4.1", "VA.English.4.RV"],
  mapGoalArea: "Language and Writing",
  naepProcess: "integrate-and-interpret",
  cognitiveDemand: "analyze-and-edit",
  languageDemand: "paragraph-context",
  itemFormat: "multiple-choice",
  passageId: "info-weather-003",
  skills: ["sentence combining", "conventions", "clarity"],
  trapTypes: ["too broad", "unsupported inference"],
  feedbackFocus: "prove the answer from the sentence or passage",
  estimatedTimeSeconds: 75,
  reviewPriority: "high"
}
```

## Content Expansion Order

1. Reading comprehension passages: literary, informational, paired passages, and visual-data passages.
2. Evidence questions: choose support, compare claims, infer from multiple details.
3. Writing and revision: paragraph order, transitions, concision, style, formal tone.
4. Vocabulary in context: morphology, academic vocabulary, figurative language, shades of meaning.
5. Mixed benchmark tests: timed, cross-domain, and above-grade challenge sets.

## Dashboard Signals

The app now records mastery in these groups:

- Domains
- Skills
- Cognitive demand
- Difficulty
- Standards

As item metadata becomes richer, the dashboard will automatically become more precise.

## Readiness Labels

- Collecting evidence: fewer than 30 mastery signals.
- Building readiness: adequate evidence but below strong accuracy.
- Strong readiness: high accuracy across enough signals.
- Elite trajectory: at least 120 signals and 93%+ aggregate accuracy.

These labels are directional practice signals, not official MAP, SOL, or state test predictions.
