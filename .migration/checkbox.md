# checkbox

2026-07-06 · transformation engine (customized wrapper) · migrated, full E2E green (1173 passed, 0 flaky) after locator fixes.

## Changed

- `src/shared/ui/checkbox.tsx` — customized wrapper (custom `border-muted-foreground/40`, `IconMinus` indeterminate icon), so classes/icons preserved and only primitives + state tokens rewired: `@base-ui/react/checkbox`, `data-[state=checked]`→`data-checked`, `data-[state=indeterminate]`→`data-indeterminate`, type `CheckboxPrimitive.Root.Props`. The indeterminate branch `props.checked === "indeterminate"` → `props.indeterminate` (Base UI has a separate `indeterminate` boolean; the Indicator renders when `checked || indeterminate`, verified in source). Leftover scan clean.
- `src/shared/ui/data-table/column-helpers.tsx:18` — select-all header: `checked={all || (some && "indeterminate")}` → `checked={getIsAllPageRowsSelected()}` + `indeterminate={getIsSomePageRowsSelected()}` (Base UI needs boolean `checked` + separate `indeterminate`).
- **E2E locators (6 files)** — Base UI checkbox renders a visible `<span role=checkbox>` + hidden `<input>` and routes the consumer `id` to the hidden input, so `getByLabel(...)` on `<Label htmlFor>`-associated checkboxes matches 2 elements (span via aria-labelledby + input via `<label for>`). Converted the affected checkbox locators to accessible `getByRole("checkbox", { name })`: `e2e/auth/fixtures.ts`, `e2e/auth/register.spec.ts`, `e2e/workflows/email-notifications.spec.ts`, `e2e/profile/fixtures.ts`, `e2e/settings/survey.spec.ts` (terms, visa, certificate, need-invoice, survey days, "Other" multi-select). Data-table checkboxes use `aria-label` and were unaffected.

## Left alone

- Data-table select-row/select-all use `aria-label` (label on the visible span) — no locator change needed.
- `getByLabel` on text inputs ("Email", "Dietary requirements", "Question label") and the SINGLE_SELECT "Other" combobox assertions — not checkboxes, untouched.
- `getByLabel` on switches ("Enable keywords", "Show in users list", etc.) — deferred to the switch migration (still Radix now).

## Behavior changes

**Hidden-input DOM delta** (see radio-group report): the a11y is correct (span labelled via aria-labelledby, input aria-hidden); only Playwright's `getByLabel` became ambiguous. Real users click the label → checkbox toggles. A targeted probe on the `aria-label` case (bulk select-row) passed while 29 `htmlFor`-pattern tests failed on the full run — probes on the safe pattern give false confidence.

## Verify by hand

Register (terms + survey visa/certificate/days), profile need-invoice, admin data-table select-all (partial = minus, all = check), survey multi-select "Other": all toggle and persist.
