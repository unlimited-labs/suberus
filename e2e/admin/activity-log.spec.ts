import { test, expect } from "../helpers/base-fixtures";
import {
	getPrisma,
	createSubmission,
	createSubmissionWithAssignment,
	getTestUserIds,
} from "../helpers/test-db";

test.describe("Activity Log - Recent Activity", () => {
	// Track manually created activity log IDs for cleanup
	const manualActivityIds: string[] = [];

	test.afterEach(async () => {
		if (manualActivityIds.length > 0) {
			const db = getPrisma();
			await db.activityLog.deleteMany({
				where: { id: { in: manualActivityIds } },
			});
			manualActivityIds.length = 0;
		}
	});

	test("submission event appears in recent activity", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const db = getPrisma();
		const { testUserId } = await getTestUserIds();
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "ActivityTest Submission",
		});
		cleanup.track(sub.id);

		const activity = await db.activityLog.create({
			data: {
				type: "SUBMISSION_CREATED",
				submissionId: sub.id,
				userId: testUserId,
			},
		});
		manualActivityIds.push(activity.id);

		// Act
		await page.goto("/admin/dashboard");
		await page
			.getByRole("heading", { name: "Admin Dashboard" })
			.waitFor({ timeout: 10000 });

		// Assert
		const main = page.getByRole("main");
		await expect(
			main.getByText("Submission created").first(),
		).toBeVisible({ timeout: 5000 });
		await expect(main.getByText(sub.title).first()).toBeVisible();
	});

	test("multiple event types show correctly", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const db = getPrisma();
		const { testUserId, adminUserId, reviewerUserId } =
			await getTestUserIds();
		const result = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "MultiEvent Submission",
		});
		cleanup.track(result.submissionId);

		const createdActivity = await db.activityLog.create({
			data: {
				type: "SUBMISSION_CREATED",
				submissionId: result.submissionId,
				userId: testUserId,
			},
		});
		manualActivityIds.push(createdActivity.id);

		const assignedActivity = await db.activityLog.create({
			data: {
				type: "REVIEW_ASSIGNED",
				submissionId: result.submissionId,
				userId: reviewerUserId,
				performedBy: adminUserId,
			},
		});
		manualActivityIds.push(assignedActivity.id);

		// Act
		await page.goto("/admin/dashboard");
		await page
			.getByRole("heading", { name: "Admin Dashboard" })
			.waitFor({ timeout: 10000 });

		// Assert
		const main = page.getByRole("main");
		await expect(
			main.getByText("Submission created").first(),
		).toBeVisible({ timeout: 5000 });
		await expect(
			main.getByText("Reviewer assigned").first(),
		).toBeVisible();
	});

	test("submission activity links to correct entity", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const db = getPrisma();
		const { testUserId } = await getTestUserIds();
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "LinkTest Submission",
		});
		cleanup.track(sub.id);

		const activity = await db.activityLog.create({
			data: {
				type: "SUBMISSION_CREATED",
				submissionId: sub.id,
				userId: testUserId,
			},
		});
		manualActivityIds.push(activity.id);

		// Act
		await page.goto("/admin/dashboard");
		await page
			.getByRole("heading", { name: "Admin Dashboard" })
			.waitFor({ timeout: 10000 });

		// Assert - find the link with submission title and verify href
		const main = page.getByRole("main");
		const link = main.getByRole("link", { name: sub.title });
		await expect(link).toBeVisible({ timeout: 15000 });
		await expect(link).toHaveAttribute(
			"href",
			`/admin/submissions/${sub.id}`,
		);
	});

	test("user event appears with correct link", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		const { testUserId } = await getTestUserIds();

		const activity = await db.activityLog.create({
			data: {
				type: "USER_REGISTERED",
				userId: testUserId,
			},
		});
		manualActivityIds.push(activity.id);

		// Act
		await page.goto("/admin/dashboard");
		await page
			.getByRole("heading", { name: "Admin Dashboard" })
			.waitFor({ timeout: 10000 });

		// Assert
		const main = page.getByRole("main");
		await expect(
			main.getByText("User registered").first(),
		).toBeVisible({ timeout: 5000 });

		// The user name link should point to /admin/users/$id
		const userLink = main.getByRole("link", { name: "Test User" }).first();
		await expect(userLink).toBeVisible();
		await expect(userLink).toHaveAttribute(
			"href",
			`/admin/users/${testUserId}`,
		);
	});

	test("show more button loads additional activity", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange - insert 25 activity log entries
		// Dashboard loads 20 initially so "Show more" appears
		const db = getPrisma();
		const { testUserId } = await getTestUserIds();

		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "ShowMore Submission",
		});
		cleanup.track(sub.id);

		// Insert 25 entries with recent timestamps to ensure they appear in first page
		const entries = [];
		for (let i = 0; i < 25; i++) {
			entries.push(
				db.activityLog.create({
					data: {
						type: "SUBMISSION_STATUS_CHANGED",
						submissionId: sub.id,
						userId: testUserId,
						detail: {
							type: "SUBMISSION_STATUS_CHANGED",
							fromStatus: "DRAFT",
							toStatus: "SUBMITTED",
							round: 1,
							event: `SHOW_MORE_TEST_${testRun.testRunId}_${i}`,
							reason: `Test entry ${i}`,
						},
						createdAt: new Date(Date.now() - i * 1000),
					},
				}),
			);
		}
		const created = await Promise.all(entries);
		for (const entry of created) {
			manualActivityIds.push(entry.id);
		}

		// Act
		await page.goto("/admin/dashboard");
		await page
			.getByRole("heading", { name: "Admin Dashboard" })
			.waitFor({ timeout: 10000 });

		// Assert - "Show more" button should be visible
		const showMoreButton = page.getByRole("button", {
			name: "Show more",
		});
		await expect(showMoreButton).toBeVisible({ timeout: 5000 });

		// Click "Show more" - second page has < 20 items so button disappears
		await showMoreButton.click();

		// After loading completes the button is removed (fewer than PAGE_SIZE items remaining)
		await expect(showMoreButton).toBeHidden({ timeout: 10000 });
	});
});
