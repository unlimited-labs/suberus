import { setAppSetting } from "../helpers/test-db";
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
		// PDF extraction takes ~3s, long enough to observe the timer
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_PDF);

		await extractionPage.waitForExtractionStart();
		await expect(extractionPage.extractionElapsed).toBeVisible();
	});

	test("extraction overlay disappears after completion", async ({
		extractionPage,
	}) => {
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_DOCX);

		// Overlay may appear briefly or not at all for fast DOCX extraction
		// Just verify it's gone after extraction window
		await extractionPage.waitForExtractionComplete();
		await expect(extractionPage.extractionOverlay).not.toBeVisible();
	});
});
