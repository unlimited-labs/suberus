import { test, expect, createSubmission, getTestUserIds } from "./fixtures";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

// Tests use admin storageState from playwright.config.ts

/**
 * Seed a submission with a mixed author list:
 *  - index 0: primary/presenter, NOT a registered user
 *  - index 1: registered user (linked) + presenter
 *  - index 2: plain author, NOT a registered user
 */
async function seedMixedAuthors(testRunId: string) {
	const { reviewerUserId } = await getTestUserIds();
	const sub = await createSubmission({
		testRunId,
		title: "Author Profile Links",
		status: SubmissionStatus.SUBMITTED,
		authorData: { firstName: "Primary", lastName: "Presenter" },
		extraAuthors: [
			{ firstName: "Linked", lastName: "User", userId: reviewerUserId, isPresenter: true },
			{ firstName: "Plain", lastName: "Author" },
		],
	});
	return { sub, reviewerUserId };
}

test.describe("Admin Submission Detail - Author profile links", () => {
	test("registered-user author renders as a profile link with correct href", async ({
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { sub, reviewerUserId } = await seedMixedAuthors(testRun.testRunId);
		cleanup.track(sub.id);

		await adminSubmissionDetailPage.goto(sub.id);

		const link = adminSubmissionDetailPage.getAuthorProfileLink(1);
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute("href", `/admin/users/${reviewerUserId}`);
		await expect(link).toContainText("Linked User");
	});

	test("clicking a linked author navigates to their profile page", async ({
		adminSubmissionDetailPage,
		page,
		testRun,
		cleanup,
	}) => {
		const { sub, reviewerUserId } = await seedMixedAuthors(testRun.testRunId);
		cleanup.track(sub.id);

		await adminSubmissionDetailPage.goto(sub.id);
		await adminSubmissionDetailPage.getAuthorProfileLink(1).click();

		await page.waitForURL(`**/admin/users/${reviewerUserId}`);
		await expect(page.getByText("User Details")).toBeVisible();
	});

	test("non-registered author renders as plain text without a link", async ({
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { sub } = await seedMixedAuthors(testRun.testRunId);
		cleanup.track(sub.id);

		await adminSubmissionDetailPage.goto(sub.id);

		const plainAuthor = adminSubmissionDetailPage.getAuthor(2);
		await expect(plainAuthor).toContainText("Plain Author");
		await expect(adminSubmissionDetailPage.getAuthorProfileLink(2)).toHaveCount(0);
	});

	test("mixed list shows exactly one profile link", async ({
		adminSubmissionDetailPage,
		page,
		testRun,
		cleanup,
	}) => {
		const { sub } = await seedMixedAuthors(testRun.testRunId);
		cleanup.track(sub.id);

		await adminSubmissionDetailPage.goto(sub.id);

		await expect(page.getByTestId(/^author-profile-link-/)).toHaveCount(1);
		// Primary author (index 0) has no userId -> no link
		await expect(adminSubmissionDetailPage.getAuthorProfileLink(0)).toHaveCount(0);
	});

	test("presenter who is a registered user shows both the badge and the profile link", async ({
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { sub } = await seedMixedAuthors(testRun.testRunId);
		cleanup.track(sub.id);

		await adminSubmissionDetailPage.goto(sub.id);

		const linkedPresenter = adminSubmissionDetailPage.getAuthor(1);
		await expect(adminSubmissionDetailPage.getAuthorProfileLink(1)).toBeVisible();
		await expect(linkedPresenter).toContainText("Presenter");
	});
});
