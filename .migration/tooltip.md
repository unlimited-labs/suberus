# tooltip

2026-07-06 · golden pair via shadcn registry (base-nova) + asChild shim · migrated, full E2E green (1173 passed, 0 flaky) after a role fix.

## Changed

- `src/shared/ui/tooltip.tsx` — rewired to `@base-ui/react/tooltip`. `TooltipProvider` `delayDuration`→`delay`. `TooltipContent` now `Portal > Positioner > Popup` (positioning props on Positioner; exposes side/sideOffset/align/alignOffset, defaults side=top/sideOffset=4). CSS var `--radix-tooltip-content-transform-origin`→`--transform-origin`. Adopted the golden per-side Arrow classes. Our dark look (`bg-foreground text-background`) already matched the golden.
- **asChild shim**: `TooltipTrigger` accepts `asChild` and maps a single valid-element child to Base UI's `render={children}` (`React.isValidElement` narrows, no cast). Keeps the wrapper API stable so **all ~10 tooltip consumers stay unchanged** (they all use `<TooltipTrigger asChild>`). Same pattern will be reused for dropdown/popover/dialog triggers.
- **`role="tooltip"` added to the Popup** — Base UI's Tooltip.Popup does NOT set `role="tooltip"` (Radix Content did). Text-based tooltip assertions passed, but `e2e/admin/email-templates.spec.ts` uses `getByRole('tooltip', { name })` and failed (the tooltip rendered as a bare text node). Adding the role is correct ARIA and restores compatibility — no test change. Leftover scan clean.

## Left alone

- Kept the dead `data-[state=delayed-open]` animation classes (harmless; Base UI emits `data-open`/`data-instant`) — matches the golden, minimal diff.
- Consumers unchanged (asChild shim). `Badge`-as-trigger works: Base UI `render` forwards refs to function components under React 19 (the tooltip opened; only the missing role failed the one test).

## Behavior changes

- Base UI tooltip default hover `delay` is 600ms, but the global `TooltipProvider delay={0}` (in `__root.tsx`) applies, so behavior matches.

## Verify by hand

Hover any icon/badge tooltip (finances board, planner header, submission columns, new-submission disabled button, email-template placeholder badges): tip appears immediately with the arrow pointing at the trigger.
