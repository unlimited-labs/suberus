# separator

2026-07-06 · golden pair via shadcn registry (base-nova) · migrated, full E2E green (1173 passed, 0 flaky).

## Changed

- `src/shared/ui/separator.tsx` — rewired to `@base-ui/react/separator` (bare component, no `.Root`), type `SeparatorPrimitive.Props`. Dropped the `decorative` prop entirely (Base UI has no equivalent; no consumer passed it). Dropped the dead `"use client"` directive (no-op in this Vite/TanStack Start stack; other migrated wrappers don't carry it). Kept `orientation` and the `data-horizontal:`/`data-vertical:` classes (Base UI emits `data-orientation`, same variant handling as slider). Leftover scan clean.

## Left alone

- 6 consumers pass only `className`/`orientation`; none used `decorative`, so no call-site changes.

## Behavior changes

None. Base UI Separator is always decorative (role=none) — matches the wrapper's previous `decorative={true}` default; no consumer relied on the semantic (`decorative={false}`) variant.

## Verify by hand

Any divider (settings sections, menus, cards): horizontal 1px line spans full width; vertical separators self-stretch.
