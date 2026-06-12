import { defineConfig, devices } from "@playwright/test";
import type { TestOptions } from "./e2e/helpers/base-fixtures";

// Per-worker E2E isolation: each worker runs its own app server (port 3031+i)
// against its own database suberus_e2e_${i}. Dev DB/Mailpit/S3 are never touched.
export const E2E_WORKERS = Number(process.env.E2E_WORKERS ?? 2);
// Isolated build-output dir for E2E: keeps the production build the E2E servers
// serve from out of `.output`, so a concurrent dev `pnpm build` can't clobber it.
export const E2E_OUTPUT_DIR = ".output-e2e";
export const E2E_BASE_PORT = 3031;
export const portFor = (i: number) => E2E_BASE_PORT + i;
// Use 127.0.0.1 (not "localhost"): under full-suite load on Windows, "localhost"
// intermittently resolves to IPv6 ::1, which the IPv4-only app server refuses
// (ECONNREFUSED ::1) — flaking page.goto navigations and page.request API calls.
export const baseUrlFor = (i: number) => `http://127.0.0.1:${portFor(i)}`;
export const PG_BASE = "postgresql://suberus:suberus_dev_password@localhost:5432";
export const dbNameFor = (i: number) => `suberus_e2e_${i}`;
export const dbUrlFor = (i: number) => `${PG_BASE}/${dbNameFor(i)}`;
export const fromAddrFor = (i: number) => `noreply-w${i}@suberus.local`;
export const envFor = (i: number) => ({
	PORT: String(portFor(i)),
	E2E: "true",
	DATABASE_URL: dbUrlFor(i),
	APP_BASE_URL: baseUrlFor(i),
	SMTP_FROM_EMAIL: fromAddrFor(i),
});

// Role-authenticated project: storageState comes from the `role` option (resolved
// per worker by base-fixtures), so these all depend on auth-setup.
const roleProject = (
	name: string,
	testMatch: RegExp,
	opts: { role: string; device?: "desktop" | "mobile"; testIgnore?: RegExp },
) => ({
	name,
	testMatch,
	...(opts.testIgnore ? { testIgnore: opts.testIgnore } : {}),
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
	reporter:
		process.env.CI || process.env.CLAUDE
			? [["line"], ["html", { open: "never" }]]
			: "list",
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
		// Auth setup - logs in every role on every worker, saves per-worker state
		{ name: "auth-setup", testMatch: /auth\.setup\.ts/ },

		// Unauthenticated auth tests (login, register, forgot-password)
		{ name: "chromium", testMatch: /e2e\/auth\/(?!registration-locks).*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", testMatch: /e2e\/auth\/(?!registration-locks).*\.spec\.ts/, use: { ...devices["Pixel 5"] } },

		// Admin settings - mutate shared settings (in-file save/restore)
		roleProject("admin-conference-settings", /e2e\/admin\/conference-settings\.spec\.ts/, { role: "admin" }),
		roleProject("admin-date-format-settings", /e2e\/admin\/date-format-settings\.spec\.ts/, { role: "admin" }),
		roleProject("admin-fee-settings", /e2e\/admin\/fee-settings\.spec\.ts/, { role: "admin" }),

		// Admin (excludes settings + planner + task-mails, which have own projects)
		roleProject("chromium-admin", /e2e\/admin\/(?!conference-settings|date-format-settings|fee-settings|task-mails-reminder|planner\/).*\.spec\.ts/, { role: "admin" }),
		roleProject("mobile-admin", /e2e\/admin\/(?!conference-settings|date-format-settings|fee-settings|task-mails-reminder|planner\/).*\.spec\.ts/, { role: "admin", device: "mobile" }),

		// Planner - desktop only for now
		roleProject("chromium-planner", /e2e\/admin\/planner\/.*\.spec\.ts/, { role: "admin", testIgnore: /mobile-planner\.spec\.ts/ }),

		// Docs screenshot capture - no-op unless DOCS_SHOTS=1 (see e2e/screenshots/)
		roleProject("screenshots", /e2e\/screenshots\/.*\.spec\.ts/, { role: "admin" }),

		// Submissions - user auth
		roleProject("chromium-user", /e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access|no-active-types|deadline-locks).*\.spec\.ts/, { role: "user" }),
		roleProject("mobile-user", /e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access|no-active-types|deadline-locks).*\.spec\.ts/, { role: "user", device: "mobile" }),
		roleProject("chromium-extraction", /e2e\/extraction\/.*\.spec\.ts/, { role: "user" }),
		roleProject("chromium-no-active-types", /no-active-types\.spec\.ts/, { role: "user" }),
		roleProject("chromium-unverified", /e2e\/email-verification\/.*\.spec\.ts/, { role: "unverified" }),
		roleProject("chromium-routing", /e2e\/routing\/.*\.spec\.ts/, { role: "user" }),
		roleProject("chromium-profile", /e2e\/profile\/.*\.spec\.ts/, { role: "user" }),
		roleProject("mobile-profile", /e2e\/profile\/.*\.spec\.ts/, { role: "user", device: "mobile" }),
		roleProject("chromium-settings", /e2e\/settings\/.*\.spec\.ts/, { role: "user" }),
		roleProject("chromium-reviews-admin", /e2e\/reviews\/admin-submissions\.spec\.ts/, { role: "admin" }),
		roleProject("chromium-reviews-author-links", /e2e\/reviews\/author-profile-links\.spec\.ts/, { role: "admin" }),
		roleProject("chromium-reviewer", /e2e\/reviews\/reviewer\.spec\.ts/, { role: "reviewer" }),
		roleProject("chromium-reminder-settings", /e2e\/reminders\/reminder-settings\.spec\.ts/, { role: "admin" }),
		roleProject("task-mails-reminder", /e2e\/admin\/task-mails-reminder\.spec\.ts/, { role: "admin", device: "mobile" }),

		// Cross-role / global-mutating - auth handled internally, no role/deps
		{ name: "chromium-registration-locks", testMatch: /registration-locks\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-deadline-locks", testMatch: /deadline-locks\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-integration", testMatch: /settings-integration\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-reviews-workflow", testMatch: /e2e\/reviews\/workflow\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-workflows", testMatch: /e2e\/workflows\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-exhibitors", testMatch: /e2e\/exhibitors\/.*\.spec\.ts/, dependencies: ["auth-setup"], use: { ...devices["Desktop Chrome"] } },
		{ name: "api", testMatch: /e2e\/api\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-navigation", testMatch: /e2e\/navigation\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-fee", testMatch: /e2e\/fee\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-coauthor", testMatch: /coauthor-visibility\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-file-access", testMatch: /file-access\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "reminder-emails", testMatch: /e2e\/reminders\/reminder-emails\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "chromium-bundle", testMatch: /e2e\/bundle\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
	],
	// No `webServer`: global-setup owns the server lifecycle (servers must not boot
	// before their per-worker DB is seeded). See e2e/setup/global-setup.ts.
});
