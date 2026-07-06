# button

2026-07-06 · golden pair via shadcn registry (base-nova) — real Base UI Button primitive · migrated, full E2E green (1172 passed, 1 flaky). **Last Radix wrapper.**

## Changed

- `src/shared/ui/button.tsx` — dropped Radix `Slot`; polymorphism via Base UI `useRender` + `mergeProps` (like badge), NOT the `@base-ui/react/button` primitive. Kept our `buttonVariants` + `data-slot`/`data-variant`/`data-size` and the `asChild` → `render` compat shim. Leftover scan clean.
- **Follow-up fix (nativeButton warning).** The first pass used `ButtonPrimitive` (per the skill's §Button), but Base UI Button defaults `nativeButton: true` and warns at runtime when `render` produces a non-`<button>` — which every `<Button asChild><Link/></Button>` does (renders an `<a>`): *"A component that acts as a button expected a native <button>…"*. Switching to `useRender` (no `useButton`) makes `asChild` merge styles onto the child while preserving its native semantics (a link stays a `role=link` `<a>`, exactly like Radix `Slot`), eliminating the warning. Verified live: submission-form + profile pages console-clean; whole-app static analysis confirmed Button was the only `nativeButton=true` component fed non-buttons (Menu.Item is `nativeButton=false`; Tooltip.Trigger has no `useButton`).

## Left alone

- 140 consumers unchanged (asChild shim). `type="submit"` buttons are explicit (FormSubmitButton etc.); Base UI Button leaves `type` at the native default, so bare buttons in forms behave as before.

## Behavior changes

- Base UI Button adds `active:` press styling in the base registry — we did NOT adopt it (kept our variants), so no visual change.

## Verify by hand

Every button surface: default/outline/ghost/destructive/link variants, icon buttons, `asChild` link-buttons (nav, "New submission", card actions), submit buttons in forms, disabled states.
