import { type Page, type Locator } from "@playwright/test";
import {
	test as base,
	expect as baseExpect,
	type TestRunContext,
	type CleanupContext,
} from "../helpers/base-fixtures";

// Test data
export const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
};

export const REVIEWER_USER = {
	email: "reviewer@e2e.local",
	password: "testpass123",
	firstName: "Reviewer",
	lastName: "User",
};

export const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
};

// Re-export test-db helpers for Prisma seeding in tests
export {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
	deleteSubmission,
	getTestUserIds,
	getPrisma,
} from "../helpers/test-db";

// Re-export base fixtures types
export type { TestRunContext, CleanupContext } from "../helpers/base-fixtures";

// Generate unique submission data
export function createTestSubmission(suffix?: string) {
	const id = suffix ?? Date.now().toString();
	return {
		type: "ABSTRACT" as const,
		title: `${id}_Review Test Submission`,
		content: `This is a comprehensive test abstract content for submission ${id}. The purpose of this submission is to test the review workflow system including reviewer assignment, review submission, and editor decisions. This abstract discusses the methodology, results, and conclusions of our testing approach. The testing framework ensures that all components are functioning as expected and that the user experience is smooth and intuitive. Additional context is provided here to meet the minimum character requirements for the abstract field.`,
		keywords: [`test-${id}`, "review", "workflow"],
	};
}

