import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: "html",
	globalSetup: "./e2e/setup/global-setup.ts",
	use: {
		baseURL: "http://localhost:3001",
		trace: "on-first-retry",
		screenshot: "on",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile",
			use: {
				...devices["Pixel 5"],
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
