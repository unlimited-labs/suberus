# tabs

2026-07-06 · transformation engine (customized wrapper) · migrated, full E2E green (1170 passed, 3 flaky) after attribute-assertion fixes.

## Changed

- `src/shared/ui/tabs.tsx` — customized wrapper (fixed dimensions, `variant` line/default, explicit `data-orientation`), so kept our classes and only rewired: `@base-ui/react/tabs`; `TabsPrimitive.Trigger`→`.Tab`, `.Content`→`.Panel`; types `.Root.Props`/`.List.Props`/`.Tab.Props`/`.Panel.Props`; `data-[state=active]`→`data-active` throughout the Tab classes. Kept explicit `data-orientation={orientation}` + our `data-[orientation=…]` classes (Base UI also emits `data-orientation`). Removed the now-unused `React` import. Leftover scan clean.
- `e2e/submissions/submission-detail.spec.ts` — 4× `toHaveAttribute("data-state","active")` → `toHaveAttribute("aria-selected","true")` (ARIA attr, robust for both libs), and one `getAttribute("data-state")==="active"` → `getAttribute("data-active") not null` (Base UI presence marker).

## Left alone

- 9 consumers use `<Tabs value/defaultValue>` + `<TabsTrigger value>` — no call-site changes (`onValueChange` single-arg stays type-safe; no consumer used `activationMode`).

## Behavior changes

- **Base UI Tabs default to MANUAL activation** (arrow keys move focus, Enter/Space activates) vs Radix automatic. Flagged, not patched — matches the base registry. No E2E uses arrow-key tab activation (all click), so no functional break.

## Verify by hand

Settings tabs, submission-detail Overview/History, finances/fee/documents/bulk-email/tos tabs, users-by-country map/list: click to switch panels; active tab is visually distinct; arrow keys move focus (activate on Enter).
