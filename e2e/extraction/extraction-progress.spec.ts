import { test, expect, SAMPLE_DOCX } from "./fixtures";

test.describe("Extraction Progress", () => {
	test("elapsed timer increments during extraction", async ({
		extractionPage,
	}) => {
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_DOCX);

		await extractionPage.waitForExtractionStart();
		await expect(extractionPage.extractionElapsed).toBeVisible();

		// Wait and verify timer increments
		const initialText =
			(await extractionPage.extractionElapsed.textContent()) ?? "0s";
		await extractionPage.page.waitForTimeout(2000);
		const laterText =
			(await extractionPage.extractionElapsed.textContent()) ?? "0s";

		const initialSec = parseInt(initialText);
		const laterSec = parseInt(laterText);
		expect(laterSec).toBeGreaterThan(initialSec);
	});

	test("extraction overlay disappears after completion", async ({
		extractionPage,
	}) => {
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_DOCX);

		await extractionPage.waitForExtractionStart();
		await extractionPage.waitForExtractionComplete();
		await expect(extractionPage.extractionOverlay).not.toBeVisible();
	});
});
