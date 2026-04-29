# UI Regression

The visual regression suite captures stable browser signatures for representative Grammar Quest screens. Each baseline includes a screenshot hash, screenshot size, viewport, document title, key text hash, and important element bounds.

Run the suite:

```bash
npm run test:visual
```

Update baselines only after intentionally reviewing the visual change:

```bash
UPDATE_VISUAL_BASELINES=1 npm run test:visual
```

## Baseline Coverage

- Home page
- Capitalization and grammar topic indexes
- Representative subtopic start screen
- Quiz question, feedback, and results states
- Reports page
- Parent preview
- Offline unavailable state

## Stability Rules

- Keep animations and transitions disabled in the visual harness.
- Avoid adding clocks, random names, or network-dependent content to baseline surfaces.
- Treat baseline diffs as product review artifacts, not automatic approvals.
- Use `assets/design-tokens.css` for shared color, spacing, radius, focus, and feedback roles before adding one-off CSS values.
