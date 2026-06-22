import path from "path";
import { test, expect, createSubmissionWithAssignment, addSubmissionVersions, seedNormalizedPdfVersions } from "./fixtures";

// Tests use reviewer storageState from playwright.config.ts

/** The file-redline seed normalizes via the docling + docx-api sidecars; skip when down. */
async function sidecarsHealthy(): Promise<boolean> {
	const urls = [process.env.DOCLING_URL, process.env.DOCX_API_URL];
	try {
		for (const url of urls) {
			if (!url) return false;
			const res = await fetch(`${url.replace(/\/+$/, "")}/`);
			if (!res.ok) return false;
		}
		return true;
	} catch {
		return false;
	}
}

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

		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

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

		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert — section titles are now shadcn CardTitle (data-slot), not headings.
		await expect(
			page.locator('[data-slot="card-title"]').filter({ hasText: "Decision" }),
		).toBeVisible();
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

		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: "Review Progress" })
				.first(),
		).toBeVisible();
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

		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert - look for the sidebar card title, not the submission title
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: "Review Guidelines" }),
		).toBeVisible();
	});

	test("can select different decision options", async ({ page, reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Decision Options Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.openReviewForm(title);
		await expect(
			page.locator('[data-slot="card-title"]').filter({ hasText: "Decision" }),
		).toBeVisible({ timeout: 10000 });

		// Act & Assert - select each decision
		await reviewFormPage.selectDecision("Accept");
		await reviewFormPage.selectDecision("Reject");
		await reviewFormPage.selectDecision("Revise and Resubmit");
	});

	test("submit button always visible on review form", async ({ reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Submit Button Visible Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert - submit button is visible (comments are optional)
		await expect(reviewFormPage.submitButton).toBeVisible();
	});

	test("can fill private notes", async ({ reviewerAssignmentsPage, reviewFormPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Private Notes Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.openReviewForm(title);

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

		await reviewerAssignmentsPage.openReviewForm(title);

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
		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert
		await expect(page.getByText("Evaluation Criteria")).toBeVisible();
		await expect(page.getByText("Originality")).toBeVisible();
		await expect(page.getByText("Clarity")).toBeVisible();
		await expect(page.getByText("Significance")).toBeVisible();
		await expect(page.getByText("Methodology")).toBeVisible();
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: "Confidence Level" }),
		).toBeVisible();
	});

	test("can set scores using buttons", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Score Buttons Test",
		});
		cleanup.track(submissionId);
		await reviewerAssignmentsPage.openReviewForm(title);
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
		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert
		await expect(page.getByText(/Double-blind review.*author information hidden/i)).toBeVisible();
		await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Authors$/ })).not.toBeVisible();
	});

	test("neutralizes the author-derived file name on the compare page", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		test.skip(!(await sidecarsHealthy()), "docling/docx-api sidecars not running");
		// Arrange — a double-blind submission whose files were stored under the
		// author's name (Firstname_Lastname.ext); the reviewer must never see it.
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Double Blind Filename Test",
		});
		cleanup.track(submissionId);
		await seedNormalizedPdfVersions(submissionId, [
			{ fixturePath: "e2e/reviews/fixtures/redline-v1.pdf", fileName: "Kowalski_Jan.pdf", title, content: "Mean grain size increased by twelve percent." },
			{ fixturePath: "e2e/reviews/fixtures/redline-v2.pdf", fileName: "Kowalski_Jan.pdf", title, content: "Mean grain size increased by fifteen percent." },
		]);

		// Act — open the reviewer compare page.
		await reviewerAssignmentsPage.openReviewForm(title);
		await page.getByTestId("reviewer-compare-link").click();
		await page.waitForURL(/\/compare/);

		// Assert — the attached-file rows show neutral names, never the surname.
		await expect(page.getByText("Kowalski")).toHaveCount(0);
		await expect(page.getByText(/v1\.pdf/)).toBeVisible();
		await expect(page.getByText(/v2\.pdf/)).toBeVisible();
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

		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert
		await expect(
			page.locator('[data-slot="card-title"]').filter({ hasText: "Attachment" }),
		).toBeVisible();
		await expect(page.getByText("Upload a PDF or DOCX file")).toBeVisible();
	});

	test("can upload a PDF attachment", async ({ page, reviewerAssignmentsPage, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Upload PDF Attachment Test",
		});
		cleanup.track(submissionId);

		await reviewerAssignmentsPage.openReviewForm(title);

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

		await reviewerAssignmentsPage.openReviewForm(title);

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

		await reviewerAssignmentsPage.openReviewForm(title);

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

		await reviewerAssignmentsPage.openReviewForm(title);

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

		await reviewerAssignmentsPage.openReviewForm(title);

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

		await reviewerAssignmentsPage.openReviewForm(title);

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

test.describe("Reviewer - Revision diff", () => {
	test("shows 'Changes since previous version' with a content redline", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		// Arrange — an assigned submission that has an earlier version to diff against.
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer Revision Diff Test",
		});
		cleanup.track(submissionId);
		await addSubmissionVersions(submissionId, [
			{
				title,
				content:
					"The model presents an approach to nucleation. Cooling at 45 C/s was sampled.",
			},
			{
				title,
				content:
					"The model proposes a novel approach to nucleation. Cooling at 30 C/s was sampled. A validation set was added.",
			},
		]);

		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert — the redline is always visible (no collapsible), with at least
		// one insertion and deletion.
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: "Changes since previous version" }),
		).toBeVisible();
		await expect(page.getByTestId("text-diff").first()).toBeVisible();
		await expect(page.getByTestId("diff-ins").first()).toBeVisible();
		await expect(page.getByTestId("diff-del").first()).toBeVisible();
	});

	test("Changes card + Compare link stay visible on a file-only revision", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		// Arrange — two versions with IDENTICAL title+content (e.g. only the file
		// changed). The card must still render so the reviewer can reach Compare.
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer File-Only Revision Test",
		});
		cleanup.track(submissionId);
		const sameContent = "Unchanged abstract text for both versions.";
		await addSubmissionVersions(submissionId, [
			{ title, content: sameContent },
			{ title, content: sameContent },
		]);

		await reviewerAssignmentsPage.openReviewForm(title);

		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: "Changes since previous version" }),
		).toBeVisible();
		await expect(page.getByTestId("reviewer-compare-link")).toBeVisible();
		await expect(page.getByText("Content unchanged.")).toBeVisible();
	});

	test("FILE submission shows a file-change notice + keyword diff, never 'Content unchanged.'", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		// Arrange — a FILE-format type (FULL_PAPER) whose two versions carry
		// different files and different keywords. The text body is irrelevant for
		// file submissions, so the panel must NOT diff it.
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer File Revision Diff Test",
			type: "FULL_PAPER",
		});
		cleanup.track(submissionId);
		const body = "File-based submission; the text body is not the source of truth.";
		await addSubmissionVersions(submissionId, [
			{
				title,
				content: body,
				keywords: ["nucleation"],
				file: { fileName: "v1.pdf" },
			},
			{
				title,
				content: body,
				keywords: ["nucleation", "validation"],
				file: { fileName: "v2.pdf" },
			},
		]);

		// Act
		await reviewerAssignmentsPage.openReviewForm(title);

		// Assert — the misleading text-content verdict must never appear for files.
		await expect(page.getByText("Content unchanged.")).toHaveCount(0);
		// The submission is clearly declared as file-based.
		await expect(page.getByTestId("submission-content-format")).toHaveText(
			"File submission",
		);
		// A file-change notice replaces the text diff.
		const notice = page.getByTestId("reviewer-file-change-notice");
		await expect(notice).toBeVisible();
		await expect(notice).toHaveAttribute("data-changed", "true");
		// Keyword changes surface in the main review window.
		await expect(
			page
				.getByTestId("keywords-diff")
				.locator('[data-diff-status="added"]'),
		).toContainText("validation");
		await expect(page.getByTestId("reviewer-compare-link")).toBeVisible();
	});

	test("no Changes card when there is no previous version", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer No Diff Test",
		});
		cleanup.track(submissionId);
		// Single version only → nothing to diff against.
		await addSubmissionVersions(submissionId, [
			{ title, content: "Only one version of this submission exists." },
		]);

		await reviewerAssignmentsPage.openReviewForm(title);
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: "Changes since previous version" }),
		).toHaveCount(0);
		await expect(page.getByTestId("reviewer-compare-link")).toHaveCount(0);
	});
});

