import path from "path";
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

	test("submit button always visible on review form", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Submit Button Visible Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert - submit button is visible (comments are optional)
		await expect(reviewFormPage.submitButton).toBeVisible();
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
		await expect(page.getByText("Originality")).toBeVisible();
		await expect(page.getByText("Clarity")).toBeVisible();
		await expect(page.getByText("Significance")).toBeVisible();
		await expect(page.getByText("Methodology")).toBeVisible();
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

test.describe("Reviewer - Attachment", () => {
	const FIXTURES_DIR = path.resolve("e2e/submissions/fixtures");

	test("shows attachment section on review form", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Attachment Section Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });

		// Act
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert
		await expect(page.getByRole("heading", { name: "Attachment", exact: true })).toBeVisible();
		await expect(page.getByText("Upload a PDF or DOCX file")).toBeVisible();
	});

	test("can upload a PDF attachment", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Upload PDF Attachment Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act - upload file
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.pdf"));

		// Assert - file name displayed
		await expect(page.getByText("document.pdf")).toBeVisible();
	});

	test("can upload a DOCX attachment", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Upload DOCX Attachment Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act - upload file
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.docx"));

		// Assert - file name displayed
		await expect(page.getByText("document.docx")).toBeVisible();
	});

	test("can remove uploaded attachment", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Remove Attachment Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act - upload then remove
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.pdf"));
		await expect(page.getByText("document.pdf")).toBeVisible();

		await page.getByRole("button", { name: "Remove file" }).click();

		// Assert - dropzone visible again
		await expect(page.getByText("Drop file or click to upload")).toBeVisible();
	});

	test("rejects invalid file type", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Invalid File Type Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act - upload invalid file type
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.txt"));

		// Assert - error message shown
		await expect(page.getByText(/not accepted/i)).toBeVisible();
	});

	test("can submit review without attachment", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Submit Without Attachment Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act - submit without attachment (attachment is optional)
		await reviewFormPage.selectDecision("Accept");

		// Assert - submit should work
		await reviewFormPage.submit();
		await page.waitForURL("/reviews");
	});

	test("can submit review with attachment", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Submit With Attachment Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.goto();
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Act - upload attachment and submit
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.pdf"));
		await expect(page.getByText("document.pdf")).toBeVisible();

		await reviewFormPage.selectDecision("Accept");
		await reviewFormPage.submit();

		// Assert - redirected to reviews list
		await page.waitForURL("/reviews");
	});
});
