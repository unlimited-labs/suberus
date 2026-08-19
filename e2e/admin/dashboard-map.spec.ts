import { expect, test } from "../helpers/base-fixtures";
import { getPrisma } from "../helpers/test-db";
import { ADMIN_USER } from "../helpers/test-users";

test.describe("Admin Dashboard - Users by Country map", () => {
	test.beforeEach(async () => {
		const prisma = getPrisma();
		await prisma.user.update({
			where: { email: ADMIN_USER.email },
			data: { country: "Poland" },
		});
	});

	test("renders the GL map, not just its container", async ({ page }) => {
		const mapErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error" && /maplibre|worker/i.test(msg.text())) {
				mapErrors.push(msg.text());
			}
		});

		await page.goto("/admin/dashboard");
		await page
			.getByRole("heading", { name: "Admin Dashboard" })
			.waitFor({ timeout: 15000 });

		const map = page.getByTestId("map");
		await expect(map).toBeVisible({ timeout: 15000 });

		await expect(map.getByRole("button", { name: "Zoom in" })).toBeVisible({
			timeout: 15000,
		});

		// maplibre's loader clears only once the worker parses vector tiles; a bad
		// worker URL fails here and nowhere else in the suite.
		await expect(page.getByTestId("map-loader")).toBeHidden({
			timeout: 20000,
		});

		expect(mapErrors).toEqual([]);
	});
});
