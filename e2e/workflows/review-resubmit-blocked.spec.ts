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
		test.slow();

		// Arrange - create submission with completed review (AWAITING_DECISION)
		const { submissionId, assignmentId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Review Resubmit Blocked Test",
			reviewDecision: ReviewDecision.ACCEPT,
		});
		cleanup.track(submissionId);

		// Verify assignment is COMPLETED
		const db = getPrisma();
		const assignment = await db.reviewAssignment.findUnique({
			where: { id: assignmentId },
			select: { status: true },
		});
		expect(assignment?.status).toBe(AssignmentStatus.COMPLETED);

		// Act - reviewer navigates to review form
		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto(`/reviews/${assignmentId}`);

		// The review form should show the existing review but prevent re-submission.
		// Check that form loads (reviewer can view their submitted review)
		await expect(page.getByRole("heading", { name: "Decision", exact: true })).toBeVisible({ timeout: 10000 });

		// Change decision to REJECT and try to submit
		await page.getByRole("button", { name: /Reject.*not meet/i }).click();

		const commentsField = page.getByRole("textbox", { name: "Review Comments" });
		await commentsField.click();
		await commentsField.fill(
			"Changed my mind — this work does not meet the required standards for publication.",
		);

		await page.getByRole("button", { name: "Submit Review" }).click();

		// Assert - submission fails silently (no navigation to /reviews)
		await page.waitForTimeout(3000);
		await expect(page).not.toHaveURL("/reviews");

		// Verify the original review decision is unchanged in DB
		const review = await db.review.findFirst({
			where: { assignmentId },
			select: { decision: true },
		});
		expect(review?.decision).toBe(ReviewDecision.ACCEPT);

		// Verify submission status is still AWAITING_DECISION (not changed to REJECTED)
		const submission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true },
		});
		expect(submission?.status).toBe(SubmissionStatus.AWAITING_DECISION);
	});
});
