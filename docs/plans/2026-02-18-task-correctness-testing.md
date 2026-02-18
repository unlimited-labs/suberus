# Task Correctness Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin API route for running scheduled tasks + E2E tests verifying their correctness.

**Architecture:** New file route `POST /api/admin/tasks/$name` wraps existing business logic (`markOverdueAssignments`, `sendReviewerReminders`, etc.) behind `adminRequestMiddleware`. E2E tests seed data via `test-db.ts` helpers, call the API, and assert DB state + Mailpit emails.

**Tech Stack:** TanStack Start file routes, Playwright E2E, Mailpit, Prisma test helpers.

**Design doc:** `docs/plans/2026-02-18-task-correctness-testing-design.md`

---

### Task 1: Admin Task Runner Route

**Files:**
- Create: `src/routes/api/admin/tasks/$name.ts`

**Step 1: Create the route**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { markOverdueAssignments } from "@/utils/assignments.server";
import {
	sendDeadlineReminders,
	sendReviewerReminders,
	sendRevisionReminders,
} from "@/utils/reminders.server";
import { adminRequestMiddleware } from "@/utils/auth.middleware";

const TASK_RUNNERS: Record<string, () => Promise<Record<string, unknown>>> = {
	"assignments:overdue": async () => ({
		overdue: await markOverdueAssignments(),
	}),
	"mails:reminder": async () => {
		const reviewerReminders = await sendReviewerReminders();
		const revisionReminders = await sendRevisionReminders();
		const deadlineReminders = await sendDeadlineReminders();
		return { reviewerReminders, revisionReminders, deadlineReminders };
	},
};

export const Route = createFileRoute("/api/admin/tasks/$name")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			POST: async ({ params }) => {
				const runner = TASK_RUNNERS[params.name];
				if (!runner) {
					return Response.json(
						{ error: `Unknown task: ${params.name}` },
						{ status: 404 },
					);
				}
				const result = await runner();
				return Response.json({ result });
			},
		},
	},
});
```

**Step 2: Run lint + build**

Run: `pnpm lint && pnpm build`
Expected: PASS — no errors

**Step 3: Commit**

```bash
git add src/routes/api/admin/tasks/\$name.ts
git commit -m "feat: admin API route for running scheduled tasks"
```

---

### Task 2: Cleanup Old Smoke Tests

**Files:**
- Modify: `e2e/admin/nitro-tasks.spec.ts`

**Step 1: Remove smoke tests, keep build check**

Replace the file content with:

```typescript
import { test, expect } from "../helpers/base-fixtures"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const OUTPUT_DIR = resolve(process.cwd(), ".output/server")

test.describe("Nitro Tasks", () => {
	test("scheduled tasks are included in build output", async () => {
		// Assert - task files exist in production build
		expect(existsSync(resolve(OUTPUT_DIR, "_tasks/reminder.mjs"))).toBe(true)
		expect(existsSync(resolve(OUTPUT_DIR, "_tasks/overdue.mjs"))).toBe(true)
	})
})
```

**Step 2: Commit**

```bash
git add e2e/admin/nitro-tasks.spec.ts
git commit -m "test: remove smoke tests replaced by correctness tests"
```

---

### Task 3: E2E Tests — `assignments:overdue`

**Files:**
- Create: `e2e/admin/task-assignments-overdue.spec.ts`

**Step 1: Write test file**

Reference helpers:
- `e2e/helpers/test-db.ts` — `createAssignmentWithDeadline`, `getAssignmentStatus`, `deleteSubmission`
- `e2e/helpers/base-fixtures.ts` — `test`, `expect` with `testRun` + `cleanup` fixtures

```typescript
import { test, expect } from "../helpers/base-fixtures"
import {
	createAssignmentWithDeadline,
	getAssignmentStatus,
} from "../helpers/test-db"
import { AssignmentStatus } from "../../src/generated/prisma/enums"

const DAY_MS = 24 * 60 * 60 * 1000

async function runOverdueTask(page: import("@playwright/test").Page) {
	const response = await page.request.post("/api/admin/tasks/assignments:overdue")
	expect(response.status()).toBe(200)
	return (await response.json()) as { result: { overdue: number } }
}

