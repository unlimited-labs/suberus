import {
	setAppSetting,
	setFullPaperAllowedExtensions,
} from "../helpers/test-db";
import { test, expect, SAMPLE_DOCX, SAMPLE_PDF } from "./fixtures";

test.describe("Extraction Progress", () => {
	test.beforeAll(async () => {
		await setAppSetting("EXTRACTION_ENABLED", true);
		await setAppSetting("EXTRACTION_HEURISTIC", true);
		await setAppSetting("EXTRACTION_AI", true);
	});

	test.afterAll(async () => {
		await setAppSetting("EXTRACTION_ENABLED", false);
		await setAppSetting("EXTRACTION_AI", false);
	});

	test("elapsed timer visible during PDF extraction", async ({
		extractionPage,
	}) => {
		// PDF extraction is AI-only (real LLM round-trip). Leaving that job in the
		// queue starves the next test's DOCX job, so this one waits it out — which
		// needs the same budget as the sibling PDF test in extraction-queue.
		test.setTimeout(150_000);
		// Full Paper is DOCX-only by default; switch it to PDF for this test
		// (single allowed extension per type — can't accept both at once).
		const { restore } = await setFullPaperAllowedExtensions(["pdf"]);
		try {
			await extractionPage.gotoFullPaperForm();
			await extractionPage.uploadFile(SAMPLE_PDF);

			await extractionPage.waitForExtractionStart();
			await expect(extractionPage.extractionElapsed).toBeVisible();
			await extractionPage.waitForExtractionComplete();
		} finally {
			await restore();
		}
	});

	test("extraction overlay disappears after completion", async ({
		extractionPage,
	}) => {
		// waitForExtractionComplete allows 120s; the default 30s test budget capped
		// it below the pipeline's real latency under load.
		test.setTimeout(150_000);
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_DOCX);

		// Overlay may appear briefly or not at all for fast DOCX extraction
		// Just verify it's gone after extraction window
		await extractionPage.waitForExtractionComplete();
		await expect(extractionPage.extractionOverlay).not.toBeVisible();
	});
});
