# progress

2026-07-06 · golden pair via shadcn registry (base-nova), API preserved · migrated, full E2E green (1173 passed, 0 flaky).

## Changed

- `src/shared/ui/progress.tsx` — rewired to `@base-ui/react/progress`. Base UI anatomy is `Root > Track > Indicator` (Radix was `Root > Indicator`). Kept the simple `<Progress value className/>` external API: Root is a `w-full` container, and the consumer `className` is routed to the **Track** so height overrides (`h-2`) still style the bar. Dropped the manual `style={{ transform: translateX(...) }}` — Base UI's `Progress.Indicator` sets `width: ${percent}%` internally (verified in `node_modules/@base-ui/react/progress/indicator/ProgressIndicator.js`). Leftover scan clean.

## Left alone

- Did not expose the golden's extra `ProgressLabel`/`ProgressValue` parts — no consumer needs them (YAGNI).
- The `<ProgressStep>`/`<ProgressRow>`/`<ProgressItem>`/`<ProgressView>` in feature code are unrelated local components, not this wrapper.

## Behavior changes

None visible. Fill now comes from Base UI's built-in width instead of a translateX transform; the 4 consumers (`campaign-progress-card`, `review-progress` `h-2`, `bulk-generate/progress-step`, `auto-plan` `h-2`) render an identical thin bar.

## Verify by hand

Bulk-email campaign progress card, admin review-progress dashboard, document bulk-generate, and program auto-plan: the bar fills proportionally to the value (0→100%). (E2E does not assert fill width — this is the visual check; the width mechanism was verified in source.)
