import { test, expect } from "../helpers/base-fixtures";
import { createSubmissionWithReview, getPrisma } from "../helpers/test-db";
import {
	AssignmentStatus,
	ReviewDecision,
	SubmissionStatus,
} from "../../src/generated/prisma/enums";
import { REVIEWER_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

test.describe("Review Re-submit Blocked After Completion", () => {
	test("reviewer cannot re-submit review after assignment is completed", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { submissionId, assignmentId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Review Resubmit Blocked Test",
			reviewDecision: ReviewDecision.ACCEPT,
		});
		cleanup.track(submissionId);

		const db = getPrisma();
		const assignment = await db.reviewAssignment.findUnique({
			where: { id: assignmentId },
			select: { status: true },
		});
		expect(assignment?.status).toBe(AssignmentStatus.COMPLETED);

		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto(`/reviews/${assignmentId}`);

		// Assert — form is in read-only "View Review" mode
		await expect(page.getByRole("heading", { name: "View Review", level: 1 })).toBeVisible({ timeout: 10000 });

		await expect(page.getByRole("button", { name: /Reject Recommends rejection/i })).toBeDisabled();
		await expect(page.getByRole("button", { name: /Accept Recommends accepting/i })).toBeDisabled();

		await expect(page.getByRole("textbox", { name: "Review Comments" })).toBeDisabled();

		await expect(page.getByRole("button", { name: "Submit Review" })).not.toBeVisible();

		const review = await db.review.findFirst({
			where: { assignmentId },
			select: { decision: true },
		});
		expect(review?.decision).toBe(ReviewDecision.ACCEPT);

		const submission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true },
		});
		expect(submission?.status).toBe(SubmissionStatus.AWAITING_DECISION);
	});
});
