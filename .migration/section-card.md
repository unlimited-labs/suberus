# section-card (Collapsible)

2026-07-06 · transformation engine (custom component, no shadcn golden) · migrated, full E2E green (1172 passed, 1 flaky).

## Changed

- `src/shared/ui/section-card.tsx` — the only consumer of Radix `Collapsible`. Rewired to `@base-ui/react/collapsible`: `Content`→`Panel`; Root `asChild` wrapping `<Card>` → `render={<Card … />}` (Card becomes the root element); `data-[state=open]`→`data-open`/`data-[state=closed]`→`data-closed` on the Panel animation; chevron `group-data-[state=open]/section-trigger:rotate-180` → `group-data-panel-open/section-trigger:rotate-180` (Base UI trigger exposes `data-panel-open`).
- `src/styles.css` — the `collapsible-down`/`collapsible-up` keyframes used `var(--radix-collapsible-content-height)` → `var(--collapsible-panel-height)` (Base UI Collapsible.Panel sets this var). Only section-card uses these keyframes.

## Left alone

- The public `SectionCard` API is unchanged — this is an internal-only rewire, so none of the ~46 consumers change.

## Behavior changes

None. Expand/collapse animates via the same keyframes (now driven by the Base UI panel-height var); single card, chevron rotates on open.

## Verify by hand

Any collapsible SectionCard (settings sections, submission/form detail panels with a chevron): click the header title to expand/collapse; chevron rotates; content animates open/closed.
