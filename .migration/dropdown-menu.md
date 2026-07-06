# dropdown-menu

2026-07-06 · golden pair via shadcn registry (base-nova) + asChild shim · migrated, full E2E green (1172 passed, 1 flaky) after two fixes.

## Changed

- `src/shared/ui/dropdown-menu.tsx` — rewired to `@base-ui/react/menu` (`Menu.*`). Adopted the base-nova golden structure, **stripping the `cn-menu-*`/`cn-rtl-flip` hook classes** (plain-Tailwind project per wrapper-shapes.md) and keeping our plain classes + tabler icons. Part renames: Content→`Portal>Positioner>Popup`; Sub→`SubmenuRoot`; SubTrigger→`SubmenuTrigger` (+`data-popup-open` open styling); SubContent composes Content with `align=start alignOffset=-3 side=right sideOffset=0`; ItemIndicator→`CheckboxItemIndicator`/`RadioItemIndicator`. CSS vars `--radix-dropdown-menu-*`→`--available-height`/`--anchor-width`/`--transform-origin`; `data-[state=closed]`→`data-closed`, `data-[disabled]`→`data-disabled`, `data-[inset]`→`data-inset`.
- **asChild shims** on `DropdownMenuTrigger` AND `DropdownMenuItem` (Item asChild wraps `<Link>` in 6 places) — keeps consumers unchanged.
- **`DropdownMenuLabel` → plain `<div role="presentation">`** (NOT `Menu.GroupLabel`). Base UI `Menu.GroupLabel` throws `useMenuGroupRootContext()` when not inside a `Menu.Group`; the standalone label in `data-table-view-options.tsx` crashed the menu portal → empty menu → `menuitemcheckbox` not found (3 Column-menu tests failed). A plain div is the robust standalone heading. Leftover scan clean.
- Consumers — `onSelect`→`onClick` (Base UI menu items): `themes/shared.tsx` (notifications item: `e.preventDefault()` keep-open → `closeOnClick={false}` + `onClick`; logout → `onClick`), `actions-card.tsx` (transition/delete → `onClick`). `data-table-view-options.tsx` CheckboxItem: dropped `onSelect={(e)=>e.preventDefault()}` — Base UI `CheckboxItem` `closeOnClick` defaults false (stays open).

## Left alone

- User actions menus, user-menu submenu, data-table column header menu — no code change (asChild shim + unchanged item props).

## Behavior changes

- Menu `Item` closes on click by default (`closeOnClick` true) = Radix parity. `CheckboxItem`/`RadioItem` default to **staying open** (Radix closed unless prevented) — matches the desired column-toggle behavior; the explicit keep-open `onSelect` was removed as now-redundant.

## Verify by hand

Submission actions menu (transition/edit-link/delete), user actions (role/fee/activate), data-table Columns menu (toggle keeps menu open, checkmark flips live), user-menu submenu, program public auth menu (notifications toggle stays open, logout).
