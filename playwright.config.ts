import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: false,
	retries: 2,
	workers: 4,
	reporter:
		process.env.CI || process.env.CLAUDE
			? [["line"], ["html", { open: "never" }]]
			: "list",
	globalSetup: "./e2e/setup/global-setup.ts",
	use: {
		baseURL: "http://localhost:3001",
		trace: "on-first-retry",
		screenshot: "on",
		video: "retain-on-failure",
		timezoneId: "UTC",
	},
	projects: [
		// Auth setup - runs first to save authenticated state
		{
			name: "auth-setup",
			testMatch: /auth\.setup\.ts/,
		},
		// Unauthenticated tests (login, register, forgot-password)
		{
			name: "chromium",
			testMatch: /e2e\/auth\/.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile",
			testMatch: /e2e\/auth\/.*\.spec\.ts/,
			use: { ...devices["Pixel 5"] },
		},
		// Admin tests - use admin auth (wait for settings-integration to avoid conflicts)
		{
			name: "chromium-admin",
			testMatch: /e2e\/admin\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/admin.json",
			},
		},
		{
			name: "mobile-admin",
			testMatch: /e2e\/admin\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Pixel 5"],
				storageState: "e2e/.auth/admin.json",
			},
		},
		// Submission tests - use user auth (wait for settings-integration to complete first)
		{
			name: "chromium-user",
			testMatch: /e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access).*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/user.json",
			},
		},
		{
			name: "mobile-user",
			testMatch: /e2e\/submissions\/(?!settings-integration|coauthor-visibility|file-access).*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Pixel 5"],
				storageState: "e2e/.auth/user.json",
			},
		},
		// Settings integration tests - runs FIRST, modifies global settings then restores
		{
			name: "chromium-integration",
			testMatch: /settings-integration\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// Email verification tests - use unverified user auth
		{
			name: "chromium-unverified",
			testMatch: /e2e\/email-verification\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/unverified.json",
			},
		},
		// Profile tests - use user auth
		{
			name: "chromium-profile",
			testMatch: /e2e\/profile\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/user.json",
			},
		},
		{
			name: "mobile-profile",
			testMatch: /e2e\/profile\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Pixel 5"],
				storageState: "e2e/.auth/user.json",
			},
		},
		// User settings tests - use user auth
		{
			name: "chromium-settings",
			testMatch: /e2e\/settings\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/user.json",
			},
		},
		// Review workflow tests - admin actions (use admin auth)
		{
			name: "chromium-reviews-admin",
			testMatch: /e2e\/reviews\/admin-submissions\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/admin.json",
			},
		},
		// Review workflow tests - cross-role (no storageState, handles auth internally)
		{
			name: "chromium-reviews-workflow",
			testMatch: /e2e\/reviews\/workflow\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// Reviewer tests - use reviewer auth
		{
			name: "chromium-reviewer",
			testMatch: /e2e\/reviews\/reviewer\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/reviewer.json",
			},
		},
		// Complete workflow tests - cross-role (handles auth internally)
		{
			name: "chromium-workflows",
			testMatch: /e2e\/workflows\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// API tests - no browser auth needed (uses own authorization)
		{
			name: "api",
			testMatch: /e2e\/api\/.*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// Navigation tests - cross-role (handles auth internally)
		{
			name: "chromium-navigation",
			testMatch: /e2e\/navigation\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// Fee tests - cross-role (handles auth internally)
		{
			name: "chromium-fee",
			testMatch: /e2e\/fee\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// Co-author visibility tests - cross-role (handles auth internally)
		{
			name: "chromium-coauthor",
			testMatch: /coauthor-visibility\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// File access tests - cross-role (handles auth internally)
		{
			name: "chromium-file-access",
			testMatch: /file-access\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
			},
		},
		// Reminder settings tests - admin auth (UI tests)
		{
			name: "chromium-reminder-settings",
			testMatch: /e2e\/reminders\/reminder-settings\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/admin.json",
			},
		},
		// Reminder email tests - no browser auth needed (DB + Mailpit only)
		{
			name: "reminder-emails",
			testMatch: /e2e\/reminders\/reminder-emails\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
			},
		},
	],
	webServer: {
		command: "pnpm build && pnpm preview",
		url: "http://localhost:3001",
		env: { PORT: "3001" },
		reuseExistingServer: true,
		timeout: 180_000,
	},
});
