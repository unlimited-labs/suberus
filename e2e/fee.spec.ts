import { test, expect } from "@playwright/test";
import { type Page, type Locator } from "@playwright/test";
import {
	createFee,
	getTestUserIds,
	getPrisma,
	createTestUser,
	deleteTestUser,
} from "./helpers/test-db";

/**
 * E2E tests for Fee functionality
 * Tests user fee page and admin fee instructions editor
 * Uses per-test user isolation - each test creates its own user
 *
 * Business logic: Fee is assigned by admin AFTER payment is received
 * - Fee exists = payment confirmed (paid)
 * - No fee = payment not received (unpaid)
 */

// Admin user credentials (shared, read-only)
const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
};

// Helper: Login with email and password
async function login(page: Page, email: string, password: string) {
	await page.goto("/login");
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL("/", { timeout: 30000 });
}

// Page Object: Fee Page
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

// Page Object: Admin Settings Page
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
			name: /Fee Instructions/i,
		});
		this.instructionsTextarea = page.getByLabel("Instructions Content");
		this.saveButton = page.getByRole("button", { name: "Save Instructions" });
		this.successToast = page.getByText("Fee payment instructions saved");
	}

	async goto() {
		await this.page.goto("/admin/settings");
		await this.page
			.getByRole("heading", { name: "Configuration" })
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

test.describe("Fee - User View", () => {
	test("user with assigned fee sees payment confirmation and details", async ({
		page,
	}) => {
		// Arrange - Create unique test user
		const testUser = await createTestUser({
			email: `fee-test-${Date.now()}@e2e.local`,
			password: "testpass123",
		});

		const paidAt = new Date("2026-01-15");
		await createFee({
			userId: testUser.id,
			type: "FULL",
			amount: 250.0,
			currency: "EUR",
			paidAt,
		});

		await login(page, testUser.email, "testpass123");

		// Act
		const feePage = new FeePage(page);
		await feePage.goto();

		// Assert
		await expect(feePage.heading).toBeVisible();
		await expect(feePage.paidBadge).toBeVisible();
		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Full Conference Fee")).toBeVisible();
		await expect(page.getByText("250.00")).toBeVisible();
		await expect(page.getByText("EUR")).toBeVisible();
		await expect(page.getByText("January 15, 2026")).toBeVisible();
		await expect(feePage.paymentInstructions).toBeVisible();

		// Cleanup
		await deleteTestUser(testUser.id);
	});

	test("user without fee sees payment not received alert", async ({ page }) => {
		// Arrange - Create unique test user (no fee)
		const testUser = await createTestUser({
			email: `fee-test-${Date.now()}@e2e.local`,
			password: "testpass123",
		});

		await login(page, testUser.email, "testpass123");

		// Act
		const feePage = new FeePage(page);
		await feePage.goto();

		// Assert
		await expect(feePage.heading).toBeVisible();
		await expect(feePage.noFeeAlert).toBeVisible();
		await expect(page.getByText("Payment Not Received")).toBeVisible();
		await expect(
			page.getByText(
				"You have not paid the conference fee yet. Please follow the payment instructions below."
			)
		).toBeVisible();

		// Payment instructions should still be visible
		await expect(feePage.paymentInstructions).toBeVisible();

		// Cleanup
		await deleteTestUser(testUser.id);
	});

	test("user with invited speaker fee sees correct fee type", async ({ page }) => {
		// Arrange - Create unique test user
		const testUser = await createTestUser({
			email: `fee-test-${Date.now()}@e2e.local`,
			password: "testpass123",
		});

		await createFee({
			userId: testUser.id,
			type: "INVITED",
			amount: 75.0,
			currency: "GBP",
			paidAt: new Date("2026-01-10"),
		});

		await login(page, testUser.email, "testpass123");

		// Act
		const feePage = new FeePage(page);
		await feePage.goto();

		// Assert
		await expect(feePage.heading).toBeVisible();
		await expect(feePage.paidBadge).toBeVisible();
		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Invited Speaker Fee")).toBeVisible();
		await expect(page.getByText("75.00")).toBeVisible();
		await expect(page.getByText("GBP")).toBeVisible();

		// Cleanup
		await deleteTestUser(testUser.id);
	});
});

test.describe("Fee - Admin Instructions Editor", () => {
	// Run tests serially - they modify shared global setting
	test.describe.configure({ mode: 'serial' });

	test("admin can edit and save fee payment instructions", async ({ page }) => {
		// Arrange
		await login(page, ADMIN_USER.email, ADMIN_USER.password);
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();

		// Act
		await settingsPage.openFeeInstructionsTab();

		const testInstructions = `# Test Payment Instructions

Please transfer the fee to:
- Account: TEST123456
- Bank: Test Bank
- Amount: As specified in your fee details

**Note:** This is a test instruction set for E2E testing.`;

		await settingsPage.updateInstructions(testInstructions);

		// Assert
		await expect(settingsPage.successToast).toBeVisible({ timeout: 10000 });
	});

	test("admin updated instructions are visible to users", async ({ page }) => {
		// Arrange - Admin updates instructions
		await login(page, ADMIN_USER.email, ADMIN_USER.password);
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.openFeeInstructionsTab();

		const uniqueText = `E2E Test ${Date.now()}`;
		const instructions = `# Updated Instructions\n\n${uniqueText}`;
		await settingsPage.updateInstructions(instructions);
		await expect(settingsPage.successToast).toBeVisible({ timeout: 10000 });

		// Act - Logout and login as unique test user
		await page.context().clearCookies();
		await page.goto("/login");
		await page.waitForURL("/login");

		const testUser = await createTestUser({
			email: `fee-test-${Date.now()}@e2e.local`,
			password: "testpass123",
		});

		await login(page, testUser.email, "testpass123");
		const feePage = new FeePage(page);
		await feePage.goto();

		// Assert - Instructions contain the unique text
		await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 10000 });

		// Cleanup
		await deleteTestUser(testUser.id);
	});

	test("admin can use markdown formatting in instructions", async ({
		page,
	}) => {
		// Arrange
		await login(page, ADMIN_USER.email, ADMIN_USER.password);
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.openFeeInstructionsTab();

		// Act
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

		// Assert
		await expect(settingsPage.successToast).toBeVisible({ timeout: 10000 });

		// Verify markdown is saved (logout and check as user)
		await page.context().clearCookies();
		await page.goto("/login");
		await page.waitForURL("/login");

		const testUser = await createTestUser({
			email: `fee-test-${Date.now()}@e2e.local`,
			password: "testpass123",
		});

		await login(page, testUser.email, "testpass123");
		const feePage = new FeePage(page);
		await feePage.goto();

		// Markdown should be rendered (not raw)
		await expect(page.getByRole("heading", { name: "Bank Transfer" })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Account Number")).toBeVisible();
		await expect(page.getByRole("link", { name: "finance@conference.org" })).toBeVisible();

		// Cleanup
		await deleteTestUser(testUser.id);
	});
});