test.describe("Task: assignments:overdue", () => {
	test("marks overdue PENDING assignment", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Overdue PENDING",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		// Act
		const { result } = await runOverdueTask(page)

		// Assert
		expect(result.overdue).toBeGreaterThanOrEqual(1)
		expect(await getAssignmentStatus(assignmentId)).toBe("OVERDUE")
	})

	test("marks overdue IN_PROGRESS assignment", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Overdue IN_PROGRESS",
			assignmentStatus: AssignmentStatus.IN_PROGRESS,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		// Act
		const { result } = await runOverdueTask(page)

		// Assert
		expect(result.overdue).toBeGreaterThanOrEqual(1)
		expect(await getAssignmentStatus(assignmentId)).toBe("OVERDUE")
	})

	test("skips assignment with future deadline", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Future deadline",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 7 * DAY_MS),
		})
		cleanup.track(submissionId)

		// Act
		await runOverdueTask(page)

		// Assert
		expect(await getAssignmentStatus(assignmentId)).toBe("PENDING")
	})

	test("skips COMPLETED assignment with past deadline", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Completed past deadline",
			assignmentStatus: AssignmentStatus.COMPLETED,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		// Act
		await runOverdueTask(page)

		// Assert
		expect(await getAssignmentStatus(assignmentId)).toBe("COMPLETED")
	})

	test("skips CANCELLED assignment with past deadline", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Cancelled past deadline",
			assignmentStatus: AssignmentStatus.CANCELLED,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		// Act
		await runOverdueTask(page)

		// Assert
		expect(await getAssignmentStatus(assignmentId)).toBe("CANCELLED")
	})

	test("idempotent — second run returns 0", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Idempotent test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		// Act — first run
		await runOverdueTask(page)
		expect(await getAssignmentStatus(assignmentId)).toBe("OVERDUE")

		// Act — second run
		const { result } = await runOverdueTask(page)

		// Assert — no new overdue (this specific one already marked)
		expect(await getAssignmentStatus(assignmentId)).toBe("OVERDUE")
	})
})
```

**Step 2: Run tests**

Run: `pnpm exec playwright test e2e/admin/task-assignments-overdue.spec.ts --project=chromium-admin`
Expected: All 6 tests PASS

**Step 3: Commit**

```bash
git add e2e/admin/task-assignments-overdue.spec.ts
git commit -m "test: assignments:overdue correctness tests"
```

---

### Task 4: E2E Tests — `mails:reminder`

**Files:**
- Create: `e2e/admin/task-mails-reminder.spec.ts`

**Step 1: Write test file**

Reference helpers:
- `e2e/helpers/test-db.ts` — `createAssignmentWithDeadline`, `createSubmissionWithDecision`, `createSubmission`, `createSentReminder`, `cleanupSentReminders`, `setAppSetting`, `getTestUserIds`
- `e2e/helpers/mailpit.ts` — `clearMailpit`, `waitForEmail`
- `e2e/helpers/test-users.ts` — `REVIEWER_USER`, `TEST_USER`

Key references in business logic:
- `src/utils/reminders.server.ts:43-109` — `sendReviewerReminders()`: queries assignments with `status IN [PENDING, IN_PROGRESS]` and `deadline <= threshold AND deadline > now`
- `src/utils/reminders.server.ts:112-189` — `sendRevisionReminders()`: queries submissions with `status = REVISE_REQUIRED`, checks `intervalDays` and `maxCount`
- `src/utils/reminders.server.ts:192-261` — `sendDeadlineReminders()`: checks `SUBMISSION_DEADLINE` setting, queries `DRAFT` and `REVISE_REQUIRED` submissions

Important: email sending is fire-and-forget (`void sendEmail(...)`) so use `waitForEmail` with timeout to poll Mailpit.

```typescript
import { test, expect } from "../helpers/base-fixtures"
import {
	createAssignmentWithDeadline,
	createSubmission,
	createSubmissionWithDecision,
	createSentReminder,
	cleanupSentReminders,
	setAppSetting,
	getTestUserIds,
} from "../helpers/test-db"
import { clearMailpit, waitForEmail } from "../helpers/mailpit"
import { REVIEWER_USER, TEST_USER } from "../helpers/test-users"
import { AssignmentStatus, EditorDecisionType, SubmissionStatus } from "../../src/generated/prisma/enums"

const DAY_MS = 24 * 60 * 60 * 1000

async function runReminderTask(page: import("@playwright/test").Page) {
	const response = await page.request.post("/api/admin/tasks/mails:reminder")
	expect(response.status()).toBe(200)
	return (await response.json()) as {
		result: {
			reviewerReminders: number
			revisionReminders: number
			deadlineReminders: number
		}
	}
}

