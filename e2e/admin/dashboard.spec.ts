import { test, expect } from "@playwright/test";

/**
 * E2E tests for Admin Dashboard
 * Tests admin dashboard metrics, charts, and health alerts
 * NOTE: chromium-admin project uses stored auth state, no login needed
 */

test.describe("Admin Dashboard", () => {
	test("should display admin dashboard page", async ({ page }) => {
		// Act
		await page.goto("/admin/dashboard");

		// Assert
		await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible({ timeout: 10000 });
	});

	test("should display metrics cards", async ({ page }) => {
		// Act
		await page.goto("/admin/dashboard");
		await page.getByRole("heading", { name: "Admin Dashboard" }).waitFor({ timeout: 10000 });

		// Assert - Check all 4 metric cards are visible
		await expect(page.getByText("Total Users")).toBeVisible();
		await expect(page.getByText("Total Submissions")).toBeVisible();
		await expect(page.getByText("Pending Reviews")).toBeVisible();
		await expect(page.getByText("Fees Collected")).toBeVisible();
	});

	test("should display charts", async ({ page }) => {
		// Act
		await page.goto("/admin/dashboard");
		await page.getByRole("heading", { name: "Admin Dashboard" }).waitFor({ timeout: 10000 });

		// Assert
		await expect(page.getByText("Submissions by Status")).toBeVisible();
		await expect(page.getByText("Review Progress")).toBeVisible();
	});

	test("should display recent activity and quick actions", async ({ page }) => {
		// Act
		await page.goto("/admin/dashboard");
		await page.getByRole("heading", { name: "Admin Dashboard" }).waitFor({ timeout: 10000 });

		// Assert - Use first() to avoid strict mode violation
		await expect(page.getByText("Recent Activity").first()).toBeVisible();
		await expect(page.getByText("Quick Actions").first()).toBeVisible();
	});

	test("should have working quick action links", async ({ page }) => {
		// Act
		await page.goto("/admin/dashboard");
		await page.getByRole("heading", { name: "Admin Dashboard" }).waitFor({ timeout: 10000 });

		// Assert - Check quick action links exist in main content (not sidebar)
		const mainContent = page.getByRole("main");
		await expect(mainContent.getByRole("link", { name: "Export Users" })).toBeVisible();
		await expect(mainContent.getByRole("link", { name: "Manage Users" })).toBeVisible();
		await expect(mainContent.getByRole("link", { name: "View Submissions" })).toBeVisible();
		await expect(mainContent.getByRole("link", { name: "Configuration" })).toBeVisible();
	});

	test("should be mobile responsive", async ({ page }) => {
		// Arrange
		await page.setViewportSize({ width: 375, height: 667 });

		// Act
		await page.goto("/admin/dashboard");
		await page.getByRole("heading", { name: "Admin Dashboard" }).waitFor({ timeout: 10000 });

		// Assert
		await expect(page.getByText("Total Users")).toBeVisible();
		await expect(page.getByText("Quick Actions")).toBeVisible();
	});
});
