import { defineConfig, devices } from "@playwright/test";
import type { TestOptions } from "./e2e/helpers/base-fixtures";

// Per-worker E2E isolation: each worker runs its own app server (port 3001+i)
// against its own database suberus_e2e_${i}. Dev DB/Mailpit/S3 are never touched.
export const E2E_WORKERS = Number(process.env.E2E_WORKERS ?? 2);
export const E2E_BASE_PORT = 3001;
export const portFor = (i: number) => E2E_BASE_PORT + i;
export const baseUrlFor = (i: number) => `http://localhost:${portFor(i)}`;
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
		screenshot: "on",
		video: "retain-on-failure",
		timezoneId: "UTC",
	},
	projects: [
		// Auth setup - logs in every role on every worker, saves per-worker state
		{
			name: "auth-setup",
			testMatch: /auth\.setup\.ts/,
		},
		// Unauthenticated tests (login, register, forgot-password)
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
		// Registration lock tests - mutate global settings
		{
			name: "chromium-registration-locks",
			testMatch: /registration-locks\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Admin settings tests - mutate shared settings (in-file save/restore)
		{
			name: "admin-conference-settings",
			testMatch: /e2e\/admin\/conference-settings\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "admin" },
		},
		{
			name: "admin-date-format-settings",
			testMatch: /e2e\/admin\/date-format-settings\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "admin" },
		},
		{
			name: "admin-fee-settings",
			testMatch: /e2e\/admin\/fee-settings\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "admin" },
		},
		// Admin tests - admin auth (excludes settings + planner + task-mails which have own projects)
		{
			name: "chromium-admin",
			testMatch: /e2e\/admin\/(?!conference-settings|date-format-settings|fee-settings|task-mails-reminder|planner\/).*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "admin" },
		},
		{
			name: "mobile-admin",
			testMatch: /e2e\/admin\/(?!conference-settings|date-format-settings|fee-settings|task-mails-reminder|planner\/).*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Pixel 5"], role: "admin" },
		},
		// Planner tests - desktop only for now
		{
			name: "chromium-planner",
			testMatch: /e2e\/admin\/planner\/.*\.spec\.ts/,
			testIgnore: /mobile-planner\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "admin" },
		},
		// Submission tests - user auth
		{
			name: "chromium-user",
			testMatch: /e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access|no-active-types|deadline-locks).*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "user" },
		},
		{
			name: "mobile-user",
			testMatch: /e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access|no-active-types|deadline-locks).*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Pixel 5"], role: "user" },
		},
		// Extraction tests - user auth, requires docling + LLM services
		{
			name: "chromium-extraction",
			testMatch: /e2e\/extraction\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "user" },
		},
		// No-active-types test - mutates global submission type configs
		{
			name: "chromium-no-active-types",
			testMatch: /no-active-types\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "user" },
		},
		// Deadline locks test - mutates global settings, cross-role internally
		{
			name: "chromium-deadline-locks",
			testMatch: /deadline-locks\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Settings integration tests - mutates global settings then restores
		{
			name: "chromium-integration",
			testMatch: /settings-integration\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Email verification tests - unverified user auth
		{
			name: "chromium-unverified",
			testMatch: /e2e\/email-verification\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "unverified" },
		},
		// Routing tests (404 page) - user auth
		{
			name: "chromium-routing",
			testMatch: /e2e\/routing\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "user" },
		},
		// Profile tests - user auth
		{
			name: "chromium-profile",
			testMatch: /e2e\/profile\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "user" },
		},
		{
			name: "mobile-profile",
			testMatch: /e2e\/profile\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Pixel 5"], role: "user" },
		},
		// User settings tests - user auth
		{
			name: "chromium-settings",
			testMatch: /e2e\/settings\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "user" },
		},
		// Review workflow tests - admin actions (admin auth)
		{
			name: "chromium-reviews-admin",
			testMatch: /e2e\/reviews\/admin-submissions\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "admin" },
		},
		// Review workflow tests - cross-role (handles auth internally)
		{
			name: "chromium-reviews-workflow",
			testMatch: /e2e\/reviews\/workflow\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Reviewer tests - reviewer auth
		{
			name: "chromium-reviewer",
			testMatch: /e2e\/reviews\/reviewer\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "reviewer" },
		},
		// Complete workflow tests - cross-role (handles auth internally)
		{
			name: "chromium-workflows",
			testMatch: /e2e\/workflows\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// API tests - no browser auth needed (uses own authorization)
		{
			name: "api",
			testMatch: /e2e\/api\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Navigation tests - cross-role (handles auth internally)
		{
			name: "chromium-navigation",
			testMatch: /e2e\/navigation\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Fee tests - cross-role (handles auth internally)
		{
			name: "chromium-fee",
			testMatch: /e2e\/fee\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Co-author visibility tests - cross-role (handles auth internally)
		{
			name: "chromium-coauthor",
			testMatch: /coauthor-visibility\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// File access tests - cross-role (handles auth internally)
		{
			name: "chromium-file-access",
			testMatch: /file-access\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Reminder settings tests - admin auth (UI tests)
		{
			name: "chromium-reminder-settings",
			testMatch: /e2e\/reminders\/reminder-settings\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Desktop Chrome"], role: "admin" },
		},
		// Reminder email tests - no browser auth needed (DB + Mailpit only)
		{
			name: "reminder-emails",
			testMatch: /e2e\/reminders\/reminder-emails\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Task reminder tests - API-only, admin auth
		{
			name: "task-mails-reminder",
			testMatch: /e2e\/admin\/task-mails-reminder\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: { ...devices["Pixel 5"], role: "admin" },
		},
		// Bundle tests - verify admin code splitting (handles auth internally)
		{
			name: "chromium-bundle",
			testMatch: /e2e\/bundle\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
	],
	// No `webServer`: global-setup owns the server lifecycle (servers must not boot
	// before their per-worker DB is seeded). See e2e/setup/global-setup.ts.
});