// Login helpers
export async function loginAsAdmin(page: Page) {
	await page.goto("/login");
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
	await page.getByLabel("E-mail").fill(ADMIN_USER.email);
	await page.getByLabel("Password").fill(ADMIN_USER.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	// API auth + session + redirect
	await page.waitForURL("/", { timeout: 30000 });
}

export async function loginAsReviewer(page: Page) {
	await page.goto("/login");
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
	await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
	await page.getByLabel("Password").fill(REVIEWER_USER.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	// API auth + session + redirect
	await page.waitForURL("/", { timeout: 30000 });
}

export async function loginAsTestUser(page: Page) {
	await page.goto("/login");
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
	await page.getByLabel("E-mail").fill(TEST_USER.email);
	await page.getByLabel("Password").fill(TEST_USER.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	// API auth + session + redirect
	await page.waitForURL("/", { timeout: 30000 });
}

// Page Objects

/** Admin Submissions List Page */
export class AdminSubmissionsPage {
	readonly page: Page;
	readonly heading: Locator;
	readonly searchInput: Locator;
	readonly table: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.getByRole("heading", { name: "Submissions" });
		this.searchInput = page.getByPlaceholder("Search submissions...");
		this.table = page.getByRole("table");
	}

	async goto() {
		await this.page.goto("/admin/submissions");
		await this.heading.waitFor({ state: "visible", timeout: 30000 });
	}

	async search(query: string) {
		await this.searchInput.fill(query);
		await this.page.waitForLoadState("networkidle");
	}

	async openSubmissionDetail(title: string) {
		const row = this.page.locator("tr").filter({ hasText: title });
		await row.getByRole("button", { name: "Actions menu" }).click();
		await this.page.getByRole("menuitem", { name: "View" }).click();
	}

	getRowByTitle(title: string) {
		return this.page.locator("tr").filter({ hasText: title });
	}

	/** Get status badge for a submission row */
	getStatusBadge(title: string): Locator {
		return this.getRowByTitle(title).locator('[data-testid="submission-status"]').first();
	}

	async getSubmissionStatus(title: string) {
		// Fall back to class selector for table rows (data-testid is in detail views)
		const row = this.getRowByTitle(title);
		const testIdBadge = row.locator('[data-testid="submission-status"]');
		if (await testIdBadge.count() > 0) {
			return testIdBadge.first().textContent();
		}
		return row.locator("[data-slot='badge']").first().textContent();
	}
}

/** Admin Submission Detail Page */
export class AdminSubmissionDetailPage {
	readonly page: Page;
	readonly backButton: Locator;
	readonly assignReviewerButton: Locator;
	readonly deskRejectButton: Locator;
	readonly makeDecisionButton: Locator;
	readonly markReviewsCompleteButton: Locator;
	readonly readyForDecisionButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.backButton = page.getByRole("link", { name: "Back" });
		this.assignReviewerButton = page.getByRole("button", {
			name: "Assign Reviewer",
		});
		this.deskRejectButton = page.getByRole("button", { name: "Desk Reject" });
		this.makeDecisionButton = page.getByRole("button", {
			name: "Make Decision",
		});
		this.markReviewsCompleteButton = page.getByRole("button", {
			name: "Mark Reviews Complete",
		});
		this.readyForDecisionButton = page.getByRole("button", {
			name: "Ready for Decision",
		});
	}

	async goto(submissionId: string) {
		await this.page.goto(`/admin/submissions/${submissionId}`);
		await this.page.waitForLoadState("networkidle");
	}

	async waitForLoad() {
		await this.page.waitForLoadState("networkidle");
	}

	/** Get submission status badge */
	getStatusBadge(): Locator {
		return this.page.locator('[data-testid="submission-status"]');
	}

	async getStatus() {
		return this.getStatusBadge().textContent();
	}

	async openAssignReviewerDialog() {
		await this.assignReviewerButton.click();
		await this.page.getByRole("dialog").waitFor({ state: "visible" });
	}

	async openDeskRejectDialog() {
		await this.deskRejectButton.click();
		await this.page.getByRole("dialog").waitFor({ state: "visible" });
	}

	async openEditorDecisionDialog() {
		await this.makeDecisionButton.click();
		await this.page.getByRole("dialog").waitFor({ state: "visible" });
	}

	async clickMarkReviewsComplete() {
		await this.markReviewsCompleteButton.click();
	}

	async clickReadyForDecision() {
		await this.readyForDecisionButton.click();
	}

	async switchToReviewsTab() {
		await this.page.getByRole("tab", { name: /Reviews/i }).click();
	}

	async switchToHistoryTab() {
		await this.page.getByRole("tab", { name: /History/i }).click();
	}

	async getReviewerCount() {
		// Match pattern like "Reviewers (0/1)" or "Reviewers (1/2)"
		const reviewerLabel = this.page.locator("text=/Reviewers \\(\\d+\\/\\d+\\)/");
		const text = await reviewerLabel.textContent();
		const match = text?.match(/\((\d+)\/(\d+)\)/);
		if (match) {
			return {
				completed: parseInt(match[1], 10),
				total: parseInt(match[2], 10),
			};
		}
		return { completed: 0, total: 0 };
	}
}

/** Assign Reviewer Dialog */
export class AssignReviewerDialog {
	readonly page: Page;
	readonly searchInput: Locator;
	readonly closeButton: Locator;
	readonly deadlineInput: Locator;

	constructor(page: Page) {
		this.page = page;
		this.searchInput = page.getByPlaceholder(
			"Search by name, email, or affiliation..."
		);
		// Use the dialog close button (X icon) in the dialog header
		this.closeButton = page.locator('[data-slot="dialog-close"]').first();
		this.deadlineInput = page.locator('input[type="date"]');
	}

	async searchReviewer(query: string) {
		await this.searchInput.fill(query);
		await this.page.waitForLoadState("networkidle");
	}

	async assignReviewerByEmail(email: string) {
		// Find reviewer row by email and click Assign
		const reviewerRow = this.page
			.locator("div")
			.filter({ hasText: email })
			.first();
		await reviewerRow.getByRole("button", { name: "Assign" }).click();
		await this.page.waitForLoadState("networkidle");
	}

	async cancelAssignmentByName(name: string) {
		// Find the assignment row by name in Current Reviewers section
		const section = this.page.locator("div").filter({
			has: this.page.getByText("Current Reviewers"),
		});
		const assignmentRow = section.locator("div").filter({ hasText: name });
		await assignmentRow.getByRole("button").click();
		await this.page.waitForLoadState("networkidle");
	}

	async getActiveAssignmentsCount() {
		const label = this.page.getByText(/Current Reviewers \(\d+\/\d+\)/);
		const text = await label.textContent();
		const match = text?.match(/\((\d+)\/\d+\)/);
		return match ? parseInt(match[1], 10) : 0;
	}

	async setDeadline(date: string) {
		await this.deadlineInput.fill(date);
	}

	async close() {
		await this.closeButton.click();
	}
}

/** Desk Reject Dialog */
export class DeskRejectDialog {
	readonly page: Page;
	readonly reasonInput: Locator;
	readonly confirmButton: Locator;
	readonly cancelButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.reasonInput = page.getByLabel(/Reason for Rejection/i);
		this.confirmButton = page.getByRole("button", { name: "Reject Submission" });
		this.cancelButton = page.getByRole("button", { name: "Cancel" });
	}

	async fillReason(reason: string) {
		await this.reasonInput.fill(reason);
	}

	async confirm() {
		// Ensure button is enabled and visible before clicking
		await baseExpect(this.confirmButton).toBeEnabled({ timeout: 5000 });
		await baseExpect(this.confirmButton).toBeVisible({ timeout: 5000 });

		// Click with force to ensure it registers even if there's an overlay
		await this.confirmButton.click({ force: true });

		// Dialog animation + API response
		await Promise.race([
			this.page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			this.page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);
	}
}

/** Editor Decision Dialog */
export class EditorDecisionDialog {
	readonly page: Page;
	readonly reasoningInput: Locator;
	readonly letterInput: Locator;
	readonly submitButton: Locator;
	readonly cancelButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.reasoningInput = page.getByLabel(/Internal Reasoning/i);
		this.letterInput = page.getByLabel(/Letter to Author/i);
		this.submitButton = page.getByRole("button", { name: "Submit Decision" });
		this.cancelButton = page.getByRole("button", { name: "Cancel" });
	}

	async selectDecision(
		decision: "Accept" | "Reject" | "Revise & Resubmit" | "Conditionally Accept"
	) {
		// Click the decision button by its label
		await this.page
			.locator("button")
			.filter({ hasText: new RegExp(`^${decision}$`, "i") })
			.click();
	}

	async fillReasoning(reasoning: string) {
		await this.reasoningInput.fill(reasoning);
	}

	async fillLetter(letter: string) {
		await this.letterInput.fill(letter);
	}

	async submit() {
		await this.submitButton.click();
		await this.page.waitForLoadState("networkidle");
	}
}

