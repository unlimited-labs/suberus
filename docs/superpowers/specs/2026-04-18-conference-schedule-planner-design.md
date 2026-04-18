---
title: Conference Schedule Planner — Design
date: 2026-04-18
status: draft
---

# Conference Schedule Planner — Design

## Goal

Let organizers arrange accepted submissions into parallel thematic sessions
across multiple conference days, assigning rooms and chairs, and publish the
final program to attendees.

## Scope (MVP)

In scope:

- CRUD for rooms, program tracks (new, separate from `ConferenceTrack`), and program sessions
- Drag-and-drop planner: columns = rooms, rows = time slots, one grid per day
- Assign accepted submissions to presentation slots within a session (1:1)
- Assign 1–3 chairs per session (any user; no special permissions)
- Non-session blocks (breaks, keynotes) — room optional
- Conflict warnings (soft, never blocking)
- Global schedule state: `DRAFT` → `PUBLISHED`
- Public read-only program view after publish
- iCal export of the public program
- Conference timezone setting (prerequisite)

Out of scope (future):

- Auto-suggest sessions from submission similarity (EasyChair-style)
- Email notifications on publish / re-publish diffs
- Personal attendee agendas
- PDF program export
- Per-user timezone
- Realtime collaboration via ElectricSQL (model supports it, UI later)

## Prerequisite: conference timezone

Add a single `AppSetting` key `conference.timezone` (IANA, e.g.
`Europe/Warsaw`), edited in the admin panel. All session start/end times are
stored as `DateTime` (UTC) and rendered in conference TZ. Single source of
truth, no per-user override in MVP.

## Data model

All times stored UTC. No `Session` — name collides with better-auth; use
`ProgramSession`.

**Tracks are two distinct concepts:**

- `ConferenceTrack` (existing) — used for **submission intake**: authors pick a
  track when submitting. Untouched by this feature.
- `ProgramTrack` (new) — used for **schedule organization**: color-coded groups
  on the planner grid, with series support (`"Foo 1"`, `"Foo 2"`). Completely
  independent from `ConferenceTrack`; no foreign key between them.

Future convenience (post-MVP): one-way **import** action in the
`ProgramTrack` admin UI — "Copy from conference tracks" — reads
`ConferenceTrack` names and creates matching `ProgramTrack` rows. This is
a one-shot copy, not a live link; the rows remain independent afterwards.
No FK added by this feature.

### New models

```prisma
model Room {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @unique
  capacity  Int?
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  programSessions ProgramSession[]
  breaks          ScheduleBreak[]

  @@map("rooms")
}

model ProgramTrack {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique
  color       String?
  series      String?
  seriesOrder Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  programSessions ProgramSession[]

  @@index([series, seriesOrder])
  @@map("program_tracks")
}

model ProgramSession {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  trackId   String?  @db.Uuid            // optional — session may have no track
  roomId    String?  @db.Uuid
  startAt   DateTime
  endAt     DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  track         ProgramTrack?         @relation(fields: [trackId], references: [id], onDelete: SetNull)
  room          Room?                 @relation(fields: [roomId], references: [id], onDelete: SetNull)
  chairs        ProgramSessionChair[]
  presentations PresentationSlot[]

  @@index([startAt])
  @@index([roomId, startAt])
  @@index([trackId])
  @@map("program_sessions")
}

model ProgramSessionChair {
  sessionId String @db.Uuid
  userId    String @db.Uuid

  session ProgramSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([sessionId, userId])
  @@index([userId])
  @@map("program_session_chairs")
}

model PresentationSlot {
  id           String   @id @default(uuid()) @db.Uuid
  sessionId    String   @db.Uuid
  submissionId String   @unique @db.Uuid    // 1 submission = 1 slot
  order        Int
  durationMin  Int
  createdAt    DateTime @default(now())

  session    ProgramSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  submission Submission     @relation(fields: [submissionId], references: [id], onDelete: Restrict)

  @@unique([sessionId, order])
  @@map("presentation_slots")
}

model ScheduleBreak {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  roomId    String?  @db.Uuid    // optional: coffee break w/o room
  startAt   DateTime
  endAt     DateTime
  createdAt DateTime @default(now())

  room Room? @relation(fields: [roomId], references: [id], onDelete: SetNull)

  @@index([startAt])
  @@map("schedule_breaks")
}
```

### Extensions to existing models

`ConferenceTrack` — **untouched**. It stays purely a submission-intake concept.

`Submission` — add reverse relation `presentationSlot PresentationSlot?`.

`User` — add reverse relation for chairs.

### Global schedule state

One `AppSetting` row, key `schedule.state`, JSON value
`{ status: "DRAFT" | "PUBLISHED", publishedAt?: string, publishedBy?: string }`.
No new table.

## Conflict warnings (soft)

Computed in a single query/service (`getScheduleIssues()`); displayed in an
"Issues" panel in the planner, and shown as a modal checklist before publish
(user can publish anyway).

