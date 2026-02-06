import { test, expect, createSubmissionWithAssignment } from "./fixtures";

// Tests use reviewer storageState from playwright.config.ts

test.describe("Reviewer - My Assignments Page", () => {
	test("displays reviews heading", async ({ reviewerAssignmentsPage, page }) => {
		// Arrange & Act
		await reviewerAssignmentsPage.goto();

		// Assert
		await expect(page.getByRole("heading", { name: /Reviews/i })).toBeVisible();
	});

	test("shows assigned submission in list", async ({ reviewerAssignmentsPage, page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer List Test Submission",
		});
		cleanup.track(submissionId);

		// Act
		await reviewerAssignmentsPage.goto();

		// Assert
		await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Reviewer - Review Form", () => {
	test("review form displays submission title", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Form Title Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });

		// Act
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert
		await expect(page.getByText(title).first()).toBeVisible();
	});

	test("review form shows all required sections", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Form Sections Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });

		// Act
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert
		await expect(page.getByRole("heading", { name: "Decision" })).toBeVisible();
		await expect(page.getByText("Comments to Authors")).toBeVisible();
		await expect(page.getByText("Private Notes")).toBeVisible();
		await expect(page.getByRole("button", { name: "Submit Review" })).toBeVisible();
	});

	test("review form shows progress indicators on desktop", async ({ page, reviewerAssignmentsPage, testRun, cleanup }, testInfo) => {
		// Skip on mobile - progress sidebar is hidden
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Progress Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });

		// Act
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert
		await expect(page.getByRole("heading", { name: "Review Progress", exact: true })).toBeVisible();
	});

	test("review form shows review guidelines on desktop", async ({ page, reviewerAssignmentsPage, testRun, cleanup }, testInfo) => {
		// Skip on mobile - guidelines sidebar is hidden
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Guidelines Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });

		// Act
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert - look for the sidebar heading, not the submission title
		await expect(page.getByRole("heading", { name: "Review Guidelines", exact: true })).toBeVisible();
	});

	test("can select different decision options", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Decision Options Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
		await expect(page.getByRole("heading", { name: "Decision", exact: true })).toBeVisible({ timeout: 10000 });

		// Act & Assert - select each decision
		await reviewFormPage.selectDecision("Accept");
		await reviewFormPage.selectDecision("Reject");
		await reviewFormPage.selectDecision("Revise and Resubmit");
	});

	test("submit button disabled without comments", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Submit Button Disabled Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert - submit should be disabled without comments
		await expect(reviewFormPage.submitButton).toBeDisabled();
	});

	test("submit button enabled with valid comments", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Submit Button Enabled Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
		await expect(reviewFormPage.commentsInput).toBeVisible({ timeout: 10000 });

		// Act - fill comments with minimum required characters
		const commentsField = page.getByRole("textbox", { name: "Review Comments" });
		await commentsField.click();
		await commentsField.pressSequentially(
			"This is a well-structured submission that presents interesting findings with sound methodology.",
			{ delay: 5 }
		);

		// Assert - character count should update
		await expect(page.locator("span").filter({ hasText: /^\d{2,} characters$/ })).toBeVisible({ timeout: 5000 });
	});

	test("shows character count for comments", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Character Count Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act
		const commentsField = page.getByRole("textbox", { name: "Review Comments" });
		await commentsField.click();
		await commentsField.pressSequentially("Short comment", { delay: 5 });

		// Assert
		await expect(page.getByText(/characters \(min\. 50 required\)/)).toBeVisible();
	});

	test("can fill private notes", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Private Notes Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act
		await reviewFormPage.fillPrivateNotes("Confidential notes for editors only.");

		// Assert
		await expect(reviewFormPage.privateNotesInput).toHaveValue("Confidential notes for editors only.");
	});

	test("back button navigates to reviews list", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Back Button Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act
		await reviewFormPage.backButton.click();

		// Assert
		await page.waitForURL("/reviews");
	});
});

test.describe("Reviewer - Scoring", () => {
	// ABSTRACT type uses ORAL_PRESENTATION config which has enableScoring: true

	test("shows scoring criteria for ABSTRACT submission type", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Scoring Criteria Test",
		});
		cleanup.track(submissionId);
		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });

		// Act
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert
		await expect(page.getByText("Evaluation Criteria")).toBeVisible();
		await expect(page.getByText(/Novelty/i)).toBeVisible();
		await expect(page.getByText(/Methodology/i)).toBeVisible();
		await expect(page.getByText(/Clarity/i)).toBeVisible();
		await expect(page.getByText(/Relevance/i)).toBeVisible();
		await expect(page.getByRole("heading", { name: "Confidence Level" })).toBeVisible();
	});

	test("can set scores using buttons", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Score Buttons Test",
		});
		cleanup.track(submissionId);
		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
		await expect(page.getByText("Evaluation Criteria")).toBeVisible();

		// Act
		const scoreButton = page.getByRole("button", { name: "4", exact: true }).first();
		await scoreButton.click();

		// Assert
		await expect(scoreButton).toHaveClass(/bg-primary/);
	});
});

test.describe("Reviewer - Double-blind Mode", () => {
	// ABSTRACT type uses ORAL_PRESENTATION config which has reviewMode: DOUBLE_BLIND

	test("hides author information in double-blind mode", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Double Blind Test",
		});
		cleanup.track(submissionId);
		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });

		// Act
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert
		await expect(page.getByText(/Double-blind review.*author information hidden/i)).toBeVisible();
		await expect(page.locator('[data-slot="card-title"]').filter({ hasText: "Authors" })).not.toBeVisible();
	});
});
