import * as XLSX from "xlsx";
import { test, expect } from "../helpers/base-fixtures";
import { loginAs } from "../helpers/auth";
import { ADMIN_USER } from "../helpers/test-users";

type ExportRow = Record<string, string>;

test.describe("Export Users as XLSX", () => {
	test("Last Login column is populated after login", async ({ page }) => {
		// Act — a fresh login creates a session, which sets lastLoginAt
		await loginAs(page, ADMIN_USER);

		const response = await page.request.get("/api/admin/users/export");

		// Assert
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
});
