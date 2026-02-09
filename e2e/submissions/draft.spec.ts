import { test, expect } from "./fixtures";
import { createSubmission } from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

test.describe("Draft Creation", () => {
	test("saves draft from new submission form", async ({
		page,
		submissionPage,
		uniqueSubmission,
	}) => {
		test.slow();
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.fillCompleteForm(uniqueSubmission);
		await submissionPage.saveDraftButton.click();

		// Assert - redirect to detail page with Draft badge
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 60000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Draft");
	});

	test("draft is visible in submissions list", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft List Test",
			status: SubmissionStatus.DRAFT,
		});
		cleanup.track(id);

		// Act
		await page.goto("/submissions");

		// Assert
		await expect(page.locator("main")).toContainText(title, { timeout: 10000 });
	});

	test("saves draft with auto-filled author data", async ({
		page,
		submissionPage,
		uniqueSubmission,
	}) => {
		test.slow();
		// Arrange
		await submissionPage.goto();

		// Act - fill content + keywords, rely on auto-filled first author from session
		await submissionPage.selectType(uniqueSubmission.type);
		await submissionPage.fillTitle(uniqueSubmission.title);
		await submissionPage.fillContent(uniqueSubmission.content);
		await submissionPage.fillAffiliation(0, uniqueSubmission.authors[0].affiliationName);
		for (const keyword of uniqueSubmission.keywords) {
			await submissionPage.addKeyword(keyword);
		}
		await submissionPage.saveDraftButton.click();

		// Assert
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 60000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Draft");
	});
});

test.describe("Draft - Skips Validation", () => {
	test("saves draft with incomplete form (no content, no keywords)", async ({
		page,
		submissionPage,
		testRun,
	}) => {
		test.slow();
		// Arrange
		await submissionPage.goto();

		// Act - fill only type and short title, skip content and keywords
		await submissionPage.selectType("ABSTRACT");
		await submissionPage.fillTitle(`${testRun.testRunId}_Incomplete Draft`);
		await submissionPage.fillAffiliation(0, "Test University");
		await submissionPage.saveDraftButton.click();

		// Assert - should save successfully despite missing content/keywords
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 60000 });
		await expect(
			page.locator('[data-testid="submission-status"]').first(),
		).toContainText("Draft");
	});

	test("save draft on edit page with invalid data succeeds", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow();
		// Arrange - create a valid draft
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft Validation Bypass",
			status: SubmissionStatus.DRAFT,
			keywords: ["kw1", "kw2", "kw3"],
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}/edit`);
		await expect(page.getByLabel("Title")).toBeVisible({ timeout: 10000 });

		// Act - clear content (making it too short) and save draft
		await page.getByLabel("Abstract").fill("Short");
		await page.getByRole("button", { name: "Save Draft" }).click();

		// Assert - should save despite invalid content length
		await expect(page.locator("[data-sonner-toast]")).toContainText("Draft saved", { timeout: 15000 });
		await expect(page).toHaveURL(/\/submissions\/[a-f0-9-]+$/, { timeout: 30000 });
	});

	test("submit with incomplete form shows validation error", async ({
		page,
		submissionPage,
		testRun,
	}) => {
		test.slow();
		// Arrange
		await submissionPage.goto();

		// Act - fill only type and short title, then submit
		await submissionPage.selectType("ABSTRACT");
		await submissionPage.fillTitle(`${testRun.testRunId}_Incomplete Submit`);
		await submissionPage.fillAffiliation(0, "Test University");
		await submissionPage.submitButton.click();

		// Assert - should show validation error, NOT redirect
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 15000 });
		await expect(page).toHaveURL(/\/submissions\/new/);
	});
});

test.describe("Draft Detail View - Actions Card", () => {
	test("shows Continue Editing and Submit buttons for DRAFT", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft Actions Test",
			status: SubmissionStatus.DRAFT,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(
			page.getByRole("button", { name: "Continue Editing" })
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
	});

	test("Submit button transitions DRAFT to SUBMITTED", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft Submit Test",
			status: SubmissionStatus.DRAFT,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Submit" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText(
			"Submitted",
			{ timeout: 10000 }
		);
	});

	test("Continue Editing navigates to edit page", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft Continue Edit Test",
			status: SubmissionStatus.DRAFT,
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Continue Editing" }).click();

		// Assert
		await page.waitForURL(/\/submissions\/[a-f0-9-]+\/edit/, { timeout: 10000 });
	});
});

test.describe("Edit Page", () => {
	test("edit page loads with existing data pre-filled", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Prefill Test",
			status: SubmissionStatus.DRAFT,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}/edit`);

		// Assert
		await expect(page.getByLabel("Title")).toHaveValue(title, { timeout: 10000 });
		await expect(page.getByLabel("Abstract")).not.toBeEmpty();
	});

	test("edit page allows saving changes to draft", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow();
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Edit Save Test",
			status: SubmissionStatus.DRAFT,
			keywords: ["test-kw1", "test-kw2", "test-kw3"],
		});
		cleanup.track(id);
		await page.goto(`/submissions/${id}/edit`);
		await expect(page.getByLabel("Title")).toBeVisible({ timeout: 10000 });

		// Act - modify title and save
		const newTitle = `${testRun.testRunId}_Updated Draft Title`;
		await page.getByLabel("Title").fill(newTitle);
		await page.getByRole("button", { name: "Save Draft" }).click();

		// Assert - wait for redirect to detail page (not edit page)
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 15000 });
		await expect(page).toHaveURL(/\/submissions\/[a-f0-9-]+$/, { timeout: 30000 });
		await expect(page.getByText(newTitle).first()).toBeVisible({ timeout: 10000 });
	});

	test("edit page for SUBMITTED shows Submit (not Save Draft)", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Submitted Edit Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}/edit`);

		// Assert
		await expect(page.getByRole("button", { name: "Submit" })).toBeVisible({ timeout: 10000 });
		await expect(page.getByRole("button", { name: "Save Draft" })).not.toBeVisible();
	});

	test("edit page shows error for non-editable status", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Non Editable Test",
			status: SubmissionStatus.UNDER_REVIEW,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}/edit`);

		// Assert
		await expect(page.getByText("Cannot Edit")).toBeVisible({ timeout: 10000 });
	});
});
