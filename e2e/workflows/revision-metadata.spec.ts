import { expect, test } from "../helpers/base-fixtures";
import { loginAs } from "../helpers/auth";
import {
	createSubmissionWithDecision,
	getPrisma,
	setAppSetting,
} from "../helpers/test-db";
import { ADMIN_USER, REVIEWER_USER, TEST_USER } from "../helpers/test-users";
import { SAMPLE_DOCX } from "../extraction/fixtures";
import { SubmissionPage } from "../submissions/fixtures";
import {
	EditorDecisionType,
	SubmissionType,
} from "../../src/generated/prisma/enums";

test.describe("Revision metadata (authors / keywords / extraction)", () => {
	test("revision changes author composition; snapshots are per-version and hidden from reviewers", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow();

		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision Metadata Author Change",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		});
		cleanup.track(submissionId);
		const db = getPrisma();

		// createSubmission seeds version 1 (single original author), so the resubmit
		// produces version 2 and we can assert per-version snapshot divergence.

		// --- Author edits the composition on revision ---
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${submissionId}/revise`);
		const form = new SubmissionPage(page);
		await expect(page.locator("#author-0-firstName")).toHaveValue("Test");

		await page.getByLabel("Title").fill("Revised Metadata Title");
		await form.addAuthor();
		await page.locator("#author-1-firstName").fill("Co");
		await page.locator("#author-1-lastName").fill("Presenter2");
		await page
			.locator("#author-1-email")
			.fill(`co.${testRun.testRunId}@test.com`);
		// Promote the new co-author to presenter (exercises the presenter repoint)
		await form
			.getAuthorCard(1)
			.getByRole("button", { name: "Set as presenter" })
			.click();
		await expect(
			form.getAuthorCard(1).getByRole("button", { name: "Presenting author" }),
		).toBeVisible();
		await form.fillAffiliation(1, "Test University");
		await form.addKeyword("new-kw");

		const submitBtn = page.getByRole("button", { name: /Submit Revision/i });
		await expect(submitBtn).toBeEnabled({ timeout: 10000 });
		await submitBtn.click();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+$/, { timeout: 30000 });

		// --- Per-version snapshot integrity ---
		const versions = await db.submissionVersion.findMany({
			where: { submissionId },
			orderBy: { version: "asc" },
			include: {
				authorsSnapshot: { orderBy: { orderIndex: "asc" } },
				keywordsSnapshot: true,
			},
		});
		expect(versions).toHaveLength(2);
		const [vOne, vTwo] = versions;
		// v1 frozen: a single presenting author (unchanged history)
		expect(vOne.authorsSnapshot).toHaveLength(1);
		expect(vOne.authorsSnapshot[0].isPresenter).toBe(true);
		// v2 frozen: two authors, presenter is the new co-author
		expect(vTwo.authorsSnapshot).toHaveLength(2);
		expect(vTwo.authorsSnapshot.find((a) => a.isPresenter)?.lastName).toBe(
			"Presenter2",
		);
		// The two versions genuinely differ — the point of "recognize the change"
		expect(vTwo.authorsSnapshot.length).not.toBe(vOne.authorsSnapshot.length);
		expect(vTwo.keywordsSnapshot.map((k) => k.name)).toContain("new-kw");

		// --- Canonical authors updated + presenter FK repointed ---
		const canonical = await db.submissionAuthor.findMany({
			where: { submissionId },
		});
		expect(canonical).toHaveLength(2);
		const submission = await db.submission.findUniqueOrThrow({
			where: { id: submissionId },
			select: { presenterId: true },
		});
		expect(canonical.find((a) => a.id === submission.presenterId)?.lastName).toBe(
			"Presenter2",
		);

		// --- Editor compare: Authors + Keywords diff are shown ---
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}/compare`);
		await expect(page.getByTestId("diff-comparing-header")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("Authors", { exact: true })).toBeVisible();
		await expect(page.getByText("Keywords", { exact: true })).toBeVisible();
		await expect(page.getByText("Presenter2").first()).toBeVisible();
		await expect(page.getByText("new-kw").first()).toBeVisible();

		// --- Reviewer compare: blind — no author identities leak ---
		const assignment = await db.reviewAssignment.findFirstOrThrow({
			where: { submissionId },
			orderBy: { round: "desc" },
		});
		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto(`/reviews/${assignment.id}/compare`);
		await expect(page.getByTestId("diff-comparing-header")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("Authors", { exact: true })).toHaveCount(0);
		await expect(page.getByText("Presenter2")).toHaveCount(0);
	});

	test("uploading a new document on revision re-extracts metadata", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow();
		await setAppSetting("EXTRACTION_ENABLED", true);
		await setAppSetting("EXTRACTION_HEURISTIC", true);
		await setAppSetting("EXTRACTION_AI", false);

		try {
			const { submissionId } = await createSubmissionWithDecision({
				testRunId: testRun.testRunId,
				title: "File Revision Extraction Test",
				type: SubmissionType.FULL_PAPER,
				editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
			});
			cleanup.track(submissionId);

			await loginAs(page, TEST_USER, { clearCookies: true });
			await page.goto(`/submissions/${submissionId}/revise`);

			const titleInput = page.getByLabel("Title");
			await expect(titleInput).toBeVisible({ timeout: 15000 });

			const overlay = page.getByTestId("extraction-overlay");
			await page.locator('input[type="file"]').setInputFiles(SAMPLE_DOCX);

			// The core of the bug: extraction is now WIRED on the revision form and
			// runs when a new document is uploaded (previously it never ran here).
			// The overlay appearing + clearing proves the pipeline executes; the
			// field autofill mapping itself is covered by the form unit tests.
			await expect(overlay).toBeVisible({ timeout: 15000 });
			await expect(overlay).not.toBeVisible({ timeout: 120000 });

			// Form remains intact and usable after extraction completes
			await expect(titleInput).toBeVisible();
			expect((await titleInput.inputValue()).trim().length).toBeGreaterThan(0);
		} finally {
			await setAppSetting("EXTRACTION_ENABLED", false);
			await setAppSetting("EXTRACTION_HEURISTIC", false);
		}
	});
});
