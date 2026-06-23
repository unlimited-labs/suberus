import path from "path";
import { setAppSetting } from "../helpers/test-db";
import {
	test,
	expect,
	SAMPLE_DOCX,
	SAMPLE_PDF,
	EXTRACTION_FIXTURES_DIR,
} from "./fixtures";

test.describe("Extraction Queue", () => {
	test.beforeAll(async () => {
		await setAppSetting("EXTRACTION_ENABLED", true);
		await setAppSetting("EXTRACTION_HEURISTIC", true);
		await setAppSetting("EXTRACTION_AI", true);
	});

	test.afterAll(async () => {
		await setAppSetting("EXTRACTION_ENABLED", false);
		await setAppSetting("EXTRACTION_AI", false);
	});

	test("DOCX upload triggers extraction and fills title", async ({
		extractionPage,
	}) => {
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_DOCX);

		// Wait for title to be filled — extraction may be instant for DOCX
		await expect(extractionPage.titleInput).not.toHaveValue("", {
			timeout: 30_000,
		});
	});

	test("PDF upload triggers extraction and fills title", async ({
		extractionPage,
	}) => {
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_PDF);

		// PDF extraction takes longer (pdf-api + LLM)
		await expect(extractionPage.titleInput).not.toHaveValue("", {
			timeout: 60_000,
		});
	});

	test("DOCX extraction fills author fields", async ({ extractionPage }) => {
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_DOCX);

		await extractionPage.waitForExtractionStart();
		await extractionPage.waitForExtractionComplete();

		const firstNameInput = extractionPage
			.getAuthorCard(0)
			.getByLabel("First name");
		await expect(firstNameInput).not.toHaveValue("");
	});

	test("unsupported format does not trigger extraction", async ({
		extractionPage,
	}) => {
		await extractionPage.gotoFullPaperForm();

		const txtFile = path.join(EXTRACTION_FIXTURES_DIR, "document.txt");
		await extractionPage.uploadFile(txtFile);

		// Wait briefly then confirm overlay never appeared
		await extractionPage.page.waitForTimeout(2000);
		await expect(extractionPage.extractionOverlay).not.toBeVisible();
	});

	test("form remains usable after extraction completes", async ({
		extractionPage,
	}) => {
		await extractionPage.gotoFullPaperForm();
		await extractionPage.uploadFile(SAMPLE_DOCX);

		await extractionPage.waitForExtractionComplete();

		// Can still manually edit title
		await extractionPage.submissionPage.fillTitle("Manual Override Title");
		const title = await extractionPage.getExtractedTitle();
		expect(title).toBe("Manual Override Title");
	});
});
