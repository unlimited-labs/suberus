import { type Locator, type Page, expect } from "@playwright/test";

export class ProgramPlannerPage {
	readonly page: Page;
	readonly sidebar: Locator;
	readonly sidebarSearch: Locator;
	readonly sidebarSelectionBar: Locator;
	readonly bulkCreateButton: Locator;
	readonly bulkReadButton: Locator;
	readonly selectModeToggle: Locator;
	readonly roomFilterToggle: Locator;
	readonly capacityStrip: Locator;
	readonly issuesTrigger: Locator;
	readonly issuesPopover: Locator;
	readonly publishButton: Locator;
	readonly unpublishButton: Locator;
	readonly publishDialog: Locator;
	readonly publishConfirm: Locator;
	readonly publishIssuesList: Locator;
	readonly clearPlanButton: Locator;
	readonly clearPlanDialog: Locator;
	readonly clearPlanInput: Locator;
	readonly clearPlanConfirm: Locator;
	readonly createSessionDialog: Locator;
	readonly createEventDialog: Locator;
	readonly sessionEditor: Locator;
	readonly breakEditor: Locator;

	constructor(page: Page) {
		this.page = page;
		this.sidebar = page.getByTestId("unscheduled-sidebar");
		this.sidebarSearch = page.getByTestId("sidebar-search");
		this.sidebarSelectionBar = page.getByTestId("sidebar-selection-bar");
		this.bulkCreateButton = page.getByTestId("sidebar-bulk-create-session");
		this.bulkReadButton = page.getByTestId("sidebar-bulk-read");
		this.selectModeToggle = page.getByTestId("sidebar-toggle-select-mode");
		this.roomFilterToggle = page.getByTestId("room-filter-toggle");
		this.capacityStrip = page.getByTestId("capacity-strip");
		this.issuesTrigger = page.getByTestId("issues-popover-trigger");
		this.issuesPopover = page.getByTestId("issues-popover");
		this.publishButton = page.getByTestId("publish-button");
		this.unpublishButton = page.getByTestId("unpublish-button");
		this.publishDialog = page.getByTestId("publish-dialog");
		this.publishConfirm = page.getByTestId("publish-confirm");
		this.publishIssuesList = page.getByTestId("publish-issues-list");
		this.clearPlanButton = page.getByTestId("clear-plan-button");
		this.clearPlanDialog = page.getByTestId("clear-plan-dialog");
		this.clearPlanInput = page.getByTestId("clear-plan-confirm-input");
		this.clearPlanConfirm = page.getByTestId("clear-plan-confirm");
		this.createSessionDialog = page.getByTestId("create-session-dialog");
		this.createEventDialog = page.getByTestId("create-event-dialog");
		this.sessionEditor = page.getByTestId("session-editor");
		this.breakEditor = page.getByTestId("break-editor");
	}

	async goto() {
		await this.page.goto("/admin/program-planner");
		await expect(
			this.page.getByRole("heading", { name: "Program Planner" }),
		).toBeVisible({ timeout: 15000 });
	}

	unscheduledRow(submissionId: string): Locator {
		return this.page.getByTestId(`unscheduled-row-${submissionId}`);
	}

	sessionCard(sessionId: string): Locator {
		return this.page.getByTestId(`session-card-${sessionId}`);
	}

	breakCard(breakId: string): Locator {
		return this.page.getByTestId(`break-card-${breakId}`);
	}

	issueItem(index: number): Locator {
		return this.page.getByTestId(`issue-item-${index}`);
	}

	publishIssue(index: number): Locator {
		return this.page.getByTestId(`publish-issue-${index}`);
	}

	async openSessionEditor(sessionId: string) {
		await this.sessionCard(sessionId).click();
		await expect(this.sessionEditor).toBeVisible();
	}

	async openBreakEditor(breakId: string) {
		await this.breakCard(breakId).click();
		await expect(this.breakEditor).toBeVisible();
	}

	async openIssuesPopover() {
		await this.issuesTrigger.click();
		await expect(this.issuesPopover).toBeVisible();
	}

	async setGroupingMode(mode: "intake" | "presenter") {
		await this.page.getByTestId(`sidebar-grouping-${mode}`).click();
	}

	async searchUnscheduled(q: string) {
		await this.sidebarSearch.fill(q);
	}

	async enableSelectMode() {
		const pressed = await this.selectModeToggle.getAttribute("aria-pressed");
		if (pressed !== "true") await this.selectModeToggle.click();
		await expect(this.selectModeToggle).toHaveAttribute("aria-pressed", "true");
	}

	async selectUnscheduled(submissionIds: string[]) {
		await this.enableSelectMode();
		for (const id of submissionIds) {
			const row = this.unscheduledRow(id);
			await row.getByRole("checkbox").check();
		}
	}

	async openPublishDialog() {
		await this.publishButton.click();
		await expect(this.publishDialog).toBeVisible();
	}

	async openClearPlanDialog() {
		await this.clearPlanButton.click();
		await expect(this.clearPlanDialog).toBeVisible();
	}

	async confirmClearPlan() {
		await this.clearPlanInput.fill("UNDERSTOOD");
		await this.clearPlanConfirm.click();
		await expect(this.clearPlanDialog).toBeHidden();
	}

	async confirmPublish() {
		await this.publishDialog.getByRole("switch").click();
		await this.publishConfirm.click();
		await expect(this.publishDialog).toBeHidden();
	}
}
