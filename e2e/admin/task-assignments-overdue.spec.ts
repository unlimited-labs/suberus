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

test.describe.serial("Task: assignments:overdue", () => {
	test("marks overdue PENDING assignment", async ({ page, testRun, cleanup }) => {
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Overdue PENDING",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		const { result } = await runOverdueTask(page)

		expect(result.overdue).toBeGreaterThanOrEqual(1)
		expect(await getAssignmentStatus(assignmentId)).toBe("OVERDUE")
	})

	test("skips assignment with future deadline", async ({ page, testRun, cleanup }) => {
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Future deadline",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 7 * DAY_MS),
		})
		cleanup.track(submissionId)

		await runOverdueTask(page)

		expect(await getAssignmentStatus(assignmentId)).toBe("PENDING")
	})

	test("skips COMPLETED assignment with past deadline", async ({ page, testRun, cleanup }) => {
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Completed past deadline",
			assignmentStatus: AssignmentStatus.COMPLETED,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		await runOverdueTask(page)

		expect(await getAssignmentStatus(assignmentId)).toBe("COMPLETED")
	})

	test("skips CANCELLED assignment with past deadline", async ({ page, testRun, cleanup }) => {
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Cancelled past deadline",
			assignmentStatus: AssignmentStatus.CANCELLED,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		await runOverdueTask(page)

		expect(await getAssignmentStatus(assignmentId)).toBe("CANCELLED")
	})

	test("idempotent — already-marked assignment stays OVERDUE", async ({ page, testRun, cleanup }) => {
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Idempotent test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() - DAY_MS),
		})
		cleanup.track(submissionId)

		await runOverdueTask(page)
		expect(await getAssignmentStatus(assignmentId)).toBe("OVERDUE")

		await runOverdueTask(page)

		expect(await getAssignmentStatus(assignmentId)).toBe("OVERDUE")
	})
})
