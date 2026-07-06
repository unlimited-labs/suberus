# dialog

2026-07-06 · golden pair via shadcn registry (base-nova) + asChild shims · migrated, full E2E green (1172 passed, 1 flaky). **Committed together with select (coupled).**

## Changed

- `src/shared/ui/dialog.tsx` — rewired to `@base-ui/react/dialog`. `Overlay` → `Backdrop`, `Content` → `Popup`. Kept our customizations (`bg-background` popup, `bg-black/10` overlay, our title/header/footer classes, tabler `IconX`). Internal close button uses `render={<Button/>}` (asChild→render).
- **asChild shims** on `DialogTrigger`, `DialogClose`, AND `DialogDescription` (document-signing wraps a block `<div>` in the description via `asChild`) — keeps all 38 consumers unchanged.
- `src/shared/ui/command.tsx` — `CommandDialog` props: `Omit<ComponentProps<typeof Dialog>, "children"> & { …; children?: React.ReactNode }`. Base UI `Dialog.Root.Props.children` is a render-function union that propagated through `ComponentProps` and clashed with `ReactNode`.

## Left alone

- `sheet.tsx` still on its own Radix `Dialog` import — migrated separately (next).
- 38 consumers: no call-site changes (asChild shims + single-arg `onOpenChange` stays type-safe).

## Behavior changes

- **Coupled with select** (see select report): Base UI Select popups inside a modal dialog only work when the dialog is also Base UI. Neither select nor dialog is independently green (base-select + radix-dialog = broken in-dialog selects), so they share one commit.

## Verify by hand

Any dialog (fee, role, bulk-status, delete-confirm, document, invite, track): opens with backdrop, focus trapped, Esc/outside-click closes, close (X) button works, in-dialog selects open and pick correctly. Command palette (cmdk in a dialog) opens and filters.
