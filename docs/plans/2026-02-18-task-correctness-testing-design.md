# Task Correctness Testing Design

## Problem

Scheduled Nitro tasks (`assignments:overdue`, `mails:reminder`) have only smoke tests that verify HTTP 200 responses. No correctness testing exists for the underlying logic. Additionally, `/_nitro/tasks/*` endpoints are dev-only — tests skip in production builds used by E2E.

## Solution

### 1. Admin API Route

**File:** `src/routes/api/admin/tasks/$name.ts`

- `POST /api/admin/tasks/:name` — runs a whitelisted task
- Protected by `adminOnlyMiddleware` (ADMIN role only)
- Whitelist: `assignments:overdue`, `mails:reminder`
- Imports business logic directly (`markOverdueAssignments`, `sendReviewerReminders`, etc.)
- Returns JSON with task results

Response format:
```json
// POST /api/admin/tasks/assignments:overdue
{ "result": { "overdue": 3 } }

// POST /api/admin/tasks/mails:reminder
{ "result": { "reviewerReminders": 2, "revisionReminders": 1, "deadlineReminders": 0 } }
```

### 2. E2E Tests: `assignments:overdue`

**File:** `e2e/admin/task-assignments-overdue.spec.ts`

| # | Scenario | Arrange | Assert |
|---|----------|---------|--------|
| 1 | Marks overdue PENDING assignment | deadline: yesterday, status: PENDING | status === OVERDUE |
| 2 | Marks overdue IN_PROGRESS assignment | deadline: yesterday, status: IN_PROGRESS | status === OVERDUE |
| 3 | Skips future deadline | deadline: +7 days | status === PENDING |
| 4 | Skips COMPLETED assignment | status: COMPLETED, deadline: yesterday | status === COMPLETED |
| 5 | Skips CANCELLED assignment | status: CANCELLED, deadline: yesterday | status === CANCELLED |
| 6 | Idempotent (run twice) | mark overdue, run again | count === 0, status === OVERDUE |

### 3. E2E Tests: `mails:reminder`

**File:** `e2e/admin/task-mails-reminder.spec.ts`

Tests run serial with `clearMailpit()` in `beforeEach`.

**Reviewer reminders:**

| # | Scenario | Arrange | Assert |
|---|----------|---------|--------|
| 1 | Sends when deadline approaching | daysBefore: [3], deadline: +2d | waitForEmail, count === 1 |
| 2 | Dedup — no duplicate on rerun | run twice | second run count === 0 |
| 3 | Skips when disabled | enabled: false | count === 0 |
| 4 | Multiple thresholds | daysBefore: [7, 3], deadline: +2d | sends both (index 0, 1) |

**Revision reminders:**

| # | Scenario | Arrange | Assert |
|---|----------|---------|--------|
| 5 | Sends nudge after interval | REVISE_REQUIRED, intervalDays: 0, statusHistory: yesterday | waitForEmail |
| 6 | Respects maxCount | createSentReminder x maxCount | count === 0 |

**Deadline reminders:**

| # | Scenario | Arrange | Assert |
|---|----------|---------|--------|
| 7 | Sends when deadline approaching | SUBMISSION_DEADLINE: +2d, daysBefore: [3], submission DRAFT | waitForEmail |
| 8 | Skips past deadline | SUBMISSION_DEADLINE: yesterday | count === 0 |

### 4. Cleanup Old Tests

**File:** `e2e/admin/nitro-tasks.spec.ts`

- Keep: build output check (task files exist in `.output/server/_tasks/`)
- Remove: smoke tests for `mails:reminder` and `assignments:overdue` (replaced by new E2E)

## Out of Scope

- No changes to Nitro task definitions (`server/tasks/`)
- No changes to business logic (`reminders.server.ts`, `assignments.server.ts`)
- No new test helpers needed (existing `test-db.ts` and `mailpit.ts` suffice)
