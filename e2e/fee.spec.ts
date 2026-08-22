import { test, expect } from "./helpers/base-fixtures";
import { type Page, type Locator } from "@playwright/test";
import {
	createFee,
	getTestUserIds,
	getPrisma,
	createTestUser,
	deleteTestUser,
} from "./helpers/test-db";

import { ADMIN_USER, DEFAULT_PASSWORD } from "./helpers/test-users";
import { loginAs } from "./helpers/auth";
import { dismissViteOverlay } from "./helpers/page-setup";

test.beforeEach(async ({ page }) => {
	await dismissViteOverlay(page);
});

class FeePage {
	readonly page: Page;
	readonly heading: Locator;
	readonly paidBadge: Locator;
	readonly feeTypeField: Locator;
	readonly amountField: Locator;
	readonly paymentDateField: Locator;
	readonly noFeeAlert: Locator;
	readonly paymentInstructions: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.getByRole("heading", { name: "Conference Fee" });
		this.paidBadge = page.getByText("Paid").first();
		this.feeTypeField = page.getByText("Fee Type").locator("..");
		this.amountField = page.getByText("Amount").locator("..");
		this.paymentDateField = page.getByText("Payment Date").locator("..");
		this.noFeeAlert = page.getByText("Payment Not Received");
		this.paymentInstructions = page.getByRole("heading", {
			name: "Payment Instructions",
		}).first(); // Target the section heading, not the markdown h1
	}

	async goto() {
		await this.page.goto("/fee");
		await this.heading.waitFor({ state: "visible", timeout: 30000 });
	}

	async isLoaded() {
		await expect(this.heading).toBeVisible();
	}
}

class AdminSettingsPage {
	readonly page: Page;
	readonly feeInstructionsTab: Locator;
	readonly instructionsTextarea: Locator;
	readonly saveButton: Locator;
	readonly successToast: Locator;

	constructor(page: Page) {
		this.page = page;
		// Use tab role and ensure it's visible (tabs have hidden text on mobile)
		this.feeInstructionsTab = page.getByRole("tab", {
			name: /^Fee$/i,
		});
		this.instructionsTextarea = page.getByLabel("Instructions Content");
		this.saveButton = page.getByRole("button", { name: "Save Instructions" });
		this.successToast = page.getByText("Fee payment instructions saved");
	}

	async goto() {
		await this.page.goto("/admin/settings");
		await this.page
			.getByRole("heading", { name: "Settings" })
			.waitFor({ state: "visible", timeout: 30000 });
	}

	async openFeeInstructionsTab() {
		await this.feeInstructionsTab.click();
		await this.instructionsTextarea.waitFor({
			state: "visible",
			timeout: 10000,
		});
	}

	async updateInstructions(content: string) {
		await this.instructionsTextarea.fill(content);
		await this.saveButton.click();
	}
}

async function createFeeTestUser() {
	return createTestUser({
		email: `fee-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`,
		password: DEFAULT_PASSWORD,
	});
}

async function loginAndOpenFeePage(page: Page, testUser: { email: string }) {
	await loginAs(page, { email: testUser.email, password: DEFAULT_PASSWORD });
	const feePage = new FeePage(page);
	await feePage.goto();
	return feePage;
}

test.describe("Fee - User View", () => {
	test("user with assigned fee sees payment confirmation and details", async ({
		page,
	}) => {
		const testUser = await createFeeTestUser();

		const paidAt = new Date("2026-01-15");
		await createFee({
			userId: testUser.id,
			type: "Full Conference Fee",
			amount: 250.0,
			currency: "EUR",
			paidAt,
		});

		const feePage = await loginAndOpenFeePage(page, testUser);

		await expect(feePage.heading).toBeVisible();
		await expect(feePage.paidBadge).toBeVisible();
		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Full Conference Fee")).toBeVisible();
		await expect(page.getByText("250.00")).toBeVisible();
		await expect(page.getByText("EUR")).toBeVisible();
		// Date format depends on admin setting (DD.MM.YYYY, MM/DD/YYYY, etc.)
		await expect(page.getByText(/15[.\-\/]01[.\-\/]2026|01[.\-\/]15[.\-\/]2026|2026[.\-\/]01[.\-\/]15|Jan\w*\s+15|15\s+Jan\w*/)).toBeVisible();
		await expect(feePage.paymentInstructions).toBeVisible();

		await deleteTestUser(testUser.id);
	});

	test("user without fee sees payment not received alert", async ({ page }) => {
		const testUser = await createFeeTestUser();

		const feePage = await loginAndOpenFeePage(page, testUser);

		await expect(feePage.heading).toBeVisible();
		await expect(feePage.noFeeAlert).toBeVisible();
		await expect(page.getByText("Payment Not Received")).toBeVisible();
		await expect(
			page.getByText(
				"You have not paid the conference fee yet. Please follow the payment instructions below."
			)
		).toBeVisible();

		await expect(feePage.paymentInstructions).toBeVisible();

		await deleteTestUser(testUser.id);
	});

	test("user with invited speaker fee sees correct fee type", async ({ page }) => {
		const testUser = await createFeeTestUser();

		await createFee({
			userId: testUser.id,
			type: "Invited Speaker Fee",
			amount: 75.0,
			currency: "GBP",
			paidAt: new Date("2026-01-10"),
		});

		const feePage = await loginAndOpenFeePage(page, testUser);

		await expect(feePage.heading).toBeVisible();
		await expect(feePage.paidBadge).toBeVisible();
		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Invited Speaker Fee", { exact: false })).toBeVisible();
		await expect(page.getByText("75.00")).toBeVisible();
		await expect(page.getByText("GBP")).toBeVisible();

		await deleteTestUser(testUser.id);
	});
});

