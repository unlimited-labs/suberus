# accordion

2026-07-05 · golden pair via shadcn registry (radix-nova → base-nova), transformation kept our icons · migrated, full E2E green (1173 passed, 0 flaky).

## Changed

- `src/shared/ui/accordion.tsx` — pristine radix-nova wrapper (tabler icons instead of the registry `IconPlaceholder`). Rewired to `@base-ui/react/accordion`: `Content` → `Panel` (with inner `<div>`), types → `.Root.Props`/`.Item.Props`/`.Trigger.Props`/`.Panel.Props`. Adopted the golden's `disabled:` → `aria-disabled:` on the Trigger (Base UI uses aria-disabled). Kept our tabler `IconChevronDown/Up` and all classes. Leftover scan clean.
- `src/features/submissions/components/reviews-card.tsx:249` and `src/features/settings/components/submission/submission-types-tab.tsx:42` — `<Accordion type="single" collapsible>` → `<Accordion>`. Base UI is single-open by default (`multiple` defaults false) and single mode is always collapsible, so both props drop with no behavior change.

## Left alone

- Animation: the `data-open:animate-accordion-down` / `data-closed:animate-accordion-up` classes were already **non-functional** (no `accordion-down`/`accordion-up` keyframes or `--radix-accordion-content-height` in `src/styles.css`). Base UI `Accordion.Panel` unmounts closed panels (`keepMounted` false), so open/close is instant — same as the current Radix behavior. Kept the dead classes for minimal diff; did NOT adopt the golden's height-var animation (`h-(--accordion-panel-height)` + `data-starting/ending-style:h-0`) — that would be a behavior add, not a faithful migration.
- `submission-type-accordion.tsx` renders only `AccordionItem`/`Trigger`/`Content` (its Root lives in `submission-types-tab`); no root prop change needed.

## Behavior changes

None. `value`/`defaultValue`/`onValueChange` are untouched (both roots are uncontrolled), so the Base UI "always an array" caveat doesn't bite here.

## Verify by hand

Settings › Submission Types: expand/collapse a type card — only one open at a time, clicking the open one closes it. Submission detail › Reviews: expand a review row.
