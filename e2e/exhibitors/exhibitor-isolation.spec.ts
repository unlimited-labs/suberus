import { getPrisma } from "../helpers/test-db";
import {
	createExhibitorUser,
	deleteExhibitorUserByEmail,
	expect,
	loginAsExhibitor,
	resetExhibitorConfig,
	setExhibitorConfig,
	submitExhibitorApplication,
	test,
} from "./fixtures";

const createdEmails: string[] = [];

// Mutates the shared EXHIBITOR config — keep serial; each test arranges its own
// config state via direct DB writes and afterAll restores the defaults.
test.describe.serial("Exhibitor feature isolation", () => {
	test.afterAll(async () => {
		for (const email of createdEmails) {
			await deleteExhibitorUserByEmail(email).catch(() => {});
		}
		await resetExhibitorConfig();
	});

	test("disabled by default: no account-type choice, no admin nav entry", async ({
		page,
		adminPage,
	}) => {
		await resetExhibitorConfig(); // feature off

		// Register page shows the plain form without account-type radio cards
		await page.goto("/register");
		await expect(page.getByLabel("E-mail *")).toBeVisible();
		await expect(
			page.getByTestId("register-account-type-exhibitor"),
		).not.toBeVisible();
		await expect(
			page.getByTestId("register-account-type-participant"),
		).not.toBeVisible();

		// Admin nav has no Exhibitors entry
		await adminPage.goto("/admin/dashboard");
		const adminNav = adminPage.getByRole("navigation");
		await expect(
			adminNav.getByRole("link", { name: "Settings" }),
		).toBeVisible();
		await expect(
			adminNav.getByRole("link", { name: "Exhibitors", exact: true }),
		).not.toBeVisible();
	});

	test("settings section: master switch reveals options, save persists and enables nav", async ({
		adminPage,
	}) => {
		await resetExhibitorConfig(); // start disabled

		// Exhibitors section lives on the Conference tab (default tab)
		await adminPage.goto("/admin/settings");
		const masterSwitch = adminPage.getByTestId("settings-exhibitors-enabled");
		await expect(masterSwitch).toBeVisible();
		await expect(masterSwitch).toHaveAttribute("aria-checked", "false");
		await expect(
			adminPage.getByTestId("settings-exhibitors-include-in-planner"),
		).not.toBeVisible();
		await expect(
			adminPage.getByTestId("settings-exhibitors-allow-presentation"),
		).not.toBeVisible();

		// Master ON reveals the dependent switches
		await masterSwitch.click();
		await expect(
			adminPage.getByTestId("settings-exhibitors-include-in-planner"),
		).toBeVisible();
		await expect(
			adminPage.getByTestId("settings-exhibitors-allow-presentation"),
		).toBeVisible();

		// Save via the section's own Save button
		const section = adminPage
			.locator("section")
			.filter({ has: adminPage.getByRole("heading", { name: "Exhibitors" }) });
		await section.getByRole("button", { name: "Save" }).click();
		await expect(adminPage.getByText("Exhibitor settings saved")).toBeVisible({
			timeout: 10000,
		});

		// Persisted to the DB
		const db = getPrisma();
		const setting = await db.appSetting.findUniqueOrThrow({
			where: { key: "SUBMISSION_TYPE_EXHIBITOR" },
		});
		expect(setting.value).toMatchObject({ isActive: true });

		// Admin nav now shows the Exhibitors entry
		await adminPage.reload();
		await expect(
			adminPage
				.getByRole("navigation")
				.getByRole("link", { name: "Exhibitors", exact: true }),
		).toBeVisible();
	});

	test("exhibitor user nav and redirects to the exhibitor panel", async ({
		page,
		testRun,
	}) => {
		await setExhibitorConfig({ isActive: true });
		const email = `exhibitor-nav-${testRun.testRunId}@e2e.local`;
		createdEmails.push(email);
		await createExhibitorUser(email);

		await loginAsExhibitor(page, email);

		// Nav: Exhibitor/Fee/Profile/Dashboard, but no Submissions/Reviews
		const nav = page.getByRole("navigation");
		await expect(
			nav.getByRole("link", { name: "Exhibitor", exact: true }),
		).toBeVisible();
		await expect(nav.getByRole("link", { name: "Fee", exact: true })).toBeVisible();
		await expect(
			nav.getByRole("link", { name: "Profile", exact: true }),
		).toBeVisible();
		await expect(
			nav.getByRole("link", { name: "Dashboard", exact: true }),
		).toBeVisible();
		await expect(
			nav.getByRole("link", { name: "Submissions", exact: true }),
		).not.toBeVisible();
		await expect(
			nav.getByRole("link", { name: "Reviews", exact: true }),
		).not.toBeVisible();

		// /submissions redirects to the exhibitor panel
		await page.goto("/submissions");
		await page.waitForURL(/\/exhibitor/, { timeout: 15000 });
		await expect(page.getByTestId("exhibitor-status")).toBeVisible();

		// / redirects to the exhibitor panel
		await page.goto("/");
		await page.waitForURL(/\/exhibitor/, { timeout: 15000 });
		await expect(page.getByTestId("exhibitor-status")).toBeVisible();
	});

	test("withdrawal: confirm dialog → Withdrawn status, locked form", async ({
		page,
		testRun,
	}) => {
		await setExhibitorConfig({ isActive: true });
		const email = `exhibitor-wd-${testRun.testRunId}@e2e.local`;
		createdEmails.push(email);
		const companyName = testRun.prefix("Withdraw Co");
		await createExhibitorUser(email);

		await loginAsExhibitor(page, email);
		// Withdraw is only offered after the application has been submitted
		await expect(page.getByTestId("exhibitor-withdraw")).not.toBeVisible();
		await submitExhibitorApplication(page, companyName);

		await page.getByTestId("exhibitor-withdraw").click();
		await page.getByTestId("exhibitor-withdraw-confirm").click();

		await expect(page.getByTestId("exhibitor-status")).toContainText(
			"Withdrawn",
			{ timeout: 10000 },
		);
		await expect(page.getByText("Application withdrawn.")).toBeVisible();
		await expect(page.getByTestId("exhibitor-submit")).not.toBeVisible();
		await expect(page.getByTestId("exhibitor-withdraw")).not.toBeVisible();
		await expect(page.getByTestId("exhibitor-company-name")).toBeDisabled();
	});
});
