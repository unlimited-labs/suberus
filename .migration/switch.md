# switch

2026-07-06 · transformation engine (customized wrapper) · migrated, full E2E green (1172 passed, 1 flaky) after locator fixes.

## Changed

- `src/shared/ui/switch.tsx` — customized wrapper (fixed `h-5 w-9`, no size variant), so kept our classes and only rewired: `@base-ui/react/switch`, `data-[state=checked]`→`data-checked`, `data-[state=unchecked]`→`data-unchecked` (Root bg + Thumb translate), type `SwitchPrimitive.Root.Props`. Leftover scan clean.
- **E2E locators (6 files)** — Base UI switch renders a visible `<span role=switch>` + hidden `<input>` (id → hidden input). Converted switch `getByLabel`/`#id`/`data-state` locators to accessible forms:
  - `getByLabel(<switch label>)` → `getByRole("switch", { name })`: deadline-settings (Close submissions/registration), reminders spec/fixtures (Reviewer/Revision/Deadline reminders), survey-settings (Show in users list), settings-integration (Enable keywords), admin/fixtures (Enable keywords, Enable confidence level), email-templates (Active).
  - `page.locator("#reviewer-enabled" | "#revision-enabled" | "#deadline-enabled")` → `getByRole("switch", { name })` in `reminders/fixtures.ts`.
  - `toHaveAttribute("data-state","checked")` → `toHaveAttribute("aria-checked","true")` in document-signing.

## Left alone / corrected

- **Reverted a misclassification**: `getRequiredReviewersInput()` targets a `<Input type=number>` labeled "Required reviewers" (NOT a switch — the switch in `type-review-section` has a different label). Kept it as `getByLabel("Required reviewers")` (native input, unaffected). Number inputs (`#reviewer-days` etc.) keep `#id`.
- 21 Switch consumers need no code change (`onCheckedChange` single-arg stays type-safe).

## Behavior changes

Same hidden-input DOM delta as radio/checkbox (see those reports). A targeted probe passed while 8 full-suite tests failed on missed `htmlFor`/`#id`/`data-state`/`getByLabel("Active")` locators — form-control probes give false confidence.

## Verify by hand

Settings toggles (important-dates close reg/submissions, reminders, submission-type feature toggles, document signing, exhibitors, finances), survey question "Show in users list", email-template "Active": toggle on/off, persists on save/reload.
