---
title: Phase 5 — Submissions Explorer & Session Scaffolding
date: 2026-04-19
status: draft
parent: 2026-04-18-conference-schedule-planner-design.md
---

# Phase 5 — Submissions Explorer & Session Scaffolding

Refinement of Phase 5 from the parent planner spec. Layout variant picked:
sidebar inside the planner (not separate page, not overlay).

## Scope

Six units, implemented in order:

1. **Backend + grouping sidebar + multi-select** — extend
   `listUnscheduledSubmissions` + rebuild `UnscheduledSidebar`
2. **Create session from selection**
3. **Auto-suggest session name**
4. **+ Continue series**
5. **Split session**
6. **Capacity calculator** (top bar of planner)

## 1. Backend + grouping sidebar

### Data extension

`UnscheduledSubmission` gains:

```ts
{
  id, title, type, authors,          // existing
  trackId: string | null,            // intake (ConferenceTrack)
  trackName: string | null,
  keywords: Array<{ id; name }>,     // top-5 (existing SubmissionKeyword relation)
  abstract: string | null,           // for inline expand
}
```

Grouping is done client-side — one fetch, four views.

### Sidebar UI (rebuild `UnscheduledSidebar`)

Layout top→bottom: header · search · **mode tabs** · group list · **selection
action bar** (when N≥1).

Modes (4):

- **Program Track** — matches submission's `trackName` against existing
  `ProgramTrack.name`; unmatched → "No program track" group. Empty state
  explains: "Program tracks are assigned to submissions when you create a
  session — this view will populate as you plan."
- **Intake track** (default) — groups by `ConferenceTrack.name`, unknown
  → "Unassigned"
- **Keyword** — groups by most-specific keyword (first in `keywords[]`);
  submission appears once
- **Presenter** — groups by primary author (`authors[0]`)

Groups: `<details>` accordions with count badge. First group open, rest
closed. Empty group hidden.

Cards:

- Checkbox (click on card toggles; cmd/shift-click for range)
- Type badge, title, author line (current design)
- Click on title area → expand inline: abstract (clamped 6 lines + "more"),
  full keyword list, intake track pill
- Drag handle stays on left; single-submission drag still works

Selection bar (sticky bottom of sidebar, visible iff `selected.size ≥ 1`):

```
[2 selected]   [Create session]   [Clear]
```

## 2. Create session from selection

New dialog (`create-session-dialog.tsx`, pattern matches existing
`create-event-dialog.tsx`). Fields:

- `title` — placeholder proposes auto-suggestion (see §3)
- `startAt` — default: next free slot on current day (simple heuristic:
  business-hours start if empty, otherwise `max(endAt)` of day's sessions)
- `roomId` — default: first room with no conflict
- `durationMin` — default from `conference.defaultPresentationDuration`
  (existing AppSetting) × selected count

On submit: single RPC `programSessions.createWithPresentations({ title,
startAt, roomId, slotDurationMin, submissionIds })` — creates session
+ N `PresentationSlot` rows in order of selection. Returns session id →
client scrolls planner to it + opens editor sheet.

Guard: all submissionIds must be Accepted/ConditionallyAccepted and
unscheduled (reject mixed).

## 3. Auto-suggest session name

Pure client-side utility `suggestSessionName(submissions)`:

Priority order:
1. Longest common prefix of titles if ≥3 words
2. Most frequent keyword (across `keywords[]`)
3. Most frequent intake track name
4. Fallback: `"Session"`

Surface:
- **In create dialog**: `placeholder` + "✨ Use suggestion" inline button
- **In session editor sheet**: button next to title field → overwrites current value

No server call — uses data already loaded.

## 4. + Continue series

Action button in session editor sheet footer. Parses current session's
name with `/^(.+?)\s+(\d+)$/`:

- Match: create new `ProgramSession` with `name = "${base} ${n+1}"`, copy
  `trackId` (so same color), `roomId` null, `startAt` = end of current
  session, `durationMin` = same. Existing `series` / `seriesOrder` fields
  are set.
- No match: treat current as `"${name} 1"` — update current to add " 1" and
  create " 2"; set `series = name` on both.

RPC: `programSessions.continueSeries({ sessionId })` → returns new session
id; UI scrolls to + opens it.

## 5. Split session

Action in session editor sheet, visible when session has ≥2 presentation
slots. Opens a small inline picker: "Split after presentation N" (list of
slot titles with radio buttons).

On confirm: `programSessions.split({ sessionId, afterSlotOrder })` →
creates a second session copying `title + " (2)"`, trackId, roomId;
`startAt` = the split-point slot's computed start; moves remaining slots
to the new session; adjusts `durationMin` on both.

## 6. Capacity calculator

Compact strip in planner top bar (between day tabs and publish button):

```
 140 talks · 3×3×9h = 324 slots · 43% used
```

Server function `schedule.getCapacity()` returns:

```ts
{
  talks: number,              // Accepted + ConditionallyAccepted
  days: number,
  rooms: number,
  hoursPerDay: number,        // from dailyHours setting
  slotMinutes: number,        // default presentation duration
  theoreticalSlots: number,   // days * rooms * hoursPerDay * 60 / slotMinutes
  scheduled: number,          // count of PresentationSlot rows
  utilizationPct: number,     // scheduled / theoreticalSlots
}
```

Shown as static text (hover tooltip expands breakdown). Updates via query
invalidation on session/slot mutations.

## Files touched

| File | Change |
|---|---|
| `src/utils/program-sessions.server.ts` | extend `listUnscheduledSubmissions` select + add `createWithPresentations`, `continueSeries`, `split` |
| `src/utils/program-sessions.functions.ts` | expose new server fns + query invalidations |
| `src/utils/schedule.server.ts` / `.functions.ts` | add `getCapacity` |
| `src/components/admin/planner/unscheduled-sidebar.tsx` | rebuild with modes + multi-select + expand |
| `src/components/admin/planner/session-grouper.ts` | **new** — pure grouping util |
| `src/components/admin/planner/suggest-session-name.ts` | **new** — pure util |
| `src/components/admin/planner/create-session-dialog.tsx` | **new** |
| `src/components/admin/planner/session-editor-sheet.tsx` | +Auto-suggest, +Continue series, +Split |
| `src/components/admin/planner/capacity-strip.tsx` | **new** |
| `src/routes/_app/admin/_layout/program-planner/index.tsx` | mount capacity strip |

No Prisma migration (series/seriesOrder already in schema).

## Verification

- `pnpm lint` · `pnpm build` green
- Manual smoke in browser for each of the 6 units (expanded in
  implementation plan)

## Open questions

None.
