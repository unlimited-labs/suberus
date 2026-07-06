# sheet

2026-07-06 · mirrors dialog (Base UI `@base-ui/react/dialog`) + asChild shims · migrated, full E2E green (1172 passed, 1 flaky).

## Changed

- `src/shared/ui/sheet.tsx` — rewired to `@base-ui/react/dialog` (Sheet is a side-drawer built on the Dialog primitive). `Overlay`→`Backdrop`, `Content`→`Popup`. Kept our `data-[side=*]` slide/position classes (Base UI Dialog.Popup is a plain fixed div positioned by CSS), `bg-background`, tabler `IconX`. asChild shims on `SheetTrigger` + `SheetClose`; internal close uses `render={<Button/>}`. `data-starting-style`/`data-ending-style` backdrop fade preserved. Leftover scan clean.

## Left alone

- 5 consumers (planner break/session editors, sidebar) unchanged (asChild shims + single-arg `onOpenChange`).

## Behavior changes

None observed. Base UI Dialog manages focus/inert; the sheet slides from the configured side and closes on Esc/outside-click/X.

## Verify by hand

Planner session editor + break editor sheets (open from footer/header), mobile sidebar sheet: slide in from side, scrim, close via X / Esc / outside click.
