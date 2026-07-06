# separator

2026-07-06 · golden pair via shadcn registry (base-nova) · migrated, full E2E green (1173 passed, 0 flaky).

## Changed

- `src/shared/ui/separator.tsx` — rewired to `@base-ui/react/separator` (bare component, no `.Root`), type `SeparatorPrimitive.Props`. Dropped the `decorative` prop entirely (Base UI has no equivalent; no consumer passed it). Dropped the dead `"use client"` directive (no-op in this Vite/TanStack Start stack; other migrated wrappers don't carry it). Kept `orientation` and the `data-horizontal:`/`data-vertical:` classes verbatim (identical to the pre-migration Radix wrapper). PRE-EXISTING (not a migration regression): the project's `styles.css` lacks the shadcn `@custom-variant data-horizontal/vertical`, so these variants compile to `[data-horizontal]` and never match the primitive's `data-orientation="…"` — separators/sliders render 0px in the cross-axis on master too. Deliberately NOT "fixed" here: adding the variants activates `group-data-horizontal/tabs:h-8`, which clips the multi-row admin-settings TabsList (second row loses its background). A proper fix needs the custom variants AND a multi-row-safe TabsList — out of scope for a 1:1 primitive migration. Leftover scan clean.

## Left alone

- 6 consumers pass only `className`/`orientation`; none used `decorative`, so no call-site changes.

## Behavior changes

None. Base UI Separator is always decorative (role=none) — matches the wrapper's previous `decorative={true}` default; no consumer relied on the semantic (`decorative={false}`) variant.

## Verify by hand

Any divider (settings sections, menus, cards): horizontal 1px line spans full width; vertical separators self-stretch.