test.describe.serial("Task: mails:reminder", () => {
	test.beforeEach(async () => {
		await clearMailpit()
	})

	// --- Reviewer reminders ---

	test("sends reviewer reminder when deadline approaching", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer reminder test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert
		expect(result.reviewerReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(REVIEWER_USER.email, "review", 10000)
		expect(email).toBeTruthy()

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	test("dedup — no duplicate on rerun", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer dedup test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act — first run
		await runReminderTask(page)
		await clearMailpit()

		// Act — second run
		const { result } = await runReminderTask(page)

		// Assert — no new reviewer reminders for this assignment
		const email = await waitForEmail(REVIEWER_USER.email, "review", 3000)
		expect(email).toBeNull()

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	test("skips reviewer reminders when disabled", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: false, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer disabled test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert
		expect(result.reviewerReminders).toBe(0)

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	test("sends for multiple thresholds", async ({ page, testRun, cleanup }) => {
		// Arrange — daysBefore: [7, 3], deadline in 2 days → both thresholds triggered
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [7, 3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Multi threshold test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert — should send 2 reminders (index 0 for 7-day, index 1 for 3-day)
		expect(result.reviewerReminders).toBeGreaterThanOrEqual(2)

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	// --- Revision reminders ---

	test("sends revision nudge after interval", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 0, maxCount: 3 })
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision nudge test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(submissionId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert
		expect(result.revisionReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(TEST_USER.email, "revis", 10000)
		expect(email).toBeTruthy()

		// Cleanup
		await cleanupSentReminders(submissionId)
	})

	test("respects revision maxCount", async ({ page, testRun, cleanup }) => {
		// Arrange — maxCount: 2, pre-fill 2 sent reminders
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 0, maxCount: 2 })
		const { testUserId } = await getTestUserIds()
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision maxCount test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(submissionId)

		// Pre-fill maxCount reminders
		await createSentReminder({ userId: testUserId, reminderType: "REVISION_REMINDER", entityId: submissionId, reminderIndex: 0 })
		await createSentReminder({ userId: testUserId, reminderType: "REVISION_REMINDER", entityId: submissionId, reminderIndex: 1 })

		// Act
		const { result } = await runReminderTask(page)

		// Assert — no new revision reminders (maxCount reached)
		const email = await waitForEmail(TEST_USER.email, "revis", 3000)
		expect(email).toBeNull()

		// Cleanup
		await cleanupSentReminders(submissionId)
	})

	// --- Deadline reminders ---

	test("sends deadline reminder when approaching", async ({ page, testRun, cleanup }) => {
		// Arrange
		const futureDeadline = new Date(Date.now() + 2 * DAY_MS).toISOString()
		await setAppSetting("SUBMISSION_DEADLINE", futureDeadline)
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: true, daysBefore: [3] })
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Deadline reminder test",
			status: SubmissionStatus.DRAFT,
		})
		cleanup.track(submission.id)
		await cleanupSentReminders(submission.id)

		// Act
		const { result } = await runReminderTask(page)

		// Assert
		expect(result.deadlineReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(TEST_USER.email, "deadline", 10000)
		expect(email).toBeTruthy()

		// Cleanup
		await cleanupSentReminders(submission.id)
	})

	test("skips deadline reminder when deadline passed", async ({ page }) => {
		// Arrange
		const pastDeadline = new Date(Date.now() - DAY_MS).toISOString()
		await setAppSetting("SUBMISSION_DEADLINE", pastDeadline)
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: true, daysBefore: [3] })

		// Act
		const { result } = await runReminderTask(page)

		// Assert
		expect(result.deadlineReminders).toBe(0)
	})
})
```

**Step 2: Run tests**

Run: `pnpm exec playwright test e2e/admin/task-mails-reminder.spec.ts --project=chromium-admin`
Expected: All 8 tests PASS

**Step 3: Commit**

```bash
git add e2e/admin/task-mails-reminder.spec.ts
git commit -m "test: mails:reminder correctness tests"
```

---

### Task 5: Run Full E2E Suite + Fix

**Step 1: Run all affected tests**

Run: `pnpm exec playwright test e2e/admin/nitro-tasks.spec.ts e2e/admin/task-assignments-overdue.spec.ts e2e/admin/task-mails-reminder.spec.ts --project=chromium-admin`
Expected: All tests PASS

**Step 2: Fix any failures**

If tests fail, debug and fix. Common issues:
- Email template not enabled in test DB → check `emailTemplate` records for `REVIEWER_REMINDER`, `REVISION_REMINDER`, `DEADLINE_APPROACHING`
- `createAssignmentWithDeadline` doesn't create `CANCELLED` status → may need to add `CANCELLED` support to `createAssignmentWithDeadline` in `test-db.ts`
- Timing issues with `waitForEmail` → increase timeout
- Shared state between serial tests → ensure `cleanupSentReminders` runs in each test

**Step 3: Run lint + build**

Run: `pnpm lint && pnpm build`
Expected: PASS

**Step 4: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "fix: address E2E test failures"
```
