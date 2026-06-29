import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Admin Dashboard
 */
export class AdminDashboardPage {
	readonly page: Page;
	readonly heading: Locator;
	readonly metricsGrid: Locator;
	readonly healthAlerts: Locator;
	readonly submissionChart: Locator;
	readonly reviewProgress: Locator;
	readonly recentActivity: Locator;
	readonly quickActions: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.getByRole("heading", { name: "Admin Dashboard" });
		this.metricsGrid = page.getByTestId("metrics-grid").first();
		this.healthAlerts = page.locator('[role="alert"]').first();
		this.submissionChart = page.getByText("Submissions by Status");
		this.reviewProgress = page.getByText("Review Progress");
		this.recentActivity = page.getByText("Recent Activity");
		this.quickActions = page.getByText("Quick Actions");
	}

	async goto() {
		await this.page.goto("/admin/dashboard");
		await this.heading.waitFor({ state: "visible", timeout: 30000 });
	}

	async waitForLoad() {
		await expect(this.heading).toBeVisible();
	}

	async getMetricValue(title: string): Promise<string> {
		const metricCard = this.page
			.getByTestId("metric-card")
			.filter({ hasText: title });
		const value = metricCard.getByTestId("metric-value");
		return (await value.textContent()) || "";
	}

	async clickQuickAction(actionName: string) {
		const action = this.page.getByRole("link", { name: actionName });
		await action.click();
	}

	async getAlertType(): Promise<"critical" | "warning" | "info" | "success" | null> {
		const alert = this.healthAlerts;
		if (!(await alert.isVisible())) {
			return null;
		}

		const alertText = await alert.textContent();
		if (!alertText) {
			return null;
		}

		if (alertText.includes("Critical")) return "critical";
		if (alertText.includes("Warning")) return "warning";
		if (alertText.includes("Info")) return "info";
		if (alertText.includes("Healthy")) return "success";
		return null;
	}

	async getActivityCount(): Promise<number> {
		const activityCard = this.page
			.getByText("Recent Activity")
			.locator("..")
			.locator("..")
			.first();
		const items = activityCard.locator('[role="link"]');
		return items.count();
	}
}
