# slider

2026-07-05 · golden pair via shadcn registry (radix-nova → base-nova) · migrated, full E2E green (1173 passed).

## Changed

- `src/shared/ui/slider.tsx` — wrapper was the **pristine** radix-nova slider (only class-token ordering differed). Adopted the `base-nova` golden verbatim, swapping the utils import to `@/shared/lib/utils`. Structural change: `Root > Control > Track > (Indicator, Thumb)` (Base UI adds the `Control` interactive surface; `Range` → `Indicator`; Thumb moves inside Track). Added `thumbAlignment="edge"` (golden default — keeps the Radix-like thumb-inside-track look). Import now `@base-ui/react/slider`. Leftover scan clean (`grep -n radix-ui src/shared/ui/slider.tsx` → none).
- `src/features/settings/components/branding/auth-background-section.tsx:64` — consumer call-site: Base UI widens `onValueChange` value to `number | number[]`, so the array-destructuring handler `([v]) => …` no longer typechecks (TS2488). Rewrote to `(v) => onChange("authBgOverlay", Array.isArray(v) ? v[0] : v)`.

## Left alone

- The `data-horizontal:` / `data-vertical:` Tailwind variant classes were kept as-is — shadcn authored them identically in both radix-nova and base-nova goldens; Base UI emits `data-orientation` and the variants resolve the same way. Not a raw-attribute change.

## Behavior changes

None observed. Only consumer is a single-thumb horizontal slider (overlay-darkness in branding). `onValueCommit`/`inverted` were unused, so no delta there.

## Verify by hand

Settings › Branding › auth background: with an image set, drag the "Overlay darkness" slider — the fill and thumb track the value, the `{n}%` label updates, and the value persists on save. (E2E does not assert slider fill visually; the drag/commit path is the manual check.)
