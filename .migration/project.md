# project — radix-ui → @base-ui/react (whole migration)

2026-07-05/06 · branch `feat/radix-to-base-ui` · **all 19 wrappers migrated, radix removed, full E2E green.**

## Result

All Radix usage (funnelled through 19 `src/shared/ui/` wrappers) migrated to `@base-ui/react@1.6.0`. `radix-ui` removed from `package.json` (−44 transitive packages); `components.json` style flipped `radix-nova` → `base-nova`. Zero `radix-ui` / `@radix-ui` imports and zero `--radix-*` vars remain in `src`. One commit (mostly) per component; select+dialog share one commit (coupled). Full Playwright suite green after every component.

## Dependency / config

- `pnpm remove radix-ui`; `@base-ui/react` was added in Phase 0 (correct package — Base UI renamed from `@base-ui-components/react` at 1.0; that older name is frozen at rc.0).
- `components.json` `base-nova`: future `shadcn add` now delivers Base UI variants.

## Cross-cutting patterns

- **asChild → render compat shims** on trigger/close/item wrappers (tooltip, dropdown, popover, dialog, sheet, button, badge, radio-group items) — keeps the wrapper API stable so **feature code was almost never touched**. Consumer edits were limited to genuine semantic changes.
- **Select null-shield + Icon-children + per-site `items`** — the user's flagged label-vs-value bug: `Select.Value` renders labels via `items` on Root (~26 label≠value sites); `onValueChange` widened to `string|null` is coerced in the wrapper; `Select.Icon`'s default `'▼'` suppressed by passing the icon as children. Verified by fee/status/track trigger-label guard tests added in Phase 0.
- **Base UI form controls (radio/checkbox/switch)** render a visible element + hidden native input → `id` lands on the hidden input; ~40 E2E `getByLabel`/`#id`/`data-state` locators converted to accessible `getByRole('radio'|'checkbox'|'switch', {name})` / `aria-*`.
- **Behavior deltas flagged, not patched**: tabs manual activation; menu CheckboxItem/RadioItem stay-open default; label double-click guard dropped.

## Gotchas fixed (see per-component reports)

- `Tooltip.Popup` has no `role="tooltip"` → added (getByRole test).
- `Menu.GroupLabel` throws without a `Menu.Group` → `DropdownMenuLabel` rendered as plain `<div role=presentation>`.
- **select + dialog coupled**: Base UI Select popups are inert-blocked inside a modal RADIX dialog → migrated together.
- Collapsible/accordion animation vars (`--radix-*-height` → `--collapsible-panel-height`; accordion animation was already a dead no-op).
- cmdk combobox `w-[--radix-popover-trigger-width]` → `w-(--anchor-width)`.

## Left untouched (intentional, not Radix)

`sonner` (toasts), `cmdk` (`command.tsx`) and its Popover+cmdk comboboxes (`country-combobox`, `timezone-combobox`) — composed, not Radix primitives.

## Docs

Pure UI-primitive swap — no admin-facing feature/field/workflow/screen change, so `docs/` needs no update.

## Final verification

`pnpm typecheck` + `pnpm build` green; `pnpm test:e2e` green (~1172 passed, 0 failed) vs the Phase-0 baseline (1172 passed). Manual QA checklists per component in each `.migration/<component>.md`.
