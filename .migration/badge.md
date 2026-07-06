# badge

2026-07-06 · golden pair via shadcn registry (base-nova) — useRender · migrated, full E2E green (1171 passed, 2 flaky).

## Changed

- `src/shared/ui/badge.tsx` — dropped Radix `Slot`; polymorphism now via Base UI `useRender` + `mergeProps` (base-nova pattern). Kept our `badgeVariants` (custom classes) and `data-slot="badge"`/`data-variant` (E2E `[data-slot='badge']` role-badge fixture relies on it). Added an `asChild` → `render` compat shim so consumers keep `<Badge asChild><Link/></Badge>`. `data-slot`/`data-variant` are spread (not a literal) to bypass React's HTMLAttributes excess-property check on `data-*`. Leftover scan clean.

## Left alone

- 60 consumers unchanged (asChild shim).

## Behavior changes

None. Default renders a `<span>`; `asChild` renders the child element (link badges) with badge classes + `data-slot` merged.

## Verify by hand

Submission status badges, user role badge (admin users list/detail), any link-style badge (bulk-email placeholder chips): correct color per variant, link badges navigate.