test.describe("Reviewer - Compare page", () => {
	const twoVersions = (title: string) => [
		{
			title,
			content:
				"The model presents an approach to nucleation. Cooling at 45 C/s was sampled.",
		},
		{
			title,
			content:
				"The model proposes a novel approach to nucleation. Cooling at 30 C/s was sampled. A validation set was added.",
		},
	];

	test("opens the side-by-side compare page from the review form", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		// Arrange — assigned submission with two versions to compare.
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer Compare Page Test",
		});
		cleanup.track(submissionId);
		await addSubmissionVersions(submissionId, twoVersions(title));

		// Act — open the review form, follow the "Compare versions" link.
		await reviewerAssignmentsPage.openReviewForm(title);
		await page.getByTestId("reviewer-compare-link").click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+\/compare/);

		// Assert — side-by-side panels: deletions on the left, insertions on the right.
		await expect(page.getByTestId("diff-base-select")).toContainText("Version 1");
		await expect(page.getByTestId("diff-compare-select")).toContainText(
			"Version 2",
		);
		await expect(page.getByTestId("side-by-side-diff").first()).toBeVisible();
		await expect(
			page.getByTestId("diff-side-old").getByTestId("diff-del").first(),
		).toBeVisible();
		await expect(
			page.getByTestId("diff-side-new").getByTestId("diff-ins").first(),
		).toBeVisible();
	});

	test("switches between side-by-side and inline layouts", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer Compare Layout Test",
		});
		cleanup.track(submissionId);
		await addSubmissionVersions(submissionId, twoVersions(title));

		await reviewerAssignmentsPage.openReviewForm(title);
		await page.getByTestId("reviewer-compare-link").click();
		await page.waitForURL(/\/compare/);

		await expect(page.getByTestId("side-by-side-diff").first()).toBeVisible();

		await page.getByTestId("diff-layout-inline").click();
		await expect(page.getByTestId("text-diff").first()).toBeVisible();
		await expect(page.getByTestId("side-by-side-diff")).toHaveCount(0);
	});

	test("lets the reviewer pick a different base version", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer Compare Picker Test",
		});
		cleanup.track(submissionId);
		await addSubmissionVersions(submissionId, [
			{ title, content: "First version content alpha." },
			{ title, content: "Second version content beta." },
			{ title, content: "Third version content gamma." },
		]);

		await reviewerAssignmentsPage.openReviewForm(title);
		await page.getByTestId("reviewer-compare-link").click();
		await page.waitForURL(/\/compare/);

		// Default pair is previous -> current (v2 -> v3).
		await expect(page.getByTestId("diff-base-select")).toContainText("Version 2");

		// Switch the base picker to v1; the base picker updates to v1.
		await page.getByTestId("diff-base-select").click();
		await page.getByRole("option", { name: /Version 1/ }).click();
		await expect(page.getByTestId("diff-base-select")).toContainText("Version 1");
	});

	test("Compare link is hidden when there is only one version", async ({
		page,
		reviewerAssignmentsPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer Single Version Compare Test",
		});
		cleanup.track(submissionId);
		await addSubmissionVersions(submissionId, [
			{ title, content: "Only one version of this submission exists." },
		]);

		await reviewerAssignmentsPage.openReviewForm(title);
		await expect(page.getByTestId("reviewer-compare-link")).toHaveCount(0);
	});
});
