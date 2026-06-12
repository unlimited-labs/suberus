import { test, expect } from "./fixtures";
import { createSubmission } from "../helpers/test-db";
import { skipOnMobile } from "../helpers/skip-on-mobile";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

test.describe("Author - My Submissions List", () => {
	test("displays submissions page with New Submission button", async ({ page }) => {
		// Arrange
		await page.goto("/submissions");

		// Assert
		await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
		await expect(page.getByRole("link", { name: "New Submission", exact: true })).toBeVisible();
	});

	test("shows empty state or submissions list after loading", async ({ page }) => {
		// Arrange
		await page.goto("/submissions");

		// Assert - page heading should be visible (wait for page load)
		await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible({ timeout: 10000 });
	});

	test("clicking New Submission navigates to form", async ({ page }) => {
		// Arrange
		await page.goto("/submissions");

		// Act
		await page.getByRole("link", { name: "New Submission", exact: true }).click();
		await page.waitForURL("/submissions/new", { timeout: 15000 });

		// Assert
		await expect(page.getByLabel("Title")).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Author - Submission Detail View", () => {
	test("can view submission detail", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author View Detail Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByText(title)).toBeVisible();
	});

	test("submission detail shows tabs (Overview, History)", async ({ page, testRun, cleanup }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		skipOnMobile(testInfo);

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author View Tabs Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}`);

		// Assert
		await expect(page.getByRole("tab", { name: /Overview/i })).toBeVisible();
		await expect(page.getByRole("tab", { name: /History/i })).toBeVisible();
	});

	test("submission detail shows status", async ({ page, testRun, cleanup }, testInfo) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author View Status Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}`);

		// Assert
		if (testInfo.project.name.includes("mobile")) {
			const mobileSidebar = page.locator('[data-testid="submission-sidebar"]');
			await expect(mobileSidebar.getByTestId("submission-status")).toBeVisible();
		} else {
			await expect(page.getByTestId("submission-status").first()).toBeVisible();
		}
	});

	test("author info is visible in Overview tab", async ({ page, testRun, cleanup }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		skipOnMobile(testInfo);

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author View Authors Test",
			status: SubmissionStatus.SUBMITTED,
			withAuthor: true,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}`);

		// Assert - author name should be visible
		await expect(page.getByText("Test Author")).toBeVisible();
	});

	test("can switch to History tab and see status history", async ({ page, testRun, cleanup }, testInfo) => {
		// Skip on mobile - tabs may be displayed differently
		skipOnMobile(testInfo);

		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author View History Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}`);
		await page.getByRole("tab", { name: /History/i }).click();

		// Assert
		await expect(page.getByText(/Submitted/i).first()).toBeVisible();
	});

	test("back button navigates to submissions list", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author View Back Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Act
		await page.goto(`/submissions/${id}`);
		await page.getByRole("link", { name: /Back/i }).click();
		await page.waitForURL("/submissions");

		// Assert
		await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
	});

	test("submission appears in list", async ({ page, testRun, cleanup }, testInfo) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Author View List Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Act
		await page.goto("/submissions");

		// Assert
		if (testInfo.project.name.includes("mobile")) {
			const mobileCards = page.locator(".md\\:hidden");
			await expect(mobileCards.getByText(title)).toBeVisible({ timeout: 15000 });
		} else {
			await expect(page.getByText(title).first()).toBeVisible({ timeout: 15000 });
		}
	});
});
