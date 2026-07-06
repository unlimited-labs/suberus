# label

2026-07-06 · golden pair via shadcn registry (base-nova) — native `<label>` · migrated, full E2E green (1171 passed, 2 flaky).

## Changed

- `src/shared/ui/label.tsx` — Base UI has no Label primitive; the base-nova golden is a plain native `<label>`. Dropped the `radix-ui` import and rendered `<label data-slot="label" …>` with our exact classes. Leftover scan clean.

## Left alone

- 54 consumers unchanged — the wrapper's public shape (`React.ComponentProps<"label">`, `htmlFor`, className) is identical; native `<label htmlFor>` gives the same click-to-focus association Radix Label provided.

## Behavior changes

- Radix Label's double-click text-selection guard is dropped (native `<label>` has none) — cosmetic, matches the base registry.

## Verify by hand

Any form label (settings, submission form, auth): clicking the label focuses/toggles its associated input/checkbox/switch/radio.
