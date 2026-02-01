import { test, expect } from "./fixtures";
import { createSubmissionWithAssignment, deleteSubmission } from "../helpers/test-db";

// Tests use reviewer storageState from playwright.config.ts

test.describe("Reviewer - My Assignments Page", () => {
	test("displays reviews heading", async ({ reviewerAssignmentsPage, page }) => {
		// Arrange - just navigate
		await reviewerAssignmentsPage.goto();

		// Assert
		await expect(page.getByRole("heading", { name: /Reviews/i })).toBeVisible();
	});

	test("shows assigned submission in list", async ({ reviewerAssignmentsPage, page }) => {
		// Arrange - create submission with assignment
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Reviewer List Test Submission",
		});

		try {
			await reviewerAssignmentsPage.goto();

			// Assert
			await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Reviewer - Review Form", () => {
	test("review form displays submission title", async ({ page, reviewerAssignmentsPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Review Form Title Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });

			// Act
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

			// Assert
			await expect(page.getByText(title).first()).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("review form shows all required sections", async ({ page, reviewerAssignmentsPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Review Form Sections Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });

			// Act
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert
			await expect(page.getByRole("heading", { name: "Decision" })).toBeVisible();
			await expect(page.getByText("Comments to Authors")).toBeVisible();
			await expect(page.getByText("Private Notes")).toBeVisible();
			await expect(page.getByRole("button", { name: "Submit Review" })).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("review form shows progress indicators on desktop", async ({ page, reviewerAssignmentsPage }, testInfo) => {
		// Skip on mobile - progress sidebar is hidden
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Review Progress Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });

			// Act
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert
			await expect(page.getByRole("heading", { name: "Review Progress", exact: true })).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("review form shows review guidelines on desktop", async ({ page, reviewerAssignmentsPage }, testInfo) => {
		// Skip on mobile - guidelines sidebar is hidden
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Review Guidelines Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });

			// Act
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert - look for the sidebar heading, not the submission title
			await expect(page.getByRole("heading", { name: "Review Guidelines", exact: true })).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("can select different decision options", async ({ page, reviewerAssignmentsPage, reviewFormPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Decision Options Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");
			await expect(page.getByRole("heading", { name: "Decision", exact: true })).toBeVisible({ timeout: 10000 });

			// Act & Assert - select each decision
			await reviewFormPage.selectDecision("Accept");
			await reviewFormPage.selectDecision("Reject");
			await reviewFormPage.selectDecision("Revise and Resubmit");
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("submit button disabled without comments", async ({ page, reviewerAssignmentsPage, reviewFormPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Submit Button Disabled Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert - submit should be disabled without comments
			await expect(reviewFormPage.submitButton).toBeDisabled();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("submit button enabled with valid comments", async ({ page, reviewerAssignmentsPage, reviewFormPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Submit Button Enabled Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");
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
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("shows character count for comments", async ({ page, reviewerAssignmentsPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Character Count Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Act
			const commentsField = page.getByRole("textbox", { name: "Review Comments" });
			await commentsField.click();
			await commentsField.pressSequentially("Short comment", { delay: 5 });

			// Assert
			await expect(page.getByText(/characters \(min\. 50 required\)/)).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("can fill private notes", async ({ page, reviewerAssignmentsPage, reviewFormPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Private Notes Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Act
			await reviewFormPage.fillPrivateNotes("Confidential notes for editors only.");

			// Assert
			await expect(reviewFormPage.privateNotesInput).toHaveValue("Confidential notes for editors only.");
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("back button navigates to reviews list", async ({ page, reviewerAssignmentsPage, reviewFormPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Back Button Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Act
			await reviewFormPage.backButton.click();

			// Assert
			await page.waitForURL("/reviews");
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Reviewer - Scoring", () => {
	// ABSTRACT type uses ORAL_PRESENTATION config which has enableScoring: true

	test("shows scoring criteria for ABSTRACT submission type", async ({ page, reviewerAssignmentsPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Scoring Criteria Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });

			// Act
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert - scoring is enabled for ABSTRACT/ORAL_PRESENTATION
			await expect(page.getByText("Evaluation Criteria")).toBeVisible();
			await expect(page.getByText(/Novelty/i)).toBeVisible();
			await expect(page.getByText(/Methodology/i)).toBeVisible();
			await expect(page.getByText(/Clarity/i)).toBeVisible();
			await expect(page.getByText(/Relevance/i)).toBeVisible();
			await expect(page.getByRole("heading", { name: "Confidence Level" })).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("can set scores using buttons", async ({ page, reviewerAssignmentsPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Score Buttons Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");
			await expect(page.getByText("Evaluation Criteria")).toBeVisible();

			// Act - click score 4 for Novelty (first of the "4" buttons)
			const scoreButton = page.getByRole("button", { name: "4", exact: true }).first();
			await scoreButton.click();

			// Assert - button should be selected (has primary background)
			await expect(scoreButton).toHaveClass(/bg-primary/);
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Reviewer - Double-blind Mode", () => {
	// ABSTRACT type uses ORAL_PRESENTATION config which has reviewMode: DOUBLE_BLIND

	test("hides author information in double-blind mode", async ({ page, reviewerAssignmentsPage }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Double Blind Test",
		});

		try {
			await reviewerAssignmentsPage.goto();
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });

			// Act
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert - double-blind mode shows message and hides author section
			await expect(page.getByText(/Double-blind review.*author information hidden/i)).toBeVisible();
			await expect(page.locator('[data-slot="card-title"]').filter({ hasText: "Authors" })).not.toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});
