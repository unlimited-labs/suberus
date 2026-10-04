import * as XLSX from "xlsx";
import { test, expect } from "../helpers/base-fixtures";
import { loginAs } from "../helpers/auth";
import { ADMIN_USER } from "../helpers/test-users";

type ExportRow = Record<string, string>;

test.describe("Export Users as XLSX", () => {
	test("Last Login column is populated after login", async ({ page }) => {
		await loginAs(page, ADMIN_USER);

		const response = await page.request.get("/api/admin/users/export");

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("spreadsheetml");

		const buffer = await response.body();
		const wb = XLSX.read(buffer, { type: "buffer" });
		const ws = wb.Sheets[wb.SheetNames[0]];
		const rows = XLSX.utils.sheet_to_json<ExportRow>(ws);

		const adminRow = rows.find((r) => r.Email === ADMIN_USER.email);
		expect(adminRow).toBeDefined();
		// Before the session hook fix this was always empty
		expect(adminRow?.["Last Login"]).toBeTruthy();
	});

	test("writes user-controlled formula text as plain string cells", async ({
		page,
	}) => {
		const { createTestUser, deleteTestUser } = await import("../helpers/test-db");
		const evil = await createTestUser({
			email: `formula-${Date.now()}@e2e.local`,
			firstName: "=1+2",
			lastName: "@SUM(A1)",
		});

		try {
			await loginAs(page, ADMIN_USER);
			const response = await page.request.get("/api/admin/users/export");
			expect(response.status()).toBe(200);

			const buffer = await response.body();
			const wb = XLSX.read(buffer, { type: "buffer" });
			const ws = wb.Sheets[wb.SheetNames[0]];
			const rows = XLSX.utils.sheet_to_json<ExportRow>(ws);
			const row = rows.find((r) => r.Email === evil.email);

			// Typed string cells carry no formula, so Excel shows the text verbatim.
			expect(row).toBeDefined();
			expect(row?.["First Name"]).toBe("=1+2");
			expect(row?.["Last Name"]).toBe("@SUM(A1)");
			const formulaCells = Object.entries(ws).filter(
				([ref, cell]) => !ref.startsWith("!") && "f" in cell,
			);
			expect(formulaCells).toEqual([]);
		} finally {
			await deleteTestUser(evil.id);
		}
	});
});
