import { expect, type Page, type TestInfo } from "@playwright/test";
import { test } from "../admin/fixtures";
import {
	createTrack,
	deleteTrack,
	createSubmission,
	deleteSubmission,
} from "../helpers/test-db";

/** Tracks tab is index 3; on mobile, labels are hidden so use nth() */
async function clickTracksTab(page: Page, testInfo: TestInfo) {
	if (testInfo.project.name.includes("mobile")) {
		await page.getByRole("tab").nth(3).click();
	} else {
		await page.getByRole("tab", { name: /Tracks/i }).click();
	}
}

test.describe.serial("Admin - Conference Tracks", () => {
	test("should display tracks list", async ({ page, testRun }, testInfo) => {
		// Arrange
		const trackId = await createTrack(
			testRun.testRunId,
			"AI & Machine Learning",
		);

		// Act
		await page.goto("/admin/settings");
		await clickTracksTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Track" }),
		).toBeVisible();

		// Assert
		await expect(
			page.getByRole("cell", {
				name: `${testRun.testRunId}_AI & Machine Learning`,
			}),
		).toBeVisible();

		// Cleanup
		await deleteTrack(trackId);
	});

	test("should create new track", async ({ page, testRun }, testInfo) => {
		// Arrange
		await page.goto("/admin/settings");
		await clickTracksTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Track" }),
		).toBeVisible();

		// Act
		await page.getByRole("button", { name: "Create Track" }).click();
		await expect(page.getByRole("dialog")).toBeVisible();

		await page
			.getByLabel("Name")
			.fill(`${testRun.testRunId}_Quantum Computing`);
		await page.getByRole("button", { name: "Create", exact: true }).click();

		// Assert
		await expect(page.getByText("Track created")).toBeVisible({ timeout: 15000 });
		await expect(page.getByRole("dialog")).toBeHidden();
		await expect(
			page.getByRole("cell", {
				name: `${testRun.testRunId}_Quantum Computing`,
			}),
		).toBeVisible({ timeout: 15000 });

		// Cleanup
		const { getPrisma } = await import("../helpers/test-db");
		const db = getPrisma();
		const track = await db.conferenceTrack.findFirst({
			where: { name: `${testRun.testRunId}_Quantum Computing` },
		});
		if (track) await deleteTrack(track.id);
	});

	test("should edit track name", async ({ page, testRun }, testInfo) => {
		// Arrange
		const trackId = await createTrack(testRun.testRunId, "Robotics");
		await page.goto("/admin/settings");
		await clickTracksTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Track" }),
		).toBeVisible();

		// Act
		const row = page
			.locator("table tbody tr")
			.filter({ hasText: `${testRun.testRunId}_Robotics` });
		await row.getByRole("button", { name: "Edit" }).click();

		await expect(page.getByRole("dialog")).toBeVisible();
		await page.getByLabel("Name").clear();
		await page
			.getByLabel("Name")
			.fill(`${testRun.testRunId}_Advanced Robotics`);
		await page.getByRole("button", { name: "Save" }).click();

		// Assert
		await expect(page.getByText("Track updated")).toBeVisible({ timeout: 15000 });
		await expect(page.getByRole("dialog")).toBeHidden();
		await expect(
			page.getByRole("cell", {
				name: `${testRun.testRunId}_Advanced Robotics`,
			}),
		).toBeVisible({ timeout: 15000 });

		// Cleanup
		await deleteTrack(trackId);
	});

	test("should toggle track active status", async ({ page, testRun }, testInfo) => {
		// Arrange
		const trackId = await createTrack(
			testRun.testRunId,
			"IoT Systems",
			undefined,
			true,
		);
		await page.goto("/admin/settings");
		await clickTracksTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Track" }),
		).toBeVisible();

		// Act - toggle off
		const row = page
			.locator("table tbody tr")
			.filter({ hasText: `${testRun.testRunId}_IoT Systems` });
		const activeSwitch = row.getByRole("switch");

		await expect(activeSwitch).toBeChecked();
		await activeSwitch.click();

		// Assert
		await expect(page.getByText("Track deactivated")).toBeVisible({ timeout: 15000 });
		await expect(activeSwitch).not.toBeChecked({ timeout: 10000 });

		// Cleanup
		await deleteTrack(trackId);
	});

	test("should disable delete button for track with submissions", async ({
		page,
		testRun,
	}, testInfo) => {
		// Arrange
		const trackId = await createTrack(
			testRun.testRunId,
			"Data Science",
		);
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "ML Paper",
			content: "Content here",
			trackId,
		});

		await page.goto("/admin/settings");
		await clickTracksTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Track" }),
		).toBeVisible();

		// Assert - delete button should be disabled
		const row = page
			.locator("table tbody tr")
			.filter({ hasText: `${testRun.testRunId}_Data Science` });
		await expect(row.getByRole("button", { name: "Delete" })).toBeDisabled();

		// Cleanup
		await deleteSubmission(submissionId);
		await deleteTrack(trackId);
	});

	test("should delete empty track", async ({ page, testRun }, testInfo) => {
		// Arrange
		await createTrack(
			testRun.testRunId,
			"Blockchain",
		);
		await page.goto("/admin/settings");
		await clickTracksTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Track" }),
		).toBeVisible();

		// Act - click delete
		const row = page
			.locator("table tbody tr")
			.filter({ hasText: `${testRun.testRunId}_Blockchain` });
		await row.getByRole("button", { name: "Delete" }).click();

		// Confirm inline
		await row.getByRole("button", { name: "Confirm" }).click();

		// Assert
		await expect(page.getByText("Track deleted")).toBeVisible();
	});

	test("should enforce unique track names", async ({ page, testRun }, testInfo) => {
		// Arrange
		const trackId = await createTrack(
			testRun.testRunId,
			"Cybersecurity",
		);
		await page.goto("/admin/settings");
		await clickTracksTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Track" }),
		).toBeVisible();

		// Act - try to create duplicate
		await page.getByRole("button", { name: "Create Track" }).click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await page
			.getByLabel("Name")
			.fill(`${testRun.testRunId}_Cybersecurity`);
		await page.getByRole("button", { name: "Create", exact: true }).click();

		// Assert - should show error toast
		await expect(
			page.getByText(/unique|already exists|constraint/i),
		).toBeVisible();

		// Cleanup
		await deleteTrack(trackId);
	});
});
