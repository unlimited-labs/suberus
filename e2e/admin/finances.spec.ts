import * as XLSX from "xlsx";
import { expect, test } from "./fixtures";

/**
 * Finances board (admin-only). Standard + edge-case coverage.
 * Serial — the FinanceEntry ledger is a single global set per worker DB; the
 * only test that saves cleans up after itself. The rest are live-only (nothing
 * persisted, each test gets a fresh page). Native dialogs (unsaved-changes
 * blocker) are auto-accepted so navigation is never stuck.
 */
test.describe("Finances", () => {
	test.describe.configure({ mode: "serial" });

	test.beforeEach(async ({ page }) => {
		page.on("dialog", (dialog) => dialog.accept());
		await page.goto("/admin/finances");
		await expect(
			page.getByRole("heading", { name: "Finances" }),
		).toBeVisible({ timeout: 10000 });
	});

	test("records an expense + income (VAT, contractor, status, due) and persists", async ({
		page,
	}) => {
		await expect(page.getByTestId("expense-filter-all")).toBeVisible();
		await expect(page.getByTestId("expense-sort")).toBeVisible();

		await page.getByTestId("expense-add").click();
		await page.getByTestId("expense-label-0").fill("Venue E2E");
		await page.getByTestId("expense-contractor-0").fill("Acme E2E");
		// Net as a formula (=1000); gross auto-fills from the VAT rate
		await page.getByTestId("expense-net-0").fill("2*500");
		await expect(page.getByTestId("expense-net-eval-0")).toContainText("1,000");
		await page.getByTestId("expense-vat-23-0").click();
		await expect(page.getByTestId("expense-gross-0")).toHaveValue("1230.00");
		await expect(page.getByTestId("expense-vatamt-0")).toContainText("230");

		// Overdue flagging, then status + a future due date clears it
		await page.getByTestId("expense-due-0").fill("2020-01-01");
		await expect(page.getByTestId("expense-overdue-0")).toBeVisible();
		await page.getByTestId("expense-ordered-0").click();
		await page.getByTestId("expense-paid-0").click();
		await page.getByTestId("expense-due-0").fill("2026-08-01");
		await expect(page.getByTestId("expense-overdue-0")).not.toBeVisible();

		await page.getByTestId("income-add").click();
		await page.getByTestId("income-label-0").fill("Grant E2E");
		await page.getByTestId("income-amount-0").fill("500");
		await expect(page.getByTestId("finances-netto")).toBeVisible();

		await expect(
			page.getByRole("link", { name: "Export XLSX" }),
		).toHaveAttribute("href", "/api/admin/finances/export");

		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });

		// Persisted across reload
		await page.reload();
		await expect(page.getByTestId("expense-net-0")).toHaveValue("2*500", {
			timeout: 10000,
		});
		await expect(page.getByTestId("expense-gross-0")).toHaveValue("1230.00");
		await expect(page.getByTestId("expense-vat-23-0")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.getByTestId("expense-paid-0")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.getByTestId("expense-due-0")).toHaveValue("2026-08-01");
		await expect(page.getByTestId("expense-contractor-0")).toHaveValue(
			"Acme E2E",
		);
		await expect(page.getByTestId("income-label-0")).toHaveValue("Grant E2E");
		await expect(
			page.locator('#finance-contractors option[value="Acme E2E"]'),
		).toHaveCount(1);

		// Cleanup — remove both rows (each asks for confirmation) and save empty
		await page.getByTestId("expense-remove-0").click();
		await page.getByTestId("finances-remove-confirm").click();
		await page.getByTestId("income-remove-0").click();
		await page.getByTestId("finances-remove-confirm").click();
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });
	});

	test("net and gross convert both ways; No VAT collapses them", async ({
		page,
	}) => {
		await page.getByTestId("expense-add").click();

		// Net is source → gross computes
		await page.getByTestId("expense-net-0").fill("1000");
		await page.getByTestId("expense-vat-23-0").click();
		await expect(page.getByTestId("expense-gross-0")).toHaveValue("1230.00");
		await expect(page.getByTestId("expense-vatamt-0")).toContainText("230");

		// Editing gross flips the source → net recomputes
		await page.getByTestId("expense-gross-0").fill("2460");
		await expect(page.getByTestId("expense-net-0")).toHaveValue("2000.00");

		// No VAT → net equals gross and the VAT amount disappears
		await page.getByTestId("expense-vat-none-0").click();
		await expect(page.getByTestId("expense-net-0")).toHaveValue("2460.00");
		await expect(page.getByTestId("expense-vatamt-0")).toHaveCount(0);
	});

	test("amount fields evaluate formulas and reject letters", async ({
		page,
	}) => {
		await page.getByTestId("income-add").click();
		// Letters stripped, comma converted to a dot
		await page.getByTestId("income-amount-0").fill("12a*3,5");
		await expect(page.getByTestId("income-amount-0")).toHaveValue("12*3.5");
		await expect(page.getByTestId("income-amount-eval-0")).toContainText("42");
	});

	test("Gross/Net total switch changes the expenses basis", async ({ page }) => {
		await page.getByTestId("expense-add").click();
		await page.getByTestId("expense-net-0").fill("1000");
		await page.getByTestId("expense-vat-23-0").click();

		await expect(page.getByText("Total: Gross")).toBeVisible();
		await page.getByTestId("expense-basis-total").click();
		await expect(page.getByText("Total: Net")).toBeVisible();
	});

	test("toolbar filters by status and sorts rows", async ({ page }) => {
		await page.getByTestId("expense-add").click();
		await page.getByTestId("expense-label-0").fill("Alpha E2E");
		await page.getByTestId("expense-net-0").fill("100");

		await page.getByTestId("expense-add").click();
		await page.getByTestId("expense-label-1").fill("Beta E2E");
		await page.getByTestId("expense-net-1").fill("200");
		await page.getByTestId("expense-paid-1").click();

		// Filter: Paid hides the unpaid Alpha, keeps Beta
		await page.getByTestId("expense-filter-paid").click();
		await expect(page.getByTestId("expense-label-0")).not.toBeVisible();
		await expect(page.getByTestId("expense-label-1")).toBeVisible();
		await page.getByTestId("expense-filter-all").click();
		await expect(page.getByTestId("expense-label-0")).toBeVisible();

		// Sort by amount (desc) puts Beta (200) first
		await page.getByTestId("expense-sort").click();
		await page.getByRole("option", { name: "Amount" }).click();
		await expect(page.getByTestId("expense-label-0")).toHaveValue("Beta E2E");
	});

	test("removing a row asks for confirmation (cancel keeps it)", async ({
		page,
	}) => {
		await page.getByTestId("expense-add").click();
		await page.getByTestId("expense-label-0").fill("Keep me E2E");

		await page.getByTestId("expense-remove-0").click();
		await expect(page.getByText("Remove this row?")).toBeVisible();
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByTestId("expense-label-0")).toHaveValue("Keep me E2E");

		await page.getByTestId("expense-remove-0").click();
		await page.getByTestId("finances-remove-confirm").click();
		await expect(page.getByTestId("expense-label-0")).toHaveCount(0);
	});

	test("simulation mode shows fee projection and break-even", async ({
		page,
	}) => {
		await expect(page.getByTestId("finances-fee-collected")).toBeVisible();

		await page.getByTestId("finances-mode-sim").click();
		await expect(page.getByText("Registration fee projection")).toBeVisible();
		await expect(page.getByTestId("sim-qty-0")).toBeVisible();
		await expect(page.getByTestId("finances-breakeven-0")).toBeVisible();

		await page.getByTestId("sim-qty-0").fill("100");
		await expect(page.getByTestId("finances-netto")).toBeVisible();
	});

	test("XLSX export has correct columns, VAT math, formula eval and neutralizes injection", async ({
		page,
	}) => {
		// Seed one expense (net formula + 23% VAT, injection-triggering label +
		// contractor, ordered/paid, due) and one income (formula, no VAT)
		await page.getByTestId("expense-add").click();
		await page.getByTestId("expense-label-0").fill("=1+2 Venue E2E");
		await page.getByTestId("expense-contractor-0").fill("@Acme E2E");
		await page.getByTestId("expense-net-0").fill("2*500");
		await page.getByTestId("expense-vat-23-0").click();
		await expect(page.getByTestId("expense-gross-0")).toHaveValue("1230.00");
		await page.getByTestId("expense-ordered-0").click();
		await page.getByTestId("expense-paid-0").click();
		await page.getByTestId("expense-due-0").fill("2026-08-01");

		await page.getByTestId("income-add").click();
		await page.getByTestId("income-label-0").fill("Export Inc E2E");
		await page.getByTestId("income-amount-0").fill("2*250");

		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });

		// Download + parse the XLSX
		const response = await page.request.get("/api/admin/finances/export");
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("spreadsheetml");

		const wb = XLSX.read(await response.body(), { type: "buffer" });
		const sheet = wb.Sheets.Finances;
		expect(sheet).toBeDefined();
		const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);

		// Expense row — injection neutralized, VAT net↔gross math
		const expenseRow = rows.find((r) => r.Type === "Expense");
		expect(expenseRow).toBeDefined();
		expect(expenseRow?.Item).toBe("'=1+2 Venue E2E");
		expect(expenseRow?.Contractor).toBe("'@Acme E2E");
		expect(expenseRow?.Net).toBe(1000);
		expect(expenseRow?.["VAT %"]).toBe(23);
		expect(expenseRow?.VAT).toBe(230);
		expect(expenseRow?.Gross).toBe(1230);
		expect(expenseRow?.Ordered).toBe("yes");
		expect(expenseRow?.Paid).toBe("yes");
		expect(expenseRow?.Due).toBe("2026-08-01");
		expect(expenseRow?.Currency).toBeTruthy();

		// Income row — formula evaluated into the export, no VAT
		const incomeRow = rows.find((r) => r.Item === "Export Inc E2E");
		expect(incomeRow).toBeDefined();
		expect(incomeRow?.Net).toBe(500);
		expect(incomeRow?.Gross).toBe(500);
		expect(incomeRow?.VAT).toBe(0);

		// Registration-fee auto-line is present
		expect(
			rows.some((r) => r.Type === "Income" && r.Item === "Registration fees"),
		).toBe(true);

		// Totals identity — Net = Income − Expenses, expenses total is our gross
		const totalIncome = rows.find((r) => r.Type === "Total" && r.Item === "Income");
		const totalExpenses = rows.find(
			(r) => r.Type === "Total" && r.Item === "Expenses",
		);
		const totalNet = rows.find((r) => r.Type === "Total" && r.Item === "Net");
		expect(totalExpenses?.Gross).toBe(1230);
		expect(totalNet?.Gross).toBe(
			Number(totalIncome?.Gross) - Number(totalExpenses?.Gross),
		);

		// Cleanup
		await page.getByTestId("expense-remove-0").click();
		await page.getByTestId("finances-remove-confirm").click();
		await page.getByTestId("income-remove-0").click();
		await page.getByTestId("finances-remove-confirm").click();
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });
	});
});
