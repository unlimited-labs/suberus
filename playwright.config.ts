import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
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
		// Admin tests - use admin auth
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
		// Submission tests - use user auth
		{
			name: "chromium-user",
			testMatch: /e2e\/submissions\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/user.json",
			},
		},
		{
			name: "mobile-user",
			testMatch: /e2e\/submissions\/.*\.spec\.ts/,
			dependencies: ["auth-setup"],
			use: {
				...devices["Pixel 5"],
				storageState: "e2e/.auth/user.json",
			},
		},
	],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3001",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
