import { expect, test } from "../helpers/base-fixtures";
import { getPrisma } from "../helpers/test-db";
import { ADMIN_USER } from "../helpers/test-users";

/**
 * Guards that maplibre actually boots in the browser: the map's children render
 * only once the GL instance exists, which needs the worker bundle to resolve.
 * A broken worker URL fails here and nowhere else in the suite.
 */
test.describe("Admin Dashboard - Users by Country map", () => {
	test.beforeEach(async () => {
		// The card short-circuits to "No country data available" on an empty set,
		// and seeded users carry no country.
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

		// Controls are children of <Map>, which renders them only after the GL
		// instance is constructed — catches a broken import/namespace change.
		await expect(map.getByRole("button", { name: "Zoom in" })).toBeVisible({
			timeout: 15000,
		});

		// The loader clears on load+styledata, which needs the worker to parse
		// vector tiles — this is what a bad worker URL fails.
		await expect(page.getByTestId("map-loader")).toBeHidden({
			timeout: 20000,
		});

		expect(mapErrors).toEqual([]);
	});
});
