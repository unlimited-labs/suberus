import path from "path";
import { type SubmissionPage, test, expect, VALID_SUBMISSION } from "./fixtures";

const FIXTURES_DIR = path.resolve("e2e/submissions/fixtures");

test.describe.serial("File Upload", () => {
	test("FileDropzone visible for Full Paper", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.selectType("FULL_PAPER");

		// Assert
		await expect(
			submissionPage.page.getByText("Drop file or click to upload"),
		).toBeVisible();
		await expect(submissionPage.contentInput).not.toBeVisible({
			timeout: 5000,
		});
	});

	test("FileDropzone NOT visible for Poster", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.selectType("POSTER");

		// Assert
		await expect(
			submissionPage.page.getByText("Drop file or click to upload"),
		).not.toBeVisible();
		await expect(submissionPage.contentInput).toBeVisible();
	});

	test("FileDropzone NOT visible for Oral Presentation", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.selectType("ABSTRACT");

		// Assert
		await expect(
			submissionPage.page.getByText("Drop file or click to upload"),
		).not.toBeVisible();
		await expect(submissionPage.contentInput).toBeVisible();
	});

	test("PDF rejected (Full Paper accepts DOCX only)", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");

		// Act
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.pdf"));

		// Assert - client rejects by extension; only DOCX is allowed
		await expect(
			submissionPage.page.getByText(/File type \.pdf not accepted/i),
		).toBeVisible();
	});

	test("valid DOCX accepted", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");

		// Act
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.docx"));

		// Assert
		await expect(
			submissionPage.page.getByText("document.docx"),
		).toBeVisible();
	});

	test("invalid DOCM rejected", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");

		// Act
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.docm"));

		// Assert
		await expect(
			submissionPage.page.getByText(/File type \.docm not accepted/i),
		).toBeVisible();
	});

	test("invalid TXT rejected", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");

		// Act
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.txt"));

		// Assert
		await expect(
			submissionPage.page.getByText(/File type \.txt not accepted/i),
		).toBeVisible();
	});

	test("full paper submission with file completes", async ({
		submissionPage,
		testRun,
	}) => {
		test.slow();

		// Arrange
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");
		await submissionPage.fillTitle(
			`${testRun.testRunId}_File Upload Test Paper`,
		);

		// Upload DOCX
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.docx"));
		await expect(
			submissionPage.page.getByText("document.docx"),
		).toBeVisible();

		// Fill author
		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);

		// Add keywords
		await submissionPage.addKeyword("file-upload-test");
		await submissionPage.addKeyword("e2e");
		await submissionPage.addKeyword("pdf");

		// Act
		await submissionPage.submit();

		// Assert - wait for success toast (doesn't depend on load event)
		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeVisible({ timeout: 60000 });
	});

	test("uploaded file visible on detail page", async ({
		submissionPage,
		testRun,
	}) => {
		test.slow();
		// Arrange - create full paper with file
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");
		await submissionPage.fillTitle(
			`${testRun.testRunId}_File Detail Visibility`,
		);

		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.docx"));

		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);
		await submissionPage.addKeyword("file-detail");
		await submissionPage.addKeyword("visibility");
		await submissionPage.addKeyword("test");

		// Act - submit
		await submissionPage.submit();

		// Assert - file info visible on detail page (doesn't depend on load event)
		await expect(
			submissionPage.page.getByText("document.docx"),
		).toBeVisible({ timeout: 60000 });
		await expect(
			submissionPage.page.getByTestId("file-download-button"),
		).toBeVisible();
	});

	test("text submission shows no file section", async ({
		submissionPage,
		uniqueSubmission,
	}) => {
		test.slow();
		// Arrange - create text submission
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);

		// Act
		await submissionPage.submit();

		// Assert - wait for detail page then check no file section
		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeVisible({ timeout: 60000 });
		await expect(
			submissionPage.page.getByTestId("file-download-button"),
		).not.toBeVisible();
	});
});

/**
 * Security: the client `accept` filter only checks the file name extension, so
 * a malicious file named `.docx` slips past it. The server must reject by magic
 * number (real content), not by the forgeable name/mime. These tests upload
 * spoofed files that the client accepts but the server must refuse.
 */
test.describe.serial("File Upload — server-side magic-number validation", () => {
	async function submitSpoofedFile(
		submissionPage: SubmissionPage,
		testRunId: string,
		fixture: string,
	) {
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");
		await submissionPage.fillTitle(`${testRunId}_${fixture}`);

		// Client accepts it because the name ends in `.docx`
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, fixture));
		await expect(submissionPage.page.getByText(fixture)).toBeVisible();

		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);
		await submissionPage.addKeyword("security");
		await submissionPage.addKeyword("magic-number");
		await submissionPage.addKeyword("e2e");

		await submissionPage.submit();
	}

	test("rejects text content disguised as .docx", async ({
		submissionPage,
		testRun,
	}) => {
		test.slow();
		await submitSpoofedFile(submissionPage, testRun.testRunId, "spoofed.docx");

		// Server refused the upload despite the .pdf name; nothing was created.
		await expect(
			submissionPage.page.getByText(/unrecognized file format/i),
		).toBeVisible({ timeout: 60000 });
		await expect(submissionPage.page).toHaveURL(/\/submissions\/new/);
	});

	test("rejects an image disguised as .docx", async ({
		submissionPage,
		testRun,
	}) => {
		test.slow();
		await submitSpoofedFile(submissionPage, testRun.testRunId, "image.docx");

		// Server refused the upload despite the .pdf name; nothing was created.
		await expect(
			submissionPage.page.getByText(/is not allowed/i),
		).toBeVisible({ timeout: 60000 });
		await expect(submissionPage.page).toHaveURL(/\/submissions\/new/);
	});
});
