# radio-group

2026-07-05 · transformation engine (customized wrapper) · migrated, full E2E green (1172 passed, 1 flaky).

## Changed

- `src/shared/ui/radio-group.tsx` — wrapper is **customized** (outline circle + primary SVG dot, not the golden's filled-primary style), so primitives were rewired while our classes/SVG were preserved verbatim. `RadioGroupPrimitive.Root` → `RadioGroupPrimitive` (from `@base-ui/react/radio-group`, the component is the root, no `.Root`); items `RadioGroupPrimitive.Item`/`.Indicator` → `RadioPrimitive.Root`/`.Indicator` (from `@base-ui/react/radio`). Types → `RadioGroupPrimitive.Props` / `RadioPrimitive.Root.Props`. Leftover scan clean.
- `e2e/admin/fixtures.ts:378` (`getTimeFormatRadio`) — `page.locator('#time-${value}')` → `page.getByRole("radio", { name: value })`.
- `e2e/submissions/settings-integration.spec.ts:332,401` — `getByLabel("pdf").check()` → `getByRole("radio", { name: "pdf" }).check()`.

## Left alone

- Consumers (`type-format-section`, `register-step-1`, `date-time-section`) needed **no** call-site changes: single-arg `onValueChange` stays type-safe under Base UI's widened `(value, eventDetails)`; item `value` unchanged.
- The base-nova golden's filled-primary look was NOT adopted — our custom outline-dot style is intentional and preserved.

## Behavior changes

**Base UI DOM delta (root cause of the 2 test fixes):** Base UI Radio renders a visible `<span role=radio>` **plus a hidden `<input aria-hidden tabindex=-1>`**, and routes the consumer `id` to the hidden input (the span gets an auto id + `aria-labelledby`). So `locator('#id')` hit the hidden input and `getByLabel(x)` became ambiguous. Real users are unaffected — clicking `<label htmlFor={id}>` still checks the radio via the native input, and the input is `aria-hidden` (no SR double-announce). Fix was accessible `getByRole('radio', {name})` locators, not a wrapper hack. **This DOM shape recurs on checkbox and switch — grep e2e for `#<id>` / `getByLabel(` before migrating those.**

## Verify by hand

Settings › Submission Types (content format = File): pick a file-extension radio — the outline fills with the primary dot, only one selectable at a time. Settings › Conference › Time Format: toggle 24h/12h, save, reload — selection persists. Register step 1: account-type radios switch correctly.
