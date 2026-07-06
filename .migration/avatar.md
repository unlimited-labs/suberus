# avatar

2026-07-06 · golden pair via shadcn registry (radix-nova → base-nova) · migrated, full E2E green (1172 passed, 1 flaky).

## Changed

- `src/shared/ui/avatar.tsx` — pristine wrapper; base-nova golden is byte-identical to radix-nova except import + types. Swapped import to `@base-ui/react/avatar` and the three primitive-part types to `AvatarPrimitive.Root.Props` / `.Image.Props` / `.Fallback.Props`. All classes and the custom `AvatarBadge`/`AvatarGroup`/`AvatarGroupCount` (plain span/div, never Radix) unchanged. Leftover scan clean.

## Left alone

- Custom sub-components (`AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`) — not Radix, untouched.

## Behavior changes

None. No consumer uses `delayMs` / `onLoadingStatusChange`; the 3 consumers (`recipient-summary`, `user-detail-header`, `user-menu`) pass only `src`/`className`. Base UI Avatar coordinates Image/Fallback the same way.

## Verify by hand

Any user avatar (user menu, user detail header, bulk-email recipient summary): shows the image when loaded, initials fallback when not; grouped avatars overlap with ring.
