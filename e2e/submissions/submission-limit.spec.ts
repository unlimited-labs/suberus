import { test, expect, createUniqueSubmission } from "./fixtures";
import {
	createSubmission,
	deleteSubmission,
	getPrisma,
	getTestUserIds,
	setAppSetting,
	snapshotAppSettings,
} from "../helpers/test-db";
import { DEFAULT_ORAL_PRESENTATION_CONFIG } from "../../src/features/settings/defaults";
import { SubmissionStatus, SubmissionType } from "../../src/generated/prisma/enums";

/**
 * Max submissions per user (per type). Only submissions a user OWNS and that are
 * active count: DRAFT / WITHDRAWN / REJECTED are exempt. 0 = unlimited.
 */
test.describe.serial("Submission limit per user per type", () => {
	let restore: () => Promise<void>;

	test.beforeAll(async () => {
		({ restore } = await snapshotAppSettings([
			"SUBMISSION_TYPE_ORAL_PRESENTATION",
		]));
	});

	test.afterAll(async () => {
		await restore();
	});

	// The per-user cap counts ALL of a user's active ABSTRACTs globally; sibling
	// submission specs share TEST_USER and may leave some behind. Start each test
	// from a clean slate so the count this block controls is the only one present.
	test.beforeEach(async () => {
		const { testUserId } = await getTestUserIds();
		const existing = await getPrisma().submission.findMany({
			where: { userId: testUserId, type: SubmissionType.ABSTRACT },
			select: { id: true },
		});
		for (const s of existing) await deleteSubmission(s.id);
	});

	/** Set the Oral Presentation (ABSTRACT) cap, keeping the type active + TEXT. */
	async function setOralLimit(max: number) {
		await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
			...DEFAULT_ORAL_PRESENTATION_CONFIG,
			isActive: true,
			maxSubmissionsPerUser: max,
		});
	}

	/** Count active (non-exempt) ABSTRACT submissions owned by the user. */
	async function ownedActiveAbstracts(userId: string): Promise<number> {
		return getPrisma().submission.count({
			where: {
				userId,
				type: SubmissionType.ABSTRACT,
				status: {
					notIn: [
						SubmissionStatus.DRAFT,
						SubmissionStatus.WITHDRAWN,
						SubmissionStatus.REJECTED,
					],
				},
			},
		});
	}

	test("blocks submit once the user is at the limit", async ({
		submissionPage,
		testRun,
		cleanup,
		page,
	}) => {
		await setOralLimit(2);
		const { testUserId } = await getTestUserIds();

		for (let i = 1; i <= 2; i++) {
			const sub = await createSubmission({
				testRunId: testRun.testRunId,
				title: testRun.prefix(`At limit ${i}`),
				userId: testUserId,
				type: SubmissionType.ABSTRACT,
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(sub.id);
		}
		const before = await ownedActiveAbstracts(testUserId);

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(createUniqueSubmission(testRun.testRunId));
		await submissionPage.submit();

		await expect(page.getByText(/reached the maximum of 2/i)).toBeVisible({
			timeout: 10000,
		});
		// Server created nothing — count is unchanged and we stayed on the form.
		expect(await ownedActiveAbstracts(testUserId)).toBe(before);
		await expect(page).toHaveURL(/\/submissions\/new/);
	});

	test("saving a draft is allowed even at the limit", async ({
		submissionPage,
		testRun,
		cleanup,
		page,
	}) => {
		await setOralLimit(1);
		const { testUserId } = await getTestUserIds();

		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: testRun.prefix("Draft-at-limit owner"),
			userId: testUserId,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(sub.id);

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(createUniqueSubmission(testRun.testRunId));
		await submissionPage.saveDraftButton.click();

		// Draft saved (drafts don't consume a slot) — navigated off the form.
		await expect(page).not.toHaveURL(/\/submissions\/new/, { timeout: 10000 });
		const draft = await getPrisma().submission.findFirst({
			where: { userId: testUserId, status: SubmissionStatus.DRAFT },
		});
		expect(draft).not.toBeNull();
		if (draft) cleanup.track(draft.id);
	});

	test("a withdrawn submission frees a slot", async ({
		submissionPage,
		testRun,
		cleanup,
		page,
	}) => {
		await setOralLimit(1);
		const { testUserId } = await getTestUserIds();

		// One WITHDRAWN (exempt) → active count is 0, so a new submit is allowed.
		const withdrawn = await createSubmission({
			testRunId: testRun.testRunId,
			title: testRun.prefix("Withdrawn"),
			userId: testUserId,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.WITHDRAWN,
		});
		cleanup.track(withdrawn.id);

		await submissionPage.goto();
		await submissionPage.fillCompleteForm(createUniqueSubmission(testRun.testRunId));
		await submissionPage.submit();

		await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]{36}/, {
			timeout: 15000,
		});
		expect(await ownedActiveAbstracts(testUserId)).toBe(1);
		const created = await getPrisma().submission.findFirst({
			where: { userId: testUserId, status: SubmissionStatus.SUBMITTED },
			orderBy: { createdAt: "desc" },
		});
		if (created) cleanup.track(created.id);
	});

	test("the cap is per-type — a capped type doesn't block other types", async ({
		submissionPage,
		testRun,
		cleanup,
		page,
	}) => {
		await setOralLimit(1);
		const { testUserId } = await getTestUserIds();

		const abstract = await createSubmission({
			testRunId: testRun.testRunId,
			title: testRun.prefix("ABSTRACT at cap"),
			userId: testUserId,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(abstract.id);

		await submissionPage.goto();
		// POSTER is uncapped (default 0) — submitting one succeeds despite ABSTRACT cap.
		const data = createUniqueSubmission(testRun.testRunId);
		await submissionPage.selectType("POSTER");
		await submissionPage.fillTitle(data.title);
		await submissionPage.fillContent(data.content);
		await submissionPage.fillAuthor(0, data.authors[0]);
		for (const kw of data.keywords) await submissionPage.addKeyword(kw);
		await submissionPage.submit();

		await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]{36}/, {
			timeout: 15000,
		});
		const poster = await getPrisma().submission.findFirst({
			where: { userId: testUserId, type: SubmissionType.POSTER },
			orderBy: { createdAt: "desc" },
		});
		expect(poster).not.toBeNull();
		if (poster) cleanup.track(poster.id);
	});
});
