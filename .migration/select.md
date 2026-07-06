# select

2026-07-06 · golden pair via shadcn registry (base-nova) + wrapper shields + per-site `items` · migrated, full E2E green (1172 passed, 1 flaky). **Committed together with dialog (coupled — see Behavior changes).**

## Changed

- `src/shared/ui/select.tsx` — rewired to `@base-ui/react/select`. Adopted the base-nova golden anatomy (Content → `Portal > Positioner > Popup > List`; `ScrollUpButton`/`DownButton` → `ScrollUpArrow`/`ScrollDownArrow`; `ItemText` FIRST then `ItemIndicator`; `alignItemWithTrigger`), stripping `cn-menu-*` (plain-Tailwind) and keeping our `w-full` trigger + tabler icons. Vars `--radix-select-*` → `--anchor-width`/`--available-height`/`--transform-origin`; `data-[placeholder]` → `data-placeholder`; `data-[state]` → `data-*`.
- **Two wrapper shields** (avoid touching ~28+ consumers):
  - `Select` is a function coercing `onValueChange` from Base UI's widened `(value: string | null)` back to `(value: string)` via `value ?? ""` (`Omit<Root.Props<string>, "onValueChange">`). Our selects are never null-valued.
  - `Select.Icon` is passed the chevron as **children** (not `render`) — Base UI's `Select.Icon` default `children: '▼'` leaks through `render`, producing `"USD▼"` trigger text that broke `toHaveText` (currency, rows-per-page) and cascaded a currency-reset test into contaminating a fee test.
- **Label fix — `items` on Root (the user's flagged bug).** Base UI `Select.Value` renders the raw value unless `items` is on Root. Added `items` to `FormSelectField` (covers all composable consumers) + **~26 raw label≠value `<Select>` sites** (fee, role, track, room, version, format, date-format, survey, status/action/reviewer/track bulk selects, template, theme, document-filters, expense-sort, invite-roles, type-format/review, reviews-round, submission-form track, track supervisor, document-signing corner). label==value selects (currency, page-size) intentionally have no `items`. Audit: every `<Select` opening (incl. multiline) now has `items=` or is label==value.

## Left alone

- `SelectLabel`/`SelectGroup` follow the golden (`GroupLabel`/`Group`) — unused by consumers, so no standalone-context crash risk.
- cmdk `command.tsx` is not a Select.

## Behavior changes

- **Coupled with dialog.** Base UI Select's body-portaled popup is inert-blocked inside a modal RADIX Dialog (the `role=option` resolves but is not clickable). In-dialog selects (fee, bulk status) only work once Dialog is also Base UI — so select + dialog were migrated and committed together. The label fix itself is verified by the fee guard (trigger shows "Full Conference Fee — 250.00 EUR", not the cuid).

## Verify by hand

Open every opaque dropdown and confirm the trigger shows the human LABEL after selecting, not a cuid/enum: fee-type, role, track/room, version, status/action bulk selects, program theme, document template, review mode. Currency/page-size (label==value) unchanged.
