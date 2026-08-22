import { test, expect, UserDetailPage } from "./fixtures";
import { createTestUser, deleteTestUser, getPrisma } from "../helpers/test-db";
import { DEFAULT_PASSWORD } from "../helpers/test-users";

test.describe("Allow late submission toggle", () => {
	test.describe.configure({ mode: "serial" });

	test("admin toggles late submission on and off", async ({ page }) => {
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
		await expect(toggle).toHaveText(/Allow late submission/);

		await toggle.click();
		await detailPage.openActions();
		await expect(toggle).toHaveText(/Disallow late submission/);

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

		await toggle.click();
		await detailPage.openActions();
		await expect(toggle).toHaveText(/Allow late submission/);

		const after = await db.user.findUnique({
			where: { id: testUser.id },
			select: { allowLateSubmission: true },
		});
		expect(after?.allowLateSubmission).toBe(false);

		await deleteTestUser(testUser.id);
	});
});
