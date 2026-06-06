import { expect } from "@playwright/test";
import {
	createAssignmentWithDeadline,
	createFee,
	createSubmission,
	createSubmissionWithReview,
	createSubmissionWithDecision,
	createTestUser,
	deleteSubmission,
	deleteTestUser,
} from "../helpers/test-db";
import { DEFAULT_PASSWORD } from "../helpers/test-users";
import { test } from "./fixtures";

// Track created entities for per-test cleanup
const createdSubmissions: string[] = [];
const createdUsers: string[] = [];

test.afterEach(async () => {
	for (const id of createdSubmissions.splice(0)) await deleteSubmission(id);
	for (const id of createdUsers.splice(0)) await deleteTestUser(id);
});

/** Open the submissions list filtered to this run's submissions only. */
async function gotoList(page: import("@playwright/test").Page, testRunId: string) {
	await page.goto("/admin/submissions");
	await page.getByPlaceholder("Search submissions...").fill(testRunId);
}

function row(page: import("@playwright/test").Page, title: string) {
	// Both desktop <tr> and mobile card share the testid (toggled by CSS),
	// so scope to the visible layout for the current viewport.
	return page
		.getByTestId("submission-row")
		.filter({ hasText: title, visible: true });
}

test.describe("Admin submissions — TODO column", () => {
	test("shows the right TODO per submission state", async ({ page, testRun }, testInfo) => {
		test.skip(
			testInfo.project.name === "mobile-admin",
			"TODO column (incl. muted hints) is desktop table only",
		);

		// Arrange — one submission per distinct admin action / waiting state
		const draft = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft",
			status: "DRAFT",
		});
		const submitted = await createSubmission({
			testRunId: testRun.testRunId,
			title: "NeedsReviewer",
			status: "SUBMITTED",
		});
		const overdue = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Overdue",
		});
		const awaitingDecision = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "NeedsDecision",
		});
		const conditional = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Conditional",
			editorDecision: "CONDITIONALLY_ACCEPT",
		});
		const revise = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revise",
			editorDecision: "REVISE_AND_RESUBMIT",
		});
		createdSubmissions.push(
			draft.id,
			submitted.id,
			overdue.submissionId,
			awaitingDecision.submissionId,
			conditional.submissionId,
			revise.submissionId,
		);

		// Act
		await gotoList(page, testRun.testRunId);

		// Assert — column header + each row's TODO
		await expect(page.getByRole("columnheader").filter({ hasText: "TODO" })).toBeVisible();
		await expect(row(page, draft.title)).toContainText("Awaiting submission");
		await expect(row(page, submitted.title)).toContainText("Assign reviewer");
		await expect(row(page, overdue.title)).toContainText("Review overdue");
		await expect(row(page, awaitingDecision.title)).toContainText("Make decision");
		await expect(row(page, conditional.title)).toContainText("Verify conditions");
		await expect(row(page, revise.title)).toContainText("Awaiting revision");
	});

	test("payment reminder follows the owner's fee", async ({ page, testRun }, testInfo) => {
		test.skip(testInfo.project.name === "mobile-admin", "desktop table only");

		// Arrange — fresh owner so fee state is deterministic (no fee = unpaid)
		const owner = await createTestUser({
			email: `todo-pay-${testRun.testRunId}@e2e.local`,
			password: DEFAULT_PASSWORD,
			firstName: "Pay",
			lastName: "Owner",
		});
		createdUsers.push(owner.id);
		const accepted = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Accepted",
			userId: owner.id,
			editorDecision: "ACCEPT",
		});
		createdSubmissions.push(accepted.submissionId);

		// Act + Assert — unpaid → reminder
		await gotoList(page, testRun.testRunId);
		await expect(row(page, accepted.title)).toContainText("Remind about payment");

		// Mark fee paid → reminder clears
		await createFee({ userId: owner.id });
		await page.reload();
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(row(page, accepted.title)).toBeVisible();
		await expect(row(page, accepted.title)).not.toContainText("Remind about payment");
	});

	test("tooltip explains the reviewer counts", async ({ page, testRun }, testInfo) => {
		test.skip(testInfo.project.name === "mobile-admin", "tooltip hover is desktop only");

		// Arrange — SUBMITTED with no reviewers → "Assign reviewer (0/N)"
		const submitted = await createSubmission({
			testRunId: testRun.testRunId,
			title: "TooltipReviewer",
			status: "SUBMITTED",
		});
		createdSubmissions.push(submitted.id);

		// Act
		await gotoList(page, testRun.testRunId);
		const cell = row(page, submitted.title).getByText(/Assign reviewer/);
		await expect(cell).toBeVisible();
		await cell.hover();

		// Assert
		await expect(page.getByText(/required reviewers assigned/)).toBeVisible();
	});

	test("TODO column filter narrows the list", async ({ page, testRun }, testInfo) => {
		test.skip(testInfo.project.name === "mobile-admin", "faceted filter is desktop only");

		// Arrange — one MAKE_DECISION row, one ASSIGN_REVIEWER row
		const decide = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "FilterDecide",
		});
		const assign = await createSubmission({
			testRunId: testRun.testRunId,
			title: "FilterAssign",
			status: "SUBMITTED",
		});
		createdSubmissions.push(decide.submissionId, assign.id);

		await gotoList(page, testRun.testRunId);
		await expect(row(page, decide.title)).toBeVisible();
		await expect(row(page, assign.title)).toBeVisible();

		// Act — filter TODO = "Make decision"
		await page
			.getByRole("columnheader")
			.filter({ hasText: "TODO" })
			.getByRole("button", { name: "Filter" })
			.click();
		const popover = page.locator("[data-slot='popover-content']");
		await popover.getByText("Make decision").click();

		// Assert — only the decision row remains
		await expect(row(page, decide.title)).toBeVisible();
		await expect(row(page, assign.title)).toHaveCount(0);
	});

	test("mobile card shows action TODOs but hides muted hints", async ({ page, testRun }, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-admin",
			"mobile card layout only",
		);

		// Arrange — one action state, one muted state
		const assign = await createSubmission({
			testRunId: testRun.testRunId,
			title: "MobileAssign",
			status: "SUBMITTED",
		});
		const draft = await createSubmission({
			testRunId: testRun.testRunId,
			title: "MobileDraft",
			status: "DRAFT",
		});
		createdSubmissions.push(assign.id, draft.id);

		// Act
		await gotoList(page, testRun.testRunId);

		// Assert — action TODO rendered, muted hint omitted on mobile
		await expect(row(page, assign.title)).toContainText("Assign reviewer");
		await expect(row(page, draft.title)).toBeVisible();
		await expect(row(page, draft.title)).not.toContainText("Awaiting submission");
	});
});
