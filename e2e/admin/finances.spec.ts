import { test, expect } from "./fixtures";

/**
 * Finances board (admin-only): add expense + income, save/persist, and the
 * simulation toggle with its fee projection + break-even.
 * Serial — the FinanceEntry ledger is a single global set per worker DB.
 */
test.describe("Finances", () => {
	test.describe.configure({ mode: "serial" });

	test("records expenses and income and persists them", async ({ page }) => {
		await page.goto("/admin/finances");
		await expect(
			page.getByRole("heading", { name: "Finances" }),
		).toBeVisible({ timeout: 10000 });

		// Add one expense and one income line
		await page.getByTestId("expense-add").click();
		await page.getByTestId("expense-label-0").fill("Venue E2E");
		await page.getByTestId("expense-contractor-0").fill("Acme E2E");
		// Net entered as a formula (=1000); Gross auto-fills from the VAT rate
		await page.getByTestId("expense-net-0").fill("2*500");
		await page.getByTestId("expense-vat-0").click();
		await page.getByRole("option", { name: "23%" }).click();
		await expect(page.getByTestId("expense-gross-0")).toHaveValue("1230.00");
		await expect(page.getByTestId("expense-vatamt-0")).toContainText("230");

		// Status chips + due date
		await page.getByTestId("expense-ordered-0").click();
		await page.getByTestId("expense-paid-0").click();
		await page.getByTestId("expense-due-0").fill("2026-08-01");
		await expect(page.getByTestId("expense-paid-0")).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		// Header switch flips the expenses total between gross and net
		await page.getByTestId("expense-basis-total").click();
		await expect(page.getByText("Total: Net")).toBeVisible();
		await page.getByTestId("expense-basis-total").click();

		await page.getByTestId("income-add").click();
		await page.getByTestId("income-label-0").fill("Grant E2E");
		await page.getByTestId("income-amount-0").fill("500");

		await expect(page.getByTestId("finances-netto")).toBeVisible();

		// Export link points at the XLSX endpoint
		await expect(
			page.getByRole("link", { name: "Export XLSX" }),
		).toHaveAttribute("href", "/api/admin/finances/export");

		// Save and confirm
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });

		// Persisted across reload — the net formula, income, and the VAT rate
		await page.reload();
		await expect(page.getByTestId("expense-net-0")).toHaveValue("2*500", {
			timeout: 10000,
		});
		await expect(page.getByTestId("expense-gross-0")).toHaveValue("1230.00");
		await expect(page.getByTestId("income-label-0")).toHaveValue("Grant E2E");
		await expect(page.getByTestId("expense-vat-0")).toContainText("23%");
		await expect(page.getByTestId("expense-paid-0")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.getByTestId("expense-due-0")).toHaveValue("2026-08-01");
		// Contractor persisted, and offered as a reusable suggestion
		await expect(page.getByTestId("expense-contractor-0")).toHaveValue(
			"Acme E2E",
		);
		await expect(
			page.locator('#finance-contractors option[value="Acme E2E"]'),
		).toHaveCount(1);

		// Cleanup — clear the ledger so re-runs start empty
		await page.getByTestId("expense-remove-0").click();
		await page.getByTestId("income-remove-0").click();
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });
	});

	test("simulation mode shows fee projection and break-even", async ({
		page,
	}) => {
		await page.goto("/admin/finances");
		await expect(
			page.getByRole("heading", { name: "Finances" }),
		).toBeVisible({ timeout: 10000 });

		// Actual mode shows the read-only collected-fees line
		await expect(page.getByTestId("finances-fee-collected")).toBeVisible();

		// Switch to simulation
		await page.getByTestId("finances-mode-sim").click();
		await expect(page.getByText("Registration fee projection")).toBeVisible();
		await expect(page.getByTestId("sim-qty-0")).toBeVisible();
		await expect(page.getByTestId("finances-breakeven-0")).toBeVisible();

		// Editing a projected quantity keeps the net readout live
		await page.getByTestId("sim-qty-0").fill("100");
		await expect(page.getByTestId("finances-netto")).toBeVisible();
	});
});
