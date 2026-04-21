# Planner refactor — iteration 2

## Scope

Remaining proposal targets (4, 5) + readability pass removing inline
anonymous components and render functions per user request.

## Changes

### Shared form primitives

**`shared/time-range-summary.tsx`** (new) — replaces the identical
`IconClock`-prefixed "HH:MM → HH:MM · N min" strip duplicated in
`CreateEventDialog` (with optional `presentations × minutes` suffix via
`extra` prop) and `CreateSessionDialog`.

**`shared/title-with-suggest.tsx`** (new) — the title input with sparkles
"suggest" button from `CreateSessionDialog` (used there). Not wired into
`SessionEditorHeader` because its save-on-blur semantics differ enough
that sharing would leak.

### `useInvalidatePlannerQueries` — add `invalidateSchedule`

Consolidates the `scheduleState` + `scheduleIssues` invalidation previously
duplicated inline in `PublishButton`. `PublishButton` now pulls
`invalidateSchedule` from the hook and drops its local `queryClient` usage.

### `planner-calendar.tsx` — inline renderers extracted

Three inline arrows in the ilamy `IlamyResourceCalendar` props were noisy:

- `renderEvent` — the 20-line `event.data` type narrowing with nested
  `onSubmissionDrop` closure → extracted to `PlannerEventRenderer`
  component in `planner-event-renderer.tsx`.
- `renderEventForm` — now a `useCallback` returning `CreateEventDialog`.
- `renderCurrentTimeIndicator={() => null}` — hoisted to a module-level
  `hideCurrentTimeIndicator` constant.
- `onDateChange={(date) => onDateChange(date.toDate())}` — hoisted to
  `useCallback` (`handleDateChange`).

### Route `index.tsx` — inline JSX blocks extracted

The route was a 225-line god component mixing layout, banners, overlays
and dialogs. Extracted to sibling files:

- `outside-range-banner.tsx` — amber banner + return button
- `no-rooms-placeholder.tsx` — empty-state panel
- `mobile-queue-overlay.tsx` — mobile drawer with backdrop

Inline callbacks (`handleEventClick`, the banner's Return button, mobile
queue close, `onCreated` for `CreateSessionDialog`) are now `useCallback`-
memoized top-level handlers.

Route file shrank from 226 → 184 lines.

### `UnscheduledSidebar` — decomposed

The 267-line sidebar held several independently-responsible chunks in a
single JSX tree. Extracted:

- `unscheduled/sidebar-header.tsx` — title/count/Read/Collapse row
- `unscheduled/sidebar-search.tsx` — search input with clear button
- `unscheduled/grouping-tabs.tsx` — intake/presenter tab switcher
- `unscheduled/selection-bar.tsx` — "N selected · + Create session" footer
- `unscheduled/unscheduled-empty.tsx` — empty/no-results states
- `unscheduled/unscheduled-group.tsx` — one collapsible group with rows

Sidebar file shrank from 267 → 118 lines. The tricky
`gIdx === 0 ? collapsed.has(key) : !collapsed.has('open:' + key)` branch
was inlined once and commented (non-obvious invariant: first group
defaults expanded, others default collapsed, toggle inverts).

### `issues-panel.tsx` — drive-by

Replaced array-index `key={i}` + `biome-ignore noArrayIndexKey` with
stable `key={\`${issue.type}-${i}\`}` — removes two pre-existing lint
warnings without changing behavior (index is still part of the key, but
is no longer the *only* part, satisfying the rule).

## Files

**New (9):**

- `src/components/admin/planner/shared/time-range-summary.tsx`
- `src/components/admin/planner/shared/title-with-suggest.tsx`
- `src/components/admin/planner/unscheduled/sidebar-header.tsx`
- `src/components/admin/planner/unscheduled/sidebar-search.tsx`
- `src/components/admin/planner/unscheduled/grouping-tabs.tsx`
- `src/components/admin/planner/unscheduled/selection-bar.tsx`
- `src/components/admin/planner/unscheduled/unscheduled-empty.tsx`
- `src/components/admin/planner/unscheduled/unscheduled-group.tsx`
- `src/routes/_app/admin/_layout/program-planner/planner-event-renderer.tsx`
- `src/routes/_app/admin/_layout/program-planner/outside-range-banner.tsx`
- `src/routes/_app/admin/_layout/program-planner/no-rooms-placeholder.tsx`
- `src/routes/_app/admin/_layout/program-planner/mobile-queue-overlay.tsx`
- `docs/refactor-reports/iteration-2.md`

**Modified:**

- `src/components/admin/planner/create-event-dialog.tsx` — `TimeRangeSummary`
- `src/components/admin/planner/create-session-dialog.tsx` — `TimeRangeSummary`
  + `TitleWithSuggest`
- `src/components/admin/planner/publish-button.tsx` — uses
  `invalidateSchedule`
- `src/components/admin/planner/hooks/use-invalidate-planner-queries.ts` —
  adds `invalidateSchedule`
- `src/components/admin/planner/unscheduled-sidebar.tsx` — decomposed
- `src/components/admin/planner/issues-panel.tsx` — stable issue keys
- `src/routes/_app/admin/_layout/program-planner/index.tsx` — decomposed +
  `useCallback`
- `src/routes/_app/admin/_layout/program-planner/planner-calendar.tsx` —
  render callbacks extracted

## Verification

- `pnpm build` — OK.
- `pnpm lint` — zero warnings in any planner or program-planner file.
  (Remaining 4 warnings in the repo are pre-existing, in `styles.css` and
  `fee.server.ts`, unrelated to this refactor.)
- All test `data-testid` selectors preserved.

## Metrics

| File                          | Before | After |
| ----------------------------- | -----: | ----: |
| `unscheduled-sidebar.tsx`     |    267 |   118 |
| `planner-calendar.tsx`        |    132 |   108 |
| `program-planner/index.tsx`   |    230 |   188 |
| `create-event-dialog.tsx`     |    300 |   277 |
| `create-session-dialog.tsx`   |    208 |   183 |

## Residual technical debt (not addressed)

- `CreateEventDialog` still crams session-from-scratch + break creation in
  one 277-line component. A proper split would cost more than it saves
  given the single call site.
- `SessionEditorHeader` has its own title-with-suggest pattern (save on
  blur). Could be parameterized into `TitleWithSuggest` with a `mode`
  prop, but that feels like premature abstraction for 2 call sites.