/** Reviewer Assignments Page (My Reviews) */
export class ReviewerAssignmentsPage {
	readonly page: Page;
	readonly heading: Locator;
	readonly emptyState: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.getByRole("heading", { name: /Reviews/i });
		this.emptyState = page.getByText(/No reviews assigned/i);
	}

	async goto() {
		await this.page.goto("/reviews");
		await this.page.waitForLoadState("networkidle");
	}

	async openReview(submissionTitle: string) {
		// Find the card/row with submission title and click to start review
		const row = this.page.locator("tr, [class*='card'], div").filter({
			hasText: submissionTitle,
		});
		// Click the row or the "Start Review" / "Continue" link
		const reviewLink = row.getByRole("link").first();
		await reviewLink.click();
		await this.page.waitForLoadState("networkidle");
	}

	async getAssignmentStatus(submissionTitle: string) {
		const row = this.page.locator("tr, [class*='card'], div").filter({
			hasText: submissionTitle,
		});
		return row.locator("[class*='badge']").first().textContent();
	}

	async hasAssignment(submissionTitle: string) {
		const row = this.page.locator("tr, [class*='card'], div").filter({
			hasText: submissionTitle,
		});
		return row.count().then((c) => c > 0);
	}
}

/** Review Form Page */
export class ReviewFormPage {
	readonly page: Page;
	readonly backButton: Locator;
	readonly commentsInput: Locator;
	readonly privateNotesInput: Locator;
	readonly submitButton: Locator;