Checks:

1. Same chair assigned to overlapping sessions
2. Same author across overlapping sessions (via `PresentationSlot.submission`)
3. Room double-booked (sessions or breaks overlap in same room)
4. Sum of `durationMin` > `(endAt - startAt)` of parent session
5. Session without any chair
6. Slot referring to non-`Accepted` / non-`ConditionallyAccepted` submission
7. Session outside conference day bounds (if day bounds configured)

No hard blocks. Publish gate = explicit organizer confirmation.

## UI surface

### 1. Admin settings

- Conference timezone (required; blocks planner until set)
- Rooms CRUD (name, capacity, display order)
- Program tracks CRUD (new screen, distinct from "Conference tracks" used for
  submission intake): name, color picker, series auto-detect
  - Track-name input parses `"Foo 3"` → `series="Foo"`, `seriesOrder=3`
  - When creating, suggest next in existing series

### 2. Planner (organizer only)

Based on **ilamy-calendar** resource view (columns = rooms).

Layout:

- Day tabs along top (switch between conference days)
- Left sidebar: accepted submissions not yet scheduled (searchable, filter by
  track)
- Main grid: columns = rooms, rows = time; draggable session cards and
  presentation cards
- Right panel: Issues (live), selected-session editor (title, chairs,
  reorder presentations)
- Footer: `Draft | Publish` button (opens issues checklist)

Interactions:

- Drag submission from sidebar → drops into session → creates
  `PresentationSlot`
- Drag session card → move time / room
- Click session → edit details in side panel
- Create break via "+ Break" button; breaks can live without a room (rendered
  as a spanning row above grid)

Library note: use ilamy-calendar as component base; customize event renderers
for session vs. presentation vs. break. If ilamy proves too restrictive, fall
back to a custom CSS-grid + dnd-kit implementation (~400 LOC).

### 3. Public program (post-publish)

- Per-day view with track color coding
- Filter by track or room
- iCal export (full program + per-session `.ics` link)
- Mobile-friendly (stacked list on small screens)
- Returns 404 while `schedule.state.status === "DRAFT"`

## Permissions

| Action                         | Organizer | Chair (assigned) | Attendee |
|--------------------------------|-----------|------------------|----------|
| View planner                   | ✅        | ❌               | ❌       |
| Edit schedule                  | ✅        | ❌               | ❌       |
| Publish / unpublish            | ✅        | ❌               | ❌       |
| View public program            | ✅        | ✅               | ✅ (post-publish) |
| See self as chair in public UI | ✅        | ✅               | ✅       |

Chair is a **label**, not a role. No chair-specific dashboard or edit rights
in MVP.

## API surface (TanStack Start server functions)

- `rooms.{list,create,update,delete}`
- `programTracks.{list,create,update,delete}` (new; existing `tracks.*` for `ConferenceTrack` stays separate)
- `programSessions.{list,create,update,delete,move,assignChair,removeChair}`
- `presentationSlots.{create,delete,reorder}`
- `breaks.{list,create,update,delete}`
- `schedule.{getState,publish,unpublish,getIssues,exportIcal}`
- `settings.{getTimezone,setTimezone}`

All mutations validated with Zod, go through permission guard
(organizer-only), and log to `ActivityLog` where applicable.

## Tech stack

| Concern        | Choice                                      |
|----------------|---------------------------------------------|
| Calendar base  | ilamy-calendar (MIT, dnd-kit + shadcn)      |
| DnD            | dnd-kit (via ilamy)                         |
| Dates          | dayjs (already in ilamy) + IANA TZ support  |
| Forms          | TanStack Form + Zod                         |
| Data           | Prisma + TanStack DB                        |
| iCal export    | `ics` npm package                           |
| Icons          | Tabler Icons                                |

Vendoring strategy: add ilamy-calendar as dependency first; if customization
needs grow beyond render-props, fork to internal package.

## Risks & mitigations

| Risk                                       | Mitigation                                           |
|--------------------------------------------|------------------------------------------------------|
| ilamy-calendar bus-factor 1 (~268 stars)   | MIT — can vendor/fork anytime; fallback plan exists  |
| Timezone bugs around DST at session edges  | Always store UTC; render via dayjs+TZ; test DST week |
| Chair user deleted while scheduled         | `onDelete: Cascade` on `ProgramSessionChair`         |
| Submission withdrawn after scheduling      | Conflict warning surfaces it; slot stays until admin removes |

## Admin UX flow

The planner is more than a grid; it must scaffold admins who have many
submissions they do not fully understand, without knowing in advance how many
parallel sessions they need or how to name them.

### Starting point

On first open, admin sees **all accepted submissions** but no sessions yet.
The UI guides them through three stages: **set frame → explore material →
build bottom-up**, rather than dropping them into an empty grid.

### Stage 1 — Startup wizard (first-run only, skippable)

