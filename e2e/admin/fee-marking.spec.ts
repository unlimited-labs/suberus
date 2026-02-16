import { test, expect, UserDetailPage } from "./fixtures";
import {
	createTestUser,
	deleteTestUser,
	getPrisma,
	setAppSetting,
} from "../helpers/test-db";
import { DEFAULT_PASSWORD } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

/**
 * E2E tests for admin fee marking/unmarking
 * Tests mark as paid with amount snapshot, unmark, and snapshot persistence
 */
test.describe("Fee Marking", () => {
	test.describe.configure({ mode: "serial" });
	test("admin marks user fee as paid with amount snapshot", async ({
		page,
	}) => {
		// Arrange
		const testUser = await createTestUser({
			email: `fee-mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`,
			password: DEFAULT_PASSWORD,
		});

		const detailPage = new UserDetailPage(page);
		await detailPage.goto(testUser.id);
		await expect(detailPage.feeStatusUnpaid).toBeVisible({ timeout: 10000 });

		// Act — mark as paid
		await detailPage.markAsPaidButton.click();
		// Select "Full Conference Fee" from fee type selector
		await page.getByRole("combobox").click();
		await page
			.getByRole("option", { name: /Full Conference Fee/ })
			.click();
		await detailPage.confirmDialog();

		// Assert — admin sees paid status with amount
		await expect(detailPage.feeStatusPaid).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Full Conference Fee")).toBeVisible();
		await expect(page.getByText("250.00")).toBeVisible();
		await expect(page.getByText("EUR")).toBeVisible();

		// Verify user sees payment on fee page
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

		// Cleanup
		await deleteTestUser(testUser.id);
	});

	test("admin unmarks user fee", async ({ page }) => {
		// Arrange — create user with paid fee
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

		// Act — unmark
		await page.getByRole("button", { name: "Unmark" }).click();

		// Assert — admin sees unpaid
		await expect(detailPage.feeStatusUnpaid).toBeVisible({ timeout: 10000 });

		// Verify user sees "Payment Not Received"
		await loginAs(page, {
			email: testUser.email,
			password: DEFAULT_PASSWORD,
		}, { clearCookies: true });
		await page.goto("/fee");
		await expect(page.getByText("Payment Not Received")).toBeVisible({
			timeout: 10000,
		});

		// Cleanup
		await deleteTestUser(testUser.id);
	});

	test("amount snapshot persists after fee type config change", async ({
		page,
	}) => {
		// Arrange — create user with paid fee at 250 EUR
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

		// Act — change fee type config amount to 300
		await setAppSetting("FEE_TYPES", [
			{ id: "full", name: "Full Conference Fee", amount: 300 },
			{ id: "student", name: "Student Fee", amount: 100 },
		]);

		// Assert — user still sees 250 (snapshotted)
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

		// Cleanup — restore original fee types
		await setAppSetting("FEE_TYPES", [
			{ id: "full", name: "Full Conference Fee", amount: 250 },
			{ id: "student", name: "Student Fee", amount: 100 },
		]);
		await deleteTestUser(testUser.id);
	});
});
