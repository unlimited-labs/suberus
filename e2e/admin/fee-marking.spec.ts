import { test, expect, AdminUsersPage, UserDetailPage } from "./fixtures";
import {
	createTestUser,
	deleteTestUser,
	getPrisma,
	setAppSetting,
} from "../helpers/test-db";
import { DEFAULT_PASSWORD } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

test.describe("Fee Marking", () => {
	test.describe.configure({ mode: "serial" });
	test("admin marks user fee as paid with amount snapshot", async ({
		page,
	}) => {
		const testUser = await createTestUser({
			email: `fee-mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`,
			password: DEFAULT_PASSWORD,
		});

		const detailPage = new UserDetailPage(page);
		await detailPage.goto(testUser.id);
		await expect(detailPage.feeStatusUnpaid).toBeVisible({ timeout: 10000 });

		await detailPage.markAsPaidButton.click();
		await page.getByRole("combobox").click();
		await page
			.getByRole("option", { name: /Full Conference Fee/ })
			.click();
		await expect(page.getByRole("combobox")).toContainText("Full Conference Fee");
		await detailPage.confirmDialog();

		await expect(detailPage.feeStatusPaid).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Full Conference Fee")).toBeVisible();
		await expect(page.getByText("250.00")).toBeVisible();
		await expect(page.getByText("EUR")).toBeVisible();

		await loginAs(page, {
			email: testUser.email,
			password: DEFAULT_PASSWORD,
		}, { clearCookies: true });
		await page.goto("/fee");
		await expect(page.getByText("Payment Received")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Full Conference Fee")).toBeVisible();
		await expect(page.getByText("250.00")).toBeVisible();

		await deleteTestUser(testUser.id);
	});

	test("admin unmarks user fee", async ({ page }) => {
		const testUser = await createTestUser({
			email: `fee-unmark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`,
			password: DEFAULT_PASSWORD,
		});

		const db = getPrisma();
		await db.fee.create({
			data: {
				userId: testUser.id,
				type: "Full Conference Fee",
				amount: 250,
				currency: "EUR",
				paid: true,
				paidAt: new Date(),
			},
		});

		const detailPage = new UserDetailPage(page);
		await detailPage.goto(testUser.id);
		await expect(detailPage.feeStatusPaid).toBeVisible({ timeout: 10000 });

		await page.getByRole("button", { name: "Unmark" }).click();

		await expect(detailPage.feeStatusUnpaid).toBeVisible({ timeout: 10000 });

		await loginAs(page, {
			email: testUser.email,
			password: DEFAULT_PASSWORD,
		}, { clearCookies: true });
		await page.goto("/fee");
		await expect(page.getByText("Payment Not Received")).toBeVisible({
			timeout: 10000,
		});

		await deleteTestUser(testUser.id);
	});

	test("admin marks and unmarks fee from the users list badge", async ({
		page,
	}) => {
		const lastName = `ListFee${Date.now()}`;
		const testUser = await createTestUser({
			email: `fee-list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`,
			password: DEFAULT_PASSWORD,
			lastName,
		});

		const usersPage = new AdminUsersPage(page);
		await usersPage.goto();
		await usersPage.waitForLoad();
		const row = await usersPage.getRowByEmail({
			email: testUser.email,
			firstName: "Test",
			lastName,
		});
		await expect(row).toBeVisible({ timeout: 10000 });

		await row.getByTestId("fee-badge-trigger").click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: /Full Conference Fee/ }).click();
		await dialog.getByRole("button", { name: "Save" }).click();

		await expect(row.getByTestId("fee-badge-trigger")).toHaveText(
			/^(Full Conference Fee|Paid)$/,
			{ timeout: 10000 },
		);

		await row.getByTestId("fee-badge-trigger").click();
		await page.getByTestId("unmark-fee-paid").click();
		await expect(row.getByTestId("fee-badge-trigger")).toContainText("Unpaid", {
			timeout: 10000,
		});

		await deleteTestUser(testUser.id);
	});

	test("amount snapshot persists after fee type config change", async ({
		page,
	}) => {
		const testUser = await createTestUser({
			email: `fee-snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`,
			password: DEFAULT_PASSWORD,
		});

		const db = getPrisma();
		await db.fee.create({
			data: {
				userId: testUser.id,
				type: "Full Conference Fee",
				amount: 250,
				currency: "EUR",
				paid: true,
				paidAt: new Date(),
			},
		});

		await setAppSetting("FEE_TYPES", [
			{ id: "full", name: "Full Conference Fee", amount: 300 },
			{ id: "student", name: "Student Fee", amount: 100 },
		]);

		await loginAs(page, {
			email: testUser.email,
			password: DEFAULT_PASSWORD,
		}, { clearCookies: true });
		await page.goto("/fee");
		await expect(page.getByText("Payment Received")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("250.00")).toBeVisible();
		await expect(page.getByText("EUR")).toBeVisible();

		await setAppSetting("FEE_TYPES", [
			{ id: "full", name: "Full Conference Fee", amount: 250 },
			{ id: "student", name: "Student Fee", amount: 100 },
		]);
		await deleteTestUser(testUser.id);
	});
});
