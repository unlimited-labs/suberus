import { test, expect, createSubmission, addSubmissionVersions } from "./fixtures";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

// Tests use admin storageState (see playwright.config.ts roleProject).

test.describe("Version compare page", () => {
	test("compares two versions side-by-side from the Content tab", async ({
		adminSubmissionDetailPage,
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange — a submission with two versions differing in title and content.
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Compare Page Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await addSubmissionVersions(id, [
			{
				title: "Nucleation study",
				content: "The model presents an approach. Cooling at 45 C/s.",
			},
			{
				title: "Nucleation study (revised)",
				content:
					"The model proposes a novel approach. Cooling at 30 C/s. Added a validation set.",
				comment: "Addressed the reviewers' comments.",
			},
		]);

		// Act — open detail, click the Compare button next to the version switcher.
		await adminSubmissionDetailPage.goto(id);
		await page.getByRole("link", { name: /Compare versions/i }).click();
		await page.waitForURL(/\/admin\/submissions\/[a-f0-9-]+\/compare/);

		// Assert — side-by-side panels with insertions on the right, deletions on the left.
		const header = page.getByTestId("diff-comparing-header");
		await expect(header).toContainText("Comparing v1");
		await expect(header).toContainText("v2");
		await expect(page.getByTestId("side-by-side-diff").first()).toBeVisible();
		await expect(
			page.getByTestId("diff-side-old").getByTestId("diff-del").first(),
		).toBeVisible();
		await expect(
			page.getByTestId("diff-side-new").getByTestId("diff-ins").first(),
		).toBeVisible();
		await expect(
			page.getByText("Addressed the reviewers' comments."),
		).toBeVisible();
	});

	test("switches between side-by-side and inline layouts", async ({
		adminSubmissionDetailPage,
		page,
		testRun,
		cleanup,
	}) => {
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Compare Layout Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await addSubmissionVersions(id, [
			{ title: "v1", content: "First version content alpha." },
			{ title: "v2", content: "Second version content beta." },
		]);

		await adminSubmissionDetailPage.goto(id);
		await page.getByRole("link", { name: /Compare versions/i }).click();
		await page.waitForURL(/\/compare/);

		// Default is side-by-side.
		await expect(page.getByTestId("side-by-side-diff").first()).toBeVisible();

		// Switch to inline → unified redline, no split panels.
		await page.getByTestId("diff-layout-inline").click();
		await expect(page.getByTestId("text-diff").first()).toBeVisible();
		await expect(page.getByTestId("side-by-side-diff")).toHaveCount(0);
	});

	test("lets the user pick a different base version", async ({
		adminSubmissionDetailPage,
		page,
		testRun,
		cleanup,
	}) => {
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Compare Picker Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await addSubmissionVersions(id, [
			{ title: "v1 title", content: "First version content alpha." },
			{ title: "v2 title", content: "Second version content beta." },
			{ title: "v3 title", content: "Third version content gamma." },
		]);

		await adminSubmissionDetailPage.goto(id);
		await page.getByRole("link", { name: /Compare versions/i }).click();
		await page.waitForURL(/\/compare/);

		// Default pair is previous -> current (v2 -> v3).
		await expect(page.getByTestId("diff-comparing-header")).toContainText(
			"Comparing v2",
		);

		// Switch the base picker to v1; header updates to v1 -> v3.
		await page.getByTestId("diff-base-select").click();
		await page.getByRole("option", { name: /Version 1/ }).click();
		await expect(page.getByTestId("diff-comparing-header")).toContainText(
			"Comparing v1",
		);
	});

	test("Compare button is hidden when there is only one version", async ({
		adminSubmissionDetailPage,
		page,
		testRun,
		cleanup,
	}) => {
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Single Version Compare Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await addSubmissionVersions(id, [
			{ title: "Only version", content: "Just one version here." },
		]);

		await adminSubmissionDetailPage.goto(id);
		await expect(
			page.getByRole("link", { name: /Compare versions/i }),
		).toHaveCount(0);
	});
});
