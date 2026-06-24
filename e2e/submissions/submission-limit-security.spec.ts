import { randomUUID } from "node:crypto";
import { test, expect, createUniqueSubmission } from "./fixtures";
import {
	createSubmission,
	createTestUser,
	deleteTestUser,
	getPrisma,
	setAppSetting,
	snapshotAppSettings,
} from "../helpers/test-db";
import { loginAs } from "../helpers/auth";
import { DEFAULT_PASSWORD } from "../helpers/test-users";
import { DEFAULT_ORAL_PRESENTATION_CONFIG } from "../../src/features/settings/defaults";
import { SubmissionStatus, SubmissionType } from "../../src/generated/prisma/enums";

/**
 * Security: the per-user submission cap is enforced server-side (not just hidden
 * in the UI), it covers the draft→submit path, and co-authorship never counts.
 */
test.describe.serial("Submission limit — security", () => {
	let restore: () => Promise<void>;

	test.beforeAll(async () => {
		({ restore } = await snapshotAppSettings([
			"SUBMISSION_TYPE_ORAL_PRESENTATION",
		]));
	});

	test.afterAll(async () => {
		await restore();
	});

	async function setOralLimit(max: number) {
		await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
			...DEFAULT_ORAL_PRESENTATION_CONFIG,
			isActive: true,
			maxSubmissionsPerUser: max,
		});
	}

	async function ownedAbstractCount(userId: string): Promise<number> {
		return getPrisma().submission.count({
			where: { userId, type: SubmissionType.ABSTRACT },
		});
	}

	test("server rejects an over-limit submit — no row is created", async ({
		submissionPage,
		page,
	}) => {
		test.slow();
		await setOralLimit(1);
		const email = `limit-srv-${randomUUID().slice(0, 8)}@e2e.local`;
		const user = await createTestUser({ email, emailVerified: true });

		await createSubmission({
			title: "Owned at cap",
			userId: user.id,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.SUBMITTED,
		});
		const before = await ownedAbstractCount(user.id);

		try {
			await loginAs(
				page,
				{ email, password: DEFAULT_PASSWORD },
				{ clearCookies: true },
			);
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(createUniqueSubmission());
			await submissionPage.submit();

			await expect(page.getByText(/reached the maximum of 1/i)).toBeVisible({
				timeout: 10000,
			});
			// The guard lives in the server fn: nothing was persisted.
			expect(await ownedAbstractCount(user.id)).toBe(before);
		} finally {
			await deleteTestUser(user.id).catch(() => {});
		}
	});

	test("submitting a saved draft also respects the cap", async ({ page }) => {
		test.slow();
		await setOralLimit(1);
		const email = `limit-draft-${randomUUID().slice(0, 8)}@e2e.local`;
		const user = await createTestUser({ email, emailVerified: true });

		// One active submission (at cap) + one DRAFT the user will try to submit.
		await createSubmission({
			title: "Active at cap",
			userId: user.id,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.SUBMITTED,
		});
		const draft = await createSubmission({
			title: "Draft to submit",
			userId: user.id,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.DRAFT,
		});

		try {
			await loginAs(
				page,
				{ email, password: DEFAULT_PASSWORD },
				{ clearCookies: true },
			);
			await page.goto(`/submissions/${draft.id}`);
			await page.getByRole("button", { name: "Submit", exact: true }).click();

			await expect(page.getByText(/reached the maximum of 1/i)).toBeVisible({
				timeout: 10000,
			});
			// submitDraft was blocked — the draft stays a draft.
			const after = await getPrisma().submission.findUnique({
				where: { id: draft.id },
				select: { status: true },
			});
			expect(after?.status).toBe(SubmissionStatus.DRAFT);
		} finally {
			await deleteTestUser(user.id).catch(() => {});
		}
	});

	test("co-authorship does not count toward the cap", async ({
		submissionPage,
		page,
	}) => {
		test.slow();
		await setOralLimit(2);
		const authorEmail = `limit-owner-${randomUUID().slice(0, 8)}@e2e.local`;
		const coEmail = `limit-co-${randomUUID().slice(0, 8)}@e2e.local`;
		const author = await createTestUser({
			email: authorEmail,
			emailVerified: true,
		});
		const coauthor = await createTestUser({
			email: coEmail,
			firstName: "Co",
			lastName: "Author",
			emailVerified: true,
		});

		// Author owns 2 ABSTRACTs (at cap); coauthor is listed on both but owns none.
		for (let i = 1; i <= 2; i++) {
			await createSubmission({
				title: `Owner abstract ${i}`,
				userId: author.id,
				type: SubmissionType.ABSTRACT,
				status: SubmissionStatus.SUBMITTED,
				extraAuthors: [
					{
						firstName: "Co",
						lastName: "Author",
						email: coEmail,
						userId: coauthor.id,
					},
				],
			});
		}

		try {
			await loginAs(
				page,
				{ email: coEmail, password: DEFAULT_PASSWORD },
				{ clearCookies: true },
			);
			await submissionPage.goto();
			await submissionPage.fillCompleteForm(createUniqueSubmission());
			await submissionPage.submit();

			// Coauthor owns 0 → allowed to submit their own.
			await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]{36}/, {
				timeout: 15000,
			});
			expect(await ownedAbstractCount(coauthor.id)).toBe(1);
		} finally {
			await deleteTestUser(author.id).catch(() => {});
			await deleteTestUser(coauthor.id).catch(() => {});
		}
	});
});