	constructor(page: Page) {
		this.page = page;
		this.backButton = page.getByRole("link", { name: "Back to Reviews" });
		// The label is "Review Comments" but the textarea has id="comments"
		this.commentsInput = page.locator("#comments");
		this.privateNotesInput = page.locator("#privateNotes");
		this.submitButton = page.getByRole("button", { name: "Submit Review" });
	}

	async goto(assignmentId: string) {
		await this.page.goto(`/reviews/${assignmentId}`);
		await this.page.waitForLoadState("networkidle");
	}

	async selectDecision(
		decision: "Accept" | "Accept with Minor Revisions" | "Revise and Resubmit" | "Reject"
	) {
		// Buttons have the decision name followed by description text
		await this.page
			.getByRole("button", { name: new RegExp(`${decision}`, "i") })
			.first()
			.click();
	}

	async fillComments(comments: string) {
		await this.commentsInput.fill(comments);
	}

	async fillPrivateNotes(notes: string) {
		await this.privateNotesInput.fill(notes);
	}

	async setScore(criteria: "Novelty" | "Methodology" | "Clarity" | "Relevance", value: number) {
		// Find the criteria section and click the score button
		const section = this.page
			.locator("div")
			.filter({ hasText: new RegExp(criteria, "i") })
			.first();
		// Score buttons are 1-5
		await section.getByRole("button", { name: value.toString(), exact: true }).click();
	}

	async setConfidenceLevel(value: number) {
		// Confidence level section
		const section = this.page.locator("div").filter({
			hasText: /Confidence Level/i,
		});
		await section.getByRole("button", { name: value.toString(), exact: true }).click();
	}

	async submit() {
		await this.submitButton.click();
		await this.page.waitForLoadState("networkidle");
	}

	async isSubmitEnabled() {
		return this.submitButton.isEnabled();
	}

	/**
	 * Check if the page shows "Review Not Found" error.
	 * This happens when mock data has invalid UUIDs.
	 */
	async isErrorPage(): Promise<boolean> {
		try {
			await this.page.waitForLoadState("domcontentloaded");
			// Wait for error heading with explicit waitFor
			await this.page
				.getByRole("heading", { name: "Review Not Found" })
				.waitFor({ state: "visible", timeout: 3000 });
			return true;
		} catch {
			return false;
		}
	}
}

// Extended test with fixtures
interface ReviewFixtures {
	testRun: TestRunContext;
	cleanup: CleanupContext;
	adminSubmissionsPage: AdminSubmissionsPage;
	adminSubmissionDetailPage: AdminSubmissionDetailPage;
	assignReviewerDialog: AssignReviewerDialog;
	deskRejectDialog: DeskRejectDialog;
	editorDecisionDialog: EditorDecisionDialog;
	reviewerAssignmentsPage: ReviewerAssignmentsPage;
	reviewFormPage: ReviewFormPage;
	testSubmission: ReturnType<typeof createTestSubmission>;
}

export const test = base.extend<ReviewFixtures>({
	adminSubmissionsPage: async ({ page }, use) => {
		await use(new AdminSubmissionsPage(page));
	},
	adminSubmissionDetailPage: async ({ page }, use) => {
		await use(new AdminSubmissionDetailPage(page));
	},
	assignReviewerDialog: async ({ page }, use) => {
		await use(new AssignReviewerDialog(page));
	},
	deskRejectDialog: async ({ page }, use) => {
		await use(new DeskRejectDialog(page));
	},
	editorDecisionDialog: async ({ page }, use) => {
		await use(new EditorDecisionDialog(page));
	},
	reviewerAssignmentsPage: async ({ page }, use) => {
		await use(new ReviewerAssignmentsPage(page));
	},
	reviewFormPage: async ({ page }, use) => {
		await use(new ReviewFormPage(page));
	},
	testSubmission: async ({ testRun }, use) => {
		await use(createTestSubmission(testRun.testRunId));
	},
});

export { baseExpect as expect };