test.describe("Fee - Navigation", () => {
	test("fee link is visible in navigation for authenticated users", async ({
		page,
	}) => {
		// Arrange - Use shared test user (read-only test)
		const { testUserId } = await getTestUserIds();
		const testUser = await getPrisma().user.findUnique({ where: { id: testUserId } });
		await login(page, testUser!.email, "testpass123");

		// Act & Assert
		await expect(page.getByRole("link", { name: "Fee" })).toBeVisible();
	});

	test("clicking fee link navigates to fee page", async ({ page }) => {
		// Arrange - Use shared test user (read-only test)
		const { testUserId } = await getTestUserIds();
		const testUser = await getPrisma().user.findUnique({ where: { id: testUserId } });
		await login(page, testUser!.email, "testpass123");

		// Act
		await page.getByRole("link", { name: "Fee" }).click();

		// Assert
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
		// Arrange - Create unique test user
		const testUser = await createTestUser({
			email: `fee-test-${Date.now()}@e2e.local`,
			password: "testpass123",
		});
		const db = getPrisma();

		// Create fee with null amount (admin confirmed payment but didn't enter amount)
		await db.fee.create({
			data: {
				userId: testUser.id,
				type: "FULL",
				amount: null,
				currency: null,
				paid: true,
				paidAt: new Date(),
			},
		});

		await login(page, testUser.email, "testpass123");

		// Act
		const feePage = new FeePage(page);
		await feePage.goto();

		// Assert
		await expect(feePage.heading).toBeVisible();
		await expect(feePage.paidBadge).toBeVisible();
		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Full Conference Fee")).toBeVisible();

		// Amount field should not be visible
		await expect(page.getByText("Amount")).not.toBeVisible();

		// Cleanup
		await deleteTestUser(testUser.id);
	});

	test("fee page loads correctly after multiple navigation", async ({
		page,
	}) => {
		// Arrange - Create unique test user
		const testUser = await createTestUser({
			email: `fee-test-${Date.now()}@e2e.local`,
			password: "testpass123",
		});

		await createFee({
			userId: testUser.id,
			type: "FULL",
			amount: 200.0,
			currency: "USD",
			paidAt: new Date("2026-01-20"),
		});

		await login(page, testUser.email, "testpass123");

		// Act - Navigate back and forth
		await page.goto("/fee");
		await expect(page.getByText("Payment Received")).toBeVisible();

		await page.goto("/");
		await page.goto("/submissions");
		await page.goto("/fee");

		// Assert
		await expect(page.getByText("Payment Received")).toBeVisible();
		await expect(page.getByText("Full Conference Fee")).toBeVisible();

		// Cleanup
		await deleteTestUser(testUser.id);
	});
});
