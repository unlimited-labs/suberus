import { test, expect, UserDetailPage } from "./fixtures";
import { createTestUser, deleteTestUser, getPrisma } from "../helpers/test-db";
import { DEFAULT_PASSWORD } from "../helpers/test-users";

/**
 * E2E tests for the admin "Allow late submission" per-user toggle.
 * Verifies the button flips state, persists to the DB, and is audited.
 */
test.describe("Allow late submission toggle", () => {
	test.describe.configure({ mode: "serial" });

	test("admin toggles late submission on and off", async ({ page }) => {
		// Arrange
		const testUser = await createTestUser({
			email: `late-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`,
			password: DEFAULT_PASSWORD,
		});

		const detailPage = new UserDetailPage(page);
		await detailPage.goto(testUser.id);

		// The toggle lives in the header "Actions menu" dropdown. Selecting a menu
		// item closes the dropdown, so reopen it before each assertion/click.
		const toggle = page.getByTestId("toggle-late-submission");
		await detailPage.openActions();
		await expect(toggle).toBeVisible({ timeout: 10000 });
		// Default off → item offers to allow
		await expect(toggle).toHaveText(/Allow late submission/);

		// Act — enable
		await toggle.click();
		await detailPage.openActions();
		await expect(toggle).toHaveText(/Disallow late submission/);

		// Assert — persisted + audited
		const db = getPrisma();
		const user = await db.user.findUnique({
			where: { id: testUser.id },
			select: { allowLateSubmission: true },
		});
		expect(user?.allowLateSubmission).toBe(true);

		const logEntry = await db.activityLog.findFirst({
			where: {
				type: "USER_TOGGLED_LATE_SUBMISSION",
				userId: testUser.id,
			},
		});
		expect(logEntry).not.toBeNull();

		// Act — disable
		await toggle.click();
		await detailPage.openActions();
		await expect(toggle).toHaveText(/Allow late submission/);

		const after = await db.user.findUnique({
			where: { id: testUser.id },
			select: { allowLateSubmission: true },
		});
		expect(after?.allowLateSubmission).toBe(false);

		// Cleanup
		await deleteTestUser(testUser.id);
	});
});
