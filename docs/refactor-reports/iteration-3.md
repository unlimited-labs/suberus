# Planner refactor — iteration 3 (server layer)

## Scope

Server-layer cleanup across `src/lib/server/planner/` and
`src/server-fns/planner/`. Targets duplicated date-string handling,
duplicated session-usage math, monolithic issue detector, and
re-implemented series parsing.

## Changes

### `lib/validations/zod-helpers.ts` (new)

Single export `zDateString` — `z.iso.datetime()` chained with a
`.transform((s) => new Date(s))`. Removes the `new Date(data.startAt)`
boilerplate from every datetime-bearing handler.

### `lib/server/planner/session-usage.ts` (new)

`computeSessionUsage(session, opts?)` returns
`{ sessionMin, usedMin, freeMin }`, with optional
`excludePresentationId` for "would this update fit" checks.
`freeSlotsFor(freeMin, slotMin)` aggregates capacity reporting.

Replaces four reimplementations of the same arithmetic.

### `server-fns/planner/sessions.ts`, `server-fns/planner/breaks.ts`

Adopt `zDateString`. Handlers now spread `data` straight into service
calls — the 7-line `const { id, startAt, endAt, ...rest } = data` dance
collapses to `const { id, ...rest } = data`. `undefined` fields are
honored by Prisma as "skip update", so optional-update handlers
(`updateSessionFn`, `updateBreakFn`) need no special branches.

### `lib/server/planner/presentations.ts`

`createPresentation` and `updatePresentationDuration` use
`computeSessionUsage`. The latter passes
`excludePresentationId` instead of filtering inline.

### `lib/server/planner/schedule.ts`

`getCapacity` uses `computeSessionUsage` + `freeSlotsFor`; per-session
loop now reads as accumulation of pre-computed usage.

`getScheduleIssues` (175 lines, 7 inline rule blocks) split into:

- `loadIssueData()` — single Prisma round-trip, returns
  `{ sessions, breaks }`. Types `IssueSession` / `IssueBreak` derived
  via `Awaited<ReturnType<...>>` so the include shape remains the
  source of truth.
- `findSessionsWithoutChair`
- `findOverbookedSessions` (now uses `computeSessionUsage`)
- `findNonAcceptedSubmissions`
- `findPairwiseOverlapIssues` — chair/author maps moved inside;
  emits CHAIR_OVERLAP, ROOM_DOUBLE_BOOKED, AUTHOR_OVERLAP.
- `findBreakRoomConflicts`

`getScheduleIssues` itself is now 9 lines: load + spread-concat.

### `lib/server/planner/sessions.ts`

`continueSeries` no longer carries an inline series-name regex —
imports `parseSeries` from `./tracks`.

## Verification

- `pnpm lint` — no new findings (4 pre-existing CSS warnings on
  `styles.css`).
- `pnpm build` — succeeds, 11.79 s.

## Deferred to future iterations

- `getPublicProgram` / `listSessions` share most of their Prisma
  include shape; consolidating may be worth a focused iteration.
- `breaks.ts:listBreaks` still returns the raw Prisma row type;
  every other `listX` returns a mapped DTO.
- `roomLinkSchema`'s `"" → null` could move into the Zod schema
  via `.transform`.
- `program-track-dialog.tsx` still re-implements the series regex
  client-side; should reuse `parseSeries` (or a client-safe twin).
- Query-key shape inconsistency
  (`["unscheduledSubmissions"]` vs `["programSessions", "all"]`).
