# button

2026-07-06 · golden pair via shadcn registry (base-nova) — real Base UI Button primitive · migrated, full E2E green (1172 passed, 1 flaky). **Last Radix wrapper.**

## Changed

- `src/shared/ui/button.tsx` — dropped Radix `Slot`; now the real `@base-ui/react/button` `ButtonPrimitive` (per wrapper-shapes §Button — NOT a hand-rolled useRender wrapper). Kept our `buttonVariants` (custom variant/size classes) + `data-slot`/`data-variant`/`data-size`. Added an `asChild` → `render` compat shim so all `<Button asChild><Link/></Button>` consumers stay unchanged. Leftover scan clean.

## Left alone

- 140 consumers unchanged (asChild shim). `type="submit"` buttons are explicit (FormSubmitButton etc.); Base UI Button leaves `type` at the native default, so bare buttons in forms behave as before.

## Behavior changes

- Base UI Button adds `active:` press styling in the base registry — we did NOT adopt it (kept our variants), so no visual change.

## Verify by hand

Every button surface: default/outline/ghost/destructive/link variants, icon buttons, `asChild` link-buttons (nav, "New submission", card actions), submit buttons in forms, disabled states.