test.describe("Fee - Admin Instructions Editor", () => {
	// Run tests serially - they modify shared global setting
	test.describe.configure({ mode: 'serial' });

	test("admin can edit and save fee payment instructions", async ({ page }) => {
		await loginAs(page, ADMIN_USER);
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();

		await settingsPage.openFeeInstructionsTab();

		const testInstructions = `# Test Payment Instructions

Please transfer the fee to:
- Account: TEST123456
- Bank: Test Bank
- Amount: As specified in your fee details

**Note:** This is a test instruction set for E2E testing.`;

		await settingsPage.updateInstructions(testInstructions);

		await expect(settingsPage.successToast).toBeVisible({ timeout: 10000 });
	});

	test("admin updated instructions are visible to users", async ({ page }) => {
		await loginAs(page, ADMIN_USER);
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.openFeeInstructionsTab();

		const uniqueText = `E2E Test ${Date.now()}`;
		const instructions = `# Updated Instructions\n\n${uniqueText}`;
		await settingsPage.updateInstructions(instructions);
		await expect(settingsPage.successToast).toBeVisible({ timeout: 10000 });

		await page.context().clearCookies();
		await page.goto("/login");
		await page.waitForURL("/login");

		const testUser = await createFeeTestUser();

		await loginAndOpenFeePage(page, testUser);

		await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 10000 });

		await deleteTestUser(testUser.id);
	});

	test("admin can use markdown formatting in instructions", async ({
		page,
	}) => {
		await loginAs(page, ADMIN_USER);
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.openFeeInstructionsTab();

		const markdownInstructions = `# Payment Instructions

## Bank Transfer

Please use the following details:

- **Account Number**: 123456789
- **SWIFT Code**: TESTSWIFT
- **Bank Name**: Test International Bank

## Important Notes

1. Include your submission ID in the transfer reference
2. Payment must be received before the conference date
3. Contact us if you need an invoice

*For questions, email: [finance@conference.org](mailto:finance@conference.org)*`;

		await settingsPage.updateInstructions(markdownInstructions);

		await expect(settingsPage.successToast).toBeVisible({ timeout: 10000 });

		await page.context().clearCookies();
		await page.goto("/login");
		await page.waitForURL("/login");

		const testUser = await createFeeTestUser();

		await loginAndOpenFeePage(page, testUser);

		await expect(page.getByRole("heading", { name: "Bank Transfer" })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Account Number")).toBeVisible();
		await expect(page.getByRole("link", { name: "finance@conference.org" })).toBeVisible();

		await deleteTestUser(testUser.id);
	});
});

test.describe("Fee - Navigation", () => {
	test("fee link is visible in navigation for authenticated users", async ({
		page,
	}) => {
		const { testUserId } = await getTestUserIds();
		const testUser = await getPrisma().user.findUnique({ where: { id: testUserId } });
		await loginAs(page, { email: testUser!.email, password: DEFAULT_PASSWORD });

		await expect(page.getByRole("link", { name: "Fee" })).toBeVisible();
	});

	test("clicking fee link navigates to fee page", async ({ page }) => {
		const { testUserId } = await getTestUserIds();
		const testUser = await getPrisma().user.findUnique({ where: { id: testUserId } });
		await loginAs(page, { email: testUser!.email, password: DEFAULT_PASSWORD });

		await page.getByRole("link", { name: "Fee" }).click();

		await expect(page).toHaveURL("/fee");
		await expect(
			page.getByRole("heading", { name: "Conference Fee" })
		).toBeVisible();
	});
});

test.describe("Fee - Edge Cases", () => {
	test("fee with null amount displays without amount field", async ({
		page,
	}) => {
		const testUser = await createFeeTestUser();
		const db = getPrisma();

		await db.fee.create({
			data: {
				userId: testUser.id,
				type: "Full Conference Fee",
				amount: null,
				currency: null,
				paid: true,
				paidAt: new Date(),
			},
		});

		const feePage = await loginAndOpenFeePage(page, testUser);

		await expect(feePage.heading).toBeVisible();
		await expect(feePage.paidBadge).toBeVisible();
		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Full Conference Fee")).toBeVisible();

		// Amount field should not be visible (exact match to avoid matching payment instructions text)
		await expect(page.getByText("Amount", { exact: true })).not.toBeVisible();

		await deleteTestUser(testUser.id);
	});

	test("fee page loads correctly after multiple navigation", async ({
		page,
	}) => {
		const testUser = await createFeeTestUser();

		await createFee({
			userId: testUser.id,
			type: "Full Conference Fee",
			amount: 200.0,
			currency: "USD",
			paidAt: new Date("2026-01-20"),
		});

		await loginAs(page, { email: testUser.email, password: DEFAULT_PASSWORD });

		await page.goto("/fee");
		await expect(page.getByText("Payment Received")).toBeVisible();

		await page.goto("/");
		await page.goto("/submissions");
		await page.goto("/fee");

		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Full Conference Fee")).toBeVisible();

		await deleteTestUser(testUser.id);
	});
});