Three steps, each with sensible defaults so a "Next, Next, Next" user gets a
reasonable starting grid:

1. **Time frame** — conference dates, daily hours (default 9:00–18:00),
   default presentation duration (default 15 min), toggle for common breaks
   (lunch 13:00–14:00, coffee 11:00 / 16:00) which generate `ScheduleBreak`
   rows per day.
2. **Rooms** — add at least one, capacity optional.
3. **Capacity check** *(MVP → deferred to Phase 5/6)* — displays calculation:
   total talks × default duration vs. available hours × rooms, and suggests
   minimum parallel streams. Without this in MVP, admin guesses; with it,
   the math is explicit.

### Stage 2 — Submissions Explorer (sidebar tab)

The sidebar has three grouping modes (toggle):

- **By Program Track** (after import/creation) — largest signal when tracks
  mirror intake tracks
- **By Conference Track** (intake track; author-selected)
- **By Keyword**
- **By Presenter**

Each submission card shows: title, presenter, intake track, top-3 keywords,
expandable abstract. Admin reads and builds mental model **before** placing
cards. This answers "I don't understand these submissions".

**Bulk-read mode** *(deferred to Phase 5/6)* — full-screen abstract slideshow
with arrow-key navigation, for quickly skimming all submissions before
planning.

### Stage 3 — Bottom-up session building

Typical flow:

1. (Optional, post-MVP) Import `ConferenceTrack` names as `ProgramTrack` rows
   → admin gets pre-named buckets.
2. Sidebar shows per-group counts: "ML: 23, NLP: 18, Vision: 31, Unassigned:
   69". Admin picks the largest cluster first.
3. **Multi-select submissions** in sidebar, right-click / action button →
   **"Create session from selection"**:
    - Default name: placeholder (`"Session A-1"`) or copied from the common
      Program Track, whichever applies
    - Default slot: next free slot in the grid
    - Naming can be deferred — the session exists and contains the talks
4. Drag individual submissions into existing sessions to refine.
5. **Split session** action on a presentation slot → splits into two
   sessions at that boundary. Useful when a cluster grows too big.

This sequence means the admin never faces "what do I name this empty
session?" — sessions are born with content and *then* named.

### Session series (XXX 1, XXX 2)

When a cluster doesn't fit one session, admin clicks **"+ Continue series"**
on the session card:

- First call: parses name `"ML"` → sets `series="ML"`, `seriesOrder=1`, and
  creates new `ProgramSession` with `series="ML"`, `seriesOrder=2`, named
  `"ML 2"`
- Subsequent calls: increment seriesOrder
- Sessions in the same series share the track color automatically

This answers "I don't know what to name it" for the common continuation case.

### Deferred naming

- Sessions may have placeholder names (`"Session A-1"`) throughout draft
- **Auto-suggest name** button in session editor: inspects assigned
  submissions and proposes
    - most common keyword
    - common Program Track name
    - longest common prefix in titles (if any)
- Pre-publish checklist warns about unnamed sessions but does not block

### Special blocks

"**+ Block**" button (distinct from "+ Session"): `Keynote`, `Panel`, `Break`
(with or without room), `Poster Session`. Backed by `ScheduleBreak` model;
keynote-style blocks render as a single full-width row spanning all rooms.

### Publish flow

Clicking **Publish** opens a checklist modal listing every soft warning with
inline context and a **"Go fix"** deep-link for each:

- N sessions without a chair
- N sessions with placeholder names
- N accepted submissions not assigned to any session
- Room double-bookings
- Chair/author appearing in overlapping sessions

Admin can **"Publish anyway"** (warnings are soft) or fix items first. On
publish, `AppSetting.schedule.state` flips to `PUBLISHED` and the public URL
goes live.

## Rollout phases

1. **Phase 0 — Prereq:** Conference timezone in admin settings
2. **Phase 1 — Model & API:** Prisma migration, server functions, guards
3. **Phase 2 — Rooms & Tracks UI:** CRUD + series auto-naming
4. **Phase 3 — Planner:** ilamy-calendar integration, DnD, issues panel
5. **Phase 4 — Publish & public view:** State toggle, read-only page, iCal
6. **Phase 5 — Admin UX scaffolding:** Startup wizard (time frame + rooms;
   no capacity calc yet), Submissions Explorer with groupings,
   "Create session from selection", "+ Continue series", auto-suggest name,
   split session
7. **Phase 6 — Polish & power features:** Mobile, empty states, a11y pass,
   **capacity calculator** in wizard, **bulk-read abstract mode**,
   `ConferenceTrack → ProgramTrack` import action

## Open questions (deferred)

- Email notifications on publish and re-publish diffs
- Per-attendee agenda / "add to my schedule"
- PDF program export
- Auto-suggest sessions from submission keyword similarity
- Realtime collab view (ElectricSQL streaming) — model already supports
- One-way import of `ConferenceTrack` → `ProgramTrack` (bulk copy convenience)
