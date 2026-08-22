import { test, expect } from "../helpers/base-fixtures";
import { getPrisma, setAppSetting } from "../helpers/test-db";
import {
	DEFAULT_ORAL_PRESENTATION_CONFIG,
	DEFAULT_POSTER_CONFIG,
	DEFAULT_FULL_PAPER_CONFIG,
} from "../../src/features/settings/defaults";

const SETTING_KEYS = [
	"SUBMISSION_TYPE_ORAL_PRESENTATION",
	"SUBMISSION_TYPE_POSTER",
	"SUBMISSION_TYPE_FULL_PAPER",
] as const;

type SettingValue = object | null;

test.describe.serial("Submissions - No Active Types", () => {
	const originalConfigs: Record<string, SettingValue> = {};

	test.beforeAll(async () => {
		const db = getPrisma();
		for (const key of SETTING_KEYS) {
			const setting = await db.appSetting.findUnique({ where: { key } });
			originalConfigs[key] = (setting?.value as object) ?? null;
		}

		await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
			...DEFAULT_ORAL_PRESENTATION_CONFIG,
			isActive: false,
		});
		await setAppSetting("SUBMISSION_TYPE_POSTER", {
			...DEFAULT_POSTER_CONFIG,
			isActive: false,
		});
		await setAppSetting("SUBMISSION_TYPE_FULL_PAPER", {
			...DEFAULT_FULL_PAPER_CONFIG,
			isActive: false,
		});
	});

	test.afterAll(async () => {
		const defaults: Record<string, object> = {
			SUBMISSION_TYPE_ORAL_PRESENTATION: DEFAULT_ORAL_PRESENTATION_CONFIG,
			SUBMISSION_TYPE_POSTER: DEFAULT_POSTER_CONFIG,
			SUBMISSION_TYPE_FULL_PAPER: DEFAULT_FULL_PAPER_CONFIG,
		};
		for (const key of SETTING_KEYS) {
			await setAppSetting(key, originalConfigs[key] ?? defaults[key]);
		}
	});

	test("New Submission button is disabled on submissions list", async ({ page }) => {
		await page.goto("/submissions");

		await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
		const button = page.getByRole("button", { name: "New Submission", exact: true });
		await expect(button).toBeVisible();
		await expect(button).toBeDisabled();
	});

	test("new submission page shows unavailable message", async ({ page }) => {
		await page.goto("/submissions/new");

		await expect(
			page.getByText("No submission types are currently available"),
		).toBeVisible({ timeout: 15000 });
	});
});
