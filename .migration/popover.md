# popover

2026-07-06 · golden pair via shadcn registry (base-nova) + asChild shim · migrated, full E2E green (1172 passed, 1 flaky).

## Changed

- `src/shared/ui/popover.tsx` — rewired to `@base-ui/react/popover`. `PopoverContent` now `Portal > Positioner > Popup` (positioning on Positioner; exposes side/sideOffset/align/alignOffset). CSS var `--radix-popover-content-transform-origin`→`--transform-origin`. asChild shim on `PopoverTrigger` (all 9 consumers use `<PopoverTrigger asChild>`), so consumers are unchanged. Leftover scan clean.
- **Dropped `PopoverAnchor`** — Base UI Popover has no Anchor part, and no consumer imported it (grep clean).
- Kept `PopoverHeader`/`PopoverTitle`/`PopoverDescription` as plain `div`/`p` (as before) rather than Base UI `Popover.Title`/`Description` — those require a Popover context and would risk the same standalone-context crash seen with menu GroupLabel.

## Left alone

- The cmdk comboboxes (`country-combobox`, `timezone-combobox`) and faceted filters (`data-table-column-filter`, `data-table-text-filter`) compose Popover — no code change; they work via the asChild shim.

## Behavior changes

None observed. Faceted-filter and combobox E2E (register country, conference timezone, admin Role filter) pass; those locate the popover via `[data-slot='popover-content']`, unaffected.

## Verify by hand

Faceted column filters (Role/Track), country & timezone comboboxes, planner room-filter / issues-panel / session-editor popovers: open, interact, dismiss on outside-click and Escape.
