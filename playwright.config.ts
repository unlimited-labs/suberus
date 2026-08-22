import { defineConfig, devices } from "@playwright/test";
import type { TestOptions } from "./e2e/helpers/base-fixtures";

export const E2E_WORKERS = Number(process.env.E2E_WORKERS ?? 2);
export const E2E_OUTPUT_DIR = ".output-e2e";
export const E2E_BASE_PORT = 3031;
export const portFor = (i: number) => E2E_BASE_PORT + i;
// Use 127.0.0.1 (not "localhost"): under full-suite load on Windows, "localhost"
// intermittently resolves to IPv6 ::1, which the IPv4-only app server refuses
// (ECONNREFUSED ::1) — flaking page.goto navigations and page.request API calls.
export const baseUrlFor = (i: number) => `http://127.0.0.1:${portFor(i)}`;
export const PG_BASE =
	"postgresql://suberus:suberus_dev_password@localhost:5432";
export const dbNameFor = (i: number) => `suberus_e2e_${i}`;
export const dbUrlFor = (i: number) => `${PG_BASE}/${dbNameFor(i)}`;
export const fromAddrFor = (i: number) => `noreply-w${i}@suberus.local`;
export const E2E_GIT_COMMIT = "e2ecommit";
export const envFor = (i: number) => ({
	PORT: String(portFor(i)),
	E2E: "true",
	DATABASE_URL: dbUrlFor(i),
	APP_BASE_URL: baseUrlFor(i),
	SMTP_FROM_EMAIL: fromAddrFor(i),
	GIT_COMMIT: E2E_GIT_COMMIT,
	VERSION_POLL_INTERVAL_MS: "500",
	BULK_EMAIL_DELAY_SECONDS: "0",
	MCP_ENABLED: "true",
});

const roleProject = (
	name: string,
	testMatch: RegExp,
	opts: { role: string; device?: "desktop" | "mobile"; testIgnore?: RegExp },
) => ({
	name,
	testMatch,
	testIgnore: opts.testIgnore || undefined,
	dependencies: ["auth-setup"],
	use: {
		...devices[opts.device === "mobile" ? "Pixel 5" : "Desktop Chrome"],
		role: opts.role,
	},
});

