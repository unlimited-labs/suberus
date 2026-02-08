import { expect, type Page, type TestInfo } from "@playwright/test";
import { test } from "../admin/fixtures";
import {
	createSession,
	deleteSession,
	createSubmission,
	deleteSubmission,
} from "../helpers/test-db";

/** Sessions tab is index 3; on mobile, labels are hidden so use nth() */
async function clickSessionsTab(page: Page, testInfo: TestInfo) {
	if (testInfo.project.name.includes("mobile")) {
		await page.getByRole("tab").nth(3).click();
	} else {
		await page.getByRole("tab", { name: /Sessions/i }).click();
	}
}

test.describe.serial("Admin - Conference Sessions", () => {
	test("should display sessions list", async ({ page, testRun }, testInfo) => {
		// Arrange
		const sessionId = await createSession(
			testRun.testRunId,
			"AI & Machine Learning",
		);

		// Act
		await page.goto("/admin/settings");
		await clickSessionsTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Session" }),
		).toBeVisible();

		// Assert
		await expect(
			page.getByRole("cell", {
				name: `${testRun.testRunId}_AI & Machine Learning`,
			}),
		).toBeVisible();

		// Cleanup
		await deleteSession(sessionId);
	});

	test("should create new session", async ({ page, testRun }, testInfo) => {
		// Arrange
		await page.goto("/admin/settings");
		await clickSessionsTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Session" }),
		).toBeVisible();

		// Act
		await page.getByRole("button", { name: "Create Session" }).click();
		await expect(page.getByRole("dialog")).toBeVisible();

		await page
			.getByLabel("Name")
			.fill(`${testRun.testRunId}_Quantum Computing`);
		await page.getByRole("button", { name: "Create", exact: true }).click();

		// Assert
		await expect(page.getByText("Session created")).toBeVisible();
		await expect(
			page.getByRole("cell", {
				name: `${testRun.testRunId}_Quantum Computing`,
			}),
		).toBeVisible();

		// Cleanup
		const { getPrisma } = await import("../helpers/test-db");
		const db = getPrisma();
		const session = await db.conferenceSession.findFirst({
			where: { name: `${testRun.testRunId}_Quantum Computing` },
		});
		if (session) await deleteSession(session.id);
	});

	test("should edit session name", async ({ page, testRun }, testInfo) => {
		// Arrange
		const sessionId = await createSession(testRun.testRunId, "Robotics");
		await page.goto("/admin/settings");
		await clickSessionsTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Session" }),
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
		await expect(page.getByText("Session updated")).toBeVisible();
		await expect(
			page.getByRole("cell", {
				name: `${testRun.testRunId}_Advanced Robotics`,
			}),
		).toBeVisible();

		// Cleanup
		await deleteSession(sessionId);
	});

	test("should toggle session active status", async ({ page, testRun }, testInfo) => {
		// Arrange
		const sessionId = await createSession(
			testRun.testRunId,
			"IoT Systems",
			undefined,
			true,
		);
		await page.goto("/admin/settings");
		await clickSessionsTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Session" }),
		).toBeVisible();

		// Act - toggle off
		const row = page
			.locator("table tbody tr")
			.filter({ hasText: `${testRun.testRunId}_IoT Systems` });
		const activeSwitch = row.getByRole("switch");

		await expect(activeSwitch).toBeChecked();
		await activeSwitch.click();

		// Assert
		await expect(page.getByText("Session deactivated")).toBeVisible();
		await expect(activeSwitch).not.toBeChecked();

		// Cleanup
		await deleteSession(sessionId);
	});

	test("should disable delete button for session with submissions", async ({
		page,
		testRun,
	}, testInfo) => {
		// Arrange
		const sessionId = await createSession(
			testRun.testRunId,
			"Data Science",
		);
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "ML Paper",
			content: "Content here",
			sessionId,
		});

		await page.goto("/admin/settings");
		await clickSessionsTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Session" }),
		).toBeVisible();

		// Assert - delete button should be disabled
		const row = page
			.locator("table tbody tr")
			.filter({ hasText: `${testRun.testRunId}_Data Science` });
		await expect(row.getByRole("button", { name: "Delete" })).toBeDisabled();

		// Cleanup
		await deleteSubmission(submissionId);
		await deleteSession(sessionId);
	});

	test("should delete empty session", async ({ page, testRun }, testInfo) => {
		// Arrange
		await createSession(
			testRun.testRunId,
			"Blockchain",
		);
		await page.goto("/admin/settings");
		await clickSessionsTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Session" }),
		).toBeVisible();

		// Act - click delete
		const row = page
			.locator("table tbody tr")
			.filter({ hasText: `${testRun.testRunId}_Blockchain` });
		await row.getByRole("button", { name: "Delete" }).click();

		// Confirm inline
		await row.getByRole("button", { name: "Confirm" }).click();

		// Assert
		await expect(page.getByText("Session deleted")).toBeVisible();
	});

	test("should enforce unique session names", async ({ page, testRun }, testInfo) => {
		// Arrange
		const sessionId = await createSession(
			testRun.testRunId,
			"Cybersecurity",
		);
		await page.goto("/admin/settings");
		await clickSessionsTab(page, testInfo);
		await expect(
			page.getByRole("button", { name: "Create Session" }),
		).toBeVisible();

		// Act - try to create duplicate
		await page.getByRole("button", { name: "Create Session" }).click();
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
		await deleteSession(sessionId);
	});
});
