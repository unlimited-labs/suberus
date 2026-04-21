# Planner refactor — iteration 1

## Scope

Targets 1–3 from the proposal: shared types, selection context, removal of the
`"none"` sentinel from room/track selects.

## Changes

### Shared types (`src/components/admin/planner/types.ts` — new)

- `PlannerSession` re-exports `ProgramSessionDetail` from
  `program-sessions.server` — canonical session shape.
- `PlannerBreak` derived from `typeof listBreaks` in `schedule-breaks.server`.
- Dropped inline duck-typed shapes in:
  - `use-planner-events.ts` (`SessionInput`, `BreakInput`)
  - `mobile-planner.tsx` (inline session/break types)
  - `mobile/planner-item.ts` (`RawSession`, `RawBreak`)
  - `session-editor/session-editor-header.tsx` (loose `Session` with
    `presentations: unknown[]`)
- `CalendarMoveEvent` duplicates in `use-planner-mutations.ts` and
  `planner-calendar.tsx` replaced by `CalendarEvent` from `@ilamy/calendar`
  (verified in `node_modules/@ilamy/calendar/dist/index.d.ts` — `onEventUpdate`
  already takes `CalendarEvent`).

### Planner selection context (`planner-context.tsx` — new)

`PlannerSelectionProvider` exposes:

- `selectedSessionId`, `selectedBreakId`, `selectSession`, `selectBreak`,
  `clearSelection` — session/break editor target.
- `creationSubmissionIds`, `openCreateFromSelection`,
  `closeCreateFromSelection` — `CreateSessionDialog` trigger.
- `mobileQueueOpen`, `setMobileQueueOpen` — mobile queue drawer.

Removed callback prop drilling from:

- `PublishButton` (`onSessionClick` → context `selectSession`)
- `IssuesPanel` (`onSessionClick` → context `selectSession`)
- `MobilePlanner` (`onSessionClick`, `onBreakClick`, `onOpenSubmissions` → context)
- `UnscheduledSidebar` (`onCreateSession` → context `openCreateFromSelection`)

`ProgramPlannerContent` now consumes the same context rather than owning the
state directly.

### `"none"` sentinel removal

`RoomSelect` / `TrackSelect` now accept and emit `string | null`. Internal
`"__none__"` value is an implementation detail (shadcn `Select` requires a
non-empty item value). Call sites simplified:

- `create-event-dialog.tsx`: `roomId: roomId === "none" ? null : roomId || null`
  → `roomId`.
- `create-session-dialog.tsx`: same simplification for `roomId`/`trackId`.
- `use-session-editor-mutations.ts`: `updateRoom`/`updateTrack` now take
  `string | null` directly; no local conversion.
- `use-break-editor-mutations.ts`: same.
- `session-editor-header.tsx`, `break-editor-sheet.tsx`: pass
  `session.roomId` / `breakItem.roomId` directly (no `?? "none"`).

## Files

**New (3):**

- `src/components/admin/planner/types.ts`
- `src/components/admin/planner/planner-context.tsx`
- `docs/refactor-reports/iteration-1.md`

**Modified (14):**

- `src/routes/_app/admin/_layout/program-planner/index.tsx`
- `src/routes/_app/admin/_layout/program-planner/planner-calendar.tsx`
- `src/routes/_app/admin/_layout/program-planner/use-planner-events.ts`
- `src/routes/_app/admin/_layout/program-planner/use-planner-mutations.ts`
- `src/components/admin/planner/shared/room-select.tsx`
- `src/components/admin/planner/shared/track-select.tsx`
- `src/components/admin/planner/publish-button.tsx`
- `src/components/admin/planner/issues-panel.tsx`
- `src/components/admin/planner/mobile-planner.tsx`
- `src/components/admin/planner/mobile/planner-item.ts`
- `src/components/admin/planner/unscheduled-sidebar.tsx`
- `src/components/admin/planner/create-event-dialog.tsx`
- `src/components/admin/planner/create-session-dialog.tsx`
- `src/components/admin/planner/break-editor-sheet.tsx`
- `src/components/admin/planner/session-editor/session-editor-header.tsx`
- `src/components/admin/planner/session-editor/use-session-editor-mutations.ts`
- `src/components/admin/planner/break-editor/use-break-editor-mutations.ts`

## Verification

- `pnpm build` — OK (TanStack Start build + SSR generation succeeded).
- `pnpm lint` — no new warnings in refactored files. Two pre-existing
  `suppressions/unused` warnings remain in `issues-panel.tsx` (lines 114, 138)
  and four unrelated warnings in `styles.css` / `fee.server.ts`.
- All test `data-testid` selectors preserved.
- No changes to server contracts or Zod schemas.

## Follow-ups (not in this iteration)

4. Extract `TimeRangeSummary` and `TitleWithSuggest` as shared components from
   `CreateEventDialog` / `CreateSessionDialog`.
5. Move `PublishButton`'s inline schedule-query invalidation into
   `useInvalidatePlannerQueries` as `invalidateSchedule`.
6. (Done incidentally.) `MobilePlanner` type re-exports removed.