export default defineConfig<TestOptions>({
	testDir: "./e2e",
	// File-level parallelism preserves each file's beforeAll/afterAll on one worker.
	fullyParallel: false,
	forbidOnly: false,
	retries: 2,
	workers: E2E_WORKERS,
	reporter: [
		["line"],
		["json", { outputFile: "test-results/results.json" }],
		["html", { open: "never" }],
	],
	globalSetup: "./e2e/setup/global-setup.ts",
	globalTeardown: "./e2e/setup/global-teardown.ts",
	use: {
		baseURL: baseUrlFor(0),
		trace: "on-first-retry",
		// only-on-failure: capturing a screenshot after every one of ~960 tests
		// adds constant memory/handle churn that contributed to native Chromium
		// worker crashes (exit 0xC0000409) under 2-worker load on Windows.
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		timezoneId: "UTC",
		// Headless tests don't need the GPU process; it's a known source of
		// 0xC0000409 worker crashes on Windows. Disable it for stability.
		launchOptions: { args: ["--disable-gpu"] },
	},
	projects: [
		{ name: "auth-setup", testMatch: /auth\.setup\.ts/ },

		{
			name: "chromium",
			testMatch: /e2e\/auth\/(?!registration-locks).*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile",
			testMatch: /e2e\/auth\/(?!registration-locks).*\.spec\.ts/,
			use: { ...devices["Pixel 5"] },
		},

		roleProject(
			"admin-conference-settings",
			/e2e\/admin\/conference-settings\.spec\.ts/,
			{ role: "admin" },
		),
		roleProject(
			"admin-date-format-settings",
			/e2e\/admin\/date-format-settings\.spec\.ts/,
			{ role: "admin" },
		),
		roleProject("admin-fee-settings", /e2e\/admin\/fee-settings\.spec\.ts/, {
			role: "admin",
		}),
		roleProject("admin-fee-enabled", /e2e\/admin\/fee-enabled\.spec\.ts/, {
			role: "admin",
		}),
		roleProject(
			"admin-finances-enabled",
			/e2e\/admin\/finances-enabled\.spec\.ts/,
			{ role: "admin" },
		),

		roleProject(
			"chromium-admin",
			/e2e\/admin\/(?!conference-settings|date-format-settings|fee-settings|fee-enabled|finances-enabled|task-mails-reminder|planner\/).*\.spec\.ts/,
			{ role: "admin" },
		),
		roleProject(
			"mobile-admin",
			/e2e\/admin\/(?!conference-settings|date-format-settings|fee-settings|fee-enabled|finances-enabled|task-mails-reminder|planner\/).*\.spec\.ts/,
			{ role: "admin", device: "mobile" },
		),

		roleProject("chromium-planner", /e2e\/admin\/planner\/.*\.spec\.ts/, {
			role: "admin",
			testIgnore: /mobile-planner\.spec\.ts/,
		}),

		roleProject("screenshots", /e2e\/screenshots\/.*\.spec\.ts/, {
			role: "admin",
		}),

		roleProject(
			"chromium-user",
			/e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access|no-active-types|deadline-locks).*\.spec\.ts/,
			{ role: "user" },
		),
		roleProject(
			"mobile-user",
			/e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access|no-active-types|deadline-locks).*\.spec\.ts/,
			{ role: "user", device: "mobile" },
		),
		roleProject("chromium-extraction", /e2e\/extraction\/.*\.spec\.ts/, {
			role: "user",
		}),
		roleProject("chromium-no-active-types", /no-active-types\.spec\.ts/, {
			role: "user",
		}),
		roleProject(
			"chromium-unverified",
			/e2e\/email-verification\/.*\.spec\.ts/,
			{ role: "unverified" },
		),
		roleProject("chromium-routing", /e2e\/routing\/.*\.spec\.ts/, {
			role: "user",
		}),
		roleProject("chromium-profile", /e2e\/profile\/.*\.spec\.ts/, {
			role: "user",
		}),
		roleProject("mobile-profile", /e2e\/profile\/.*\.spec\.ts/, {
			role: "user",
			device: "mobile",
		}),
		roleProject("chromium-settings", /e2e\/settings\/.*\.spec\.ts/, {
			role: "user",
		}),
		roleProject(
			"chromium-reviews-admin",
			/e2e\/reviews\/admin-submissions\.spec\.ts/,
			{ role: "admin" },
		),
		roleProject(
			"chromium-reviews-diff",
			/e2e\/reviews\/version-diff\.spec\.ts/,
			{ role: "admin" },
		),
		roleProject(
			"chromium-reviews-author-links",
			/e2e\/reviews\/author-profile-links\.spec\.ts/,
			{ role: "admin" },
		),
		roleProject("chromium-reviewer", /e2e\/reviews\/reviewer\.spec\.ts/, {
			role: "reviewer",
		}),
		roleProject(
			"chromium-reminder-settings",
			/e2e\/reminders\/reminder-settings\.spec\.ts/,
			{ role: "admin" },
		),
		roleProject(
			"task-mails-reminder",
			/e2e\/admin\/task-mails-reminder\.spec\.ts/,
			{ role: "admin", device: "mobile" },
		),

		{
			name: "chromium-registration-locks",
			testMatch: /registration-locks\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-deadline-locks",
			testMatch: /deadline-locks\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-integration",
			testMatch: /settings-integration\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-reviews-workflow",
			testMatch: /e2e\/reviews\/workflow\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-workflows",
			testMatch: /e2e\/workflows\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-exhibitors",
			testMatch: /e2e\/exhibitors\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "api",
			testMatch: /e2e\/api\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-navigation",
			testMatch: /e2e\/navigation\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-fee",
			testMatch: /e2e\/fee\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-coauthor",
			testMatch: /coauthor-visibility\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-file-access",
			testMatch: /file-access\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "reminder-emails",
			testMatch: /e2e\/reminders\/reminder-emails\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-bundle",
			testMatch: /e2e\/bundle\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
	],
	// No `webServer`: global-setup owns the server lifecycle (servers must not boot
	// before their per-worker DB is seeded). See e2e/setup/global-setup.ts.
});
