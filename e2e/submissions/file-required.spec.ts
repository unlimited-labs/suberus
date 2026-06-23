import path from "path";
import {
	SubmissionStatus,
	SubmissionType,
} from "../../src/generated/prisma/enums";
import {
	createSubmission,
	createSubmissionWithFile,
} from "../helpers/test-db";
import { expect, test, VALID_SUBMISSION } from "./fixtures";

const FIXTURES_DIR = path.resolve("e2e/submissions/fixtures");

test.describe.serial("File requirement", () => {
	test("cannot submit a Full Paper without a file", async ({
		submissionPage,
		testRun,
	}) => {
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");
		await submissionPage.fillTitle(`${testRun.testRunId}_No File Paper`);
		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);

		// No file attached → the submit must not go through.
		await submissionPage.submitButton.click();

		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeHidden();
		await expect(submissionPage.page).toHaveURL(/\/submissions\/new/);
	});

	test("uploading then removing the file still blocks submit", async ({
		submissionPage,
		testRun,
	}) => {
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");
		await submissionPage.fillTitle(`${testRun.testRunId}_Upload Remove Paper`);
		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);

		// Upload a valid file...
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.pdf"));
		await expect(
			submissionPage.page.getByText("document.pdf"),
		).toBeVisible();

		// ...then remove it before submitting.
		await submissionPage.page.getByTestId("remove-file-button").click();
		await expect(
			submissionPage.page.getByText("document.pdf"),
		).toBeHidden();

		await submissionPage.submitButton.click();

		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeHidden();
		await expect(submissionPage.page).toHaveURL(/\/submissions\/new/);
	});

	test("a spoofed file that slips past the client filter can be removed, then submit is blocked", async ({
		submissionPage,
		testRun,
	}) => {
		await submissionPage.goto();
		await submissionPage.selectType("FULL_PAPER");
		await submissionPage.fillTitle(`${testRun.testRunId}_Spoofed Remove Paper`);
		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);

		// spoofed.pdf has a valid .pdf name but invalid content — the client accepts it.
		const fileInput = submissionPage.page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "spoofed.pdf"));
		await expect(submissionPage.page.getByText("spoofed.pdf")).toBeVisible();

		// Remove it before submitting → no file remains.
		await submissionPage.page.getByTestId("remove-file-button").click();
		await expect(submissionPage.page.getByText("spoofed.pdf")).toBeHidden();

		await submissionPage.submitButton.click();

		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeHidden();
		await expect(submissionPage.page).toHaveURL(/\/submissions\/new/);
	});

	test("a FILE draft saved without a file cannot be submitted from edit", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Fileless FILE Draft",
			type: SubmissionType.FULL_PAPER,
			status: SubmissionStatus.DRAFT,
			keywords: ["alpha", "beta", "gamma"],
		});
		cleanup.track(id);

		await page.goto(`/submissions/${id}/edit`);
		await expect(page.getByLabel("Title")).toBeVisible({ timeout: 10000 });

		// No file was ever attached → submit must not go through.
		await page.getByRole("button", { name: "Submit" }).click();

		await expect(page.getByText("Submission submitted")).toBeHidden();
		await expect(page).toHaveURL(/\/edit/);
	});

	test("editing a FILE draft and submitting keeps the existing file (no re-upload)", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow();
		const { id } = await createSubmissionWithFile({
			testRunId: testRun.testRunId,
			title: "FILE Draft With File",
			status: SubmissionStatus.DRAFT,
			keywords: ["alpha", "beta", "gamma"],
		});
		cleanup.track(id);

		await page.goto(`/submissions/${id}/edit`);
		await expect(page.getByLabel("Title")).toBeVisible({ timeout: 10000 });

		// Change metadata only — the existing file must be preserved, not required again.
		await page.getByLabel("Title").fill(`${testRun.testRunId}_Edited FILE Draft`);
		await page.getByRole("button", { name: "Submit" }).click();

		// Submits successfully and the original file survives the edit.
		await expect(page).toHaveURL(/\/submissions\/[a-f0-9-]+$/, {
			timeout: 30000,
		});
		await expect(page.getByTestId("file-download-button")).toBeVisible({
			timeout: 10000,
		});
	});

	test("a revision requires a new file before it can be submitted", async ({
		page,
		testRun,
	}) => {
		const seeded = await createSubmissionWithFile({
			testRunId: testRun.testRunId,
			title: `${testRun.testRunId}_Revision File Required`,
			status: SubmissionStatus.REVISE_REQUIRED,
			fixturePath: "e2e/submissions/fixtures/document.pdf",
		});

		await page.goto(`/submissions/${seeded.id}/revise`);
		// Gate on the form rendering before asserting the button — the app-shell
		// session spinner can hold the page past the default 5s under parallel load.
		await expect(page.getByLabel("Title")).toBeVisible({ timeout: 10000 });

		const submitButton = page.getByRole("button", { name: "Submit Revision" });
		await expect(submitButton).toBeVisible();
		// A new file is mandatory even though a previous version already has one.
		await expect(submitButton).toBeDisabled();

		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(path.join(FIXTURES_DIR, "document.pdf"));
		await expect(page.getByText("document.pdf").first()).toBeVisible();

		await expect(submitButton).toBeEnabled();
	});
});
