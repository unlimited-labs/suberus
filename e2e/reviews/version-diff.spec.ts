import {
	test,
	expect,
	createSubmission,
	addSubmissionVersions,
	seedNormalizedPdfVersions,
} from "./fixtures";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

// Tests use admin storageState (see playwright.config.ts roleProject).

/**
 * The PDF file-redline path runs the real docling + docx-api sidecars. Skip the
 * file-redline test when they aren't reachable (e.g. a CI without the dev stack)
 * rather than fail — the rest of the compare-page suite is sidecar-independent.
 */
async function sidecarsHealthy(): Promise<boolean> {
	const urls = [process.env.DOCLING_URL, process.env.DOCX_API_URL];
	try {
		for (const url of urls) {
			if (!url) return false;
			const res = await fetch(`${url.replace(/\/+$/, "")}/`);
			if (!res.ok) return false;
		}
		return true;
	} catch {
		return false;
	}
}

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

	test("renders the PDF file redline on the compare page", async ({
		adminSubmissionDetailPage,
		page,
		testRun,
		cleanup,
	}) => {
		test.skip(
			!(await sidecarsHealthy()),
			"docling/docx-api sidecars not running",
		);

		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "PDF Redline Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		// Two PDF versions differing by one word (twelve -> fifteen); normalized
		// inline so the lazy file redline is ready when the page opens.
		await seedNormalizedPdfVersions(id, [
			{
				fixturePath: "e2e/reviews/fixtures/redline-v1.pdf",
				fileName: "grain-study-v1.pdf",
				title: "Grain growth study",
				content: "Mean grain size increased by twelve percent.",
			},
			{
				fixturePath: "e2e/reviews/fixtures/redline-v2.pdf",
				fileName: "grain-study-v2.pdf",
				title: "Grain growth study",
				content: "Mean grain size increased by fifteen percent.",
			},
		]);

		await adminSubmissionDetailPage.goto(id);
		await page.getByRole("link", { name: /Compare versions/i }).click();
		await page.waitForURL(/\/compare/);

		// Inline layout → one unified file-redline frame.
		await page.getByTestId("diff-layout-inline").click();
		await expect(page.getByTestId("file-redline")).toBeVisible();

		// The redline (sandboxed same-origin iframe) shows the changed word as an
		// insertion and the old word struck through.
		const frame = page.frameLocator('[data-testid="file-redline"] iframe');
		await expect(frame.locator("ins")).toContainText("fifteen");
		await expect(frame.locator("del")).toContainText("twelve");
	});
});
