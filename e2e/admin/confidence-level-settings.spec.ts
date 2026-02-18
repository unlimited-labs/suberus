import { test, expect, AdminSettingsPage } from "./fixtures";
import { getPrisma, setAppSetting, createSubmissionWithAssignment } from "../helpers/test-db";
import { deleteSubmission } from "../helpers/test-db";
import { loginAs } from "../helpers/auth";
import { REVIEWER_USER } from "../helpers/test-users";

test.describe.serial("Admin - Confidence Level", () => {
	let adminSettingsPage: AdminSettingsPage;
	let originalConfig: object | null = null;
	const trackedSubmissionIds: string[] = [];

	test.beforeAll(async () => {
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
		});
		originalConfig = (setting?.value as object) ?? null;
	});

	test.afterAll(async () => {
		// Restore original config
		if (originalConfig !== null) {
			const db = getPrisma();
			await db.appSetting.upsert({
				where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
				update: { value: originalConfig },
				create: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION", value: originalConfig },
			});
		}
		// Cleanup submissions
		for (const id of trackedSubmissionIds) {
			await deleteSubmission(id).catch(() => {});
		}
	});

	test("confidence level toggle visible in submission type accordion", async ({ page }, testInfo) => {
		// Arrange
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToTypesTab(testInfo);

		// Act
		await adminSettingsPage.expandSubmissionType("Oral Presentation");

		// Assert
		await expect(page.getByText("Enable confidence level")).toBeVisible();
		await expect(page.getByText("Reviewers rate their confidence")).toBeVisible();
	});

	test("can disable confidence level for a type", async ({ page }, testInfo) => {
		// Arrange
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToTypesTab(testInfo);
		await adminSettingsPage.expandSubmissionType("Oral Presentation");

		// Act
		const toggle = adminSettingsPage.getEnableConfidenceLevelSwitch();
		await toggle.click();
		await adminSettingsPage.saveSubmissionType();

		// Assert
		await expect(
			page.getByText(/"Oral Presentation" settings saved/i),
		).toBeVisible({ timeout: 5000 });
	});

	test("setting persists after reload", async ({ page }, testInfo) => {
		// Arrange
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToTypesTab(testInfo);

		// Act
		await adminSettingsPage.expandSubmissionType("Oral Presentation");

		// Assert
		const toggle = adminSettingsPage.getEnableConfidenceLevelSwitch();
		await expect(toggle).toBeVisible();
	});

	test("review form hides confidence when disabled", async ({ page }, testInfo) => {
		// Skip on mobile - review form tests only need desktop
		test.skip(testInfo.project.name === "mobile-admin", "Review form tested on desktop only");

		// Arrange - ensure disabled via DB (serial, previous test disabled it)
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
		});
		const config = setting?.value as Record<string, unknown>;
		await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
			...config,
			enableConfidenceLevel: false,
		});

		const { submissionId, assignmentId } = await createSubmissionWithAssignment({
			title: "Confidence Hidden Test",
		});
		trackedSubmissionIds.push(submissionId);

		// Act - login as reviewer
		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto(`/reviews/${assignmentId}`);
		await expect(page.getByRole("button", { name: "Submit Review" })).toBeVisible({ timeout: 15000 });

		// Assert
		await expect(page.getByRole("heading", { name: "Confidence Level" })).not.toBeVisible();
	});

	test("review form shows confidence when enabled", async ({ page }, testInfo) => {
		// Skip on mobile - review form tests only need desktop
		test.skip(testInfo.project.name === "mobile-admin", "Review form tested on desktop only");

		// Arrange - enable confidence via DB
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
		});
		const config = setting?.value as Record<string, unknown>;
		await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
			...config,
			enableConfidenceLevel: true,
		});

		const { submissionId, assignmentId } = await createSubmissionWithAssignment({
			title: "Confidence Shown Test",
		});
		trackedSubmissionIds.push(submissionId);

		// Act - login as reviewer
		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto(`/reviews/${assignmentId}`);
		await expect(page.getByRole("button", { name: "Submit Review" })).toBeVisible({ timeout: 15000 });

		// Assert
		await expect(page.getByRole("heading", { name: "Confidence Level" })).toBeVisible();
	});

	test("can submit review without confidence when disabled", async ({ page }, testInfo) => {
		// Skip on mobile - review form tests only need desktop
		test.skip(testInfo.project.name === "mobile-admin", "Review form tested on desktop only");

		// Arrange - disable confidence via DB
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
		});
		const config = setting?.value as Record<string, unknown>;
		await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
			...config,
			enableConfidenceLevel: false,
		});

		const { submissionId, assignmentId } = await createSubmissionWithAssignment({
			title: "Submit No Confidence Test",
		});
		trackedSubmissionIds.push(submissionId);

		// Act - login as reviewer
		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto(`/reviews/${assignmentId}`);
		await expect(page.getByRole("button", { name: "Submit Review" })).toBeVisible({ timeout: 15000 });

		// Fill required fields - decision
		await page
			.getByRole("button", { name: /Accept/i })
			.first()
			.click();

		// Fill comments (50+ chars)
		await page.locator("#comments").fill(
			"This is a comprehensive test review with enough characters to meet the minimum requirement for comments.",
		);

		// Set scores for all 4 criteria (ORAL_PRESENTATION has scoring enabled)
		const scoreButtons = page.getByRole("button", { name: "4", exact: true });
		const count = await scoreButtons.count();
		for (let i = 0; i < count; i++) {
			await scoreButtons.nth(i).click();
		}

		// Submit
		await page.getByRole("button", { name: "Submit Review" }).click();
		await page.waitForURL("**/reviews", { timeout: 15000 });

		// Assert - redirected to reviews list
		await expect(page).toHaveURL(/\/reviews$/);

		// Verify review in DB
		const review = await db.review.findFirst({
			where: { assignmentId },
		});
		expect(review).toBeTruthy();
	});
});
