import path from "path";
import type { Locator, Page } from "@playwright/test";
import {
	test as submissionTest,
	expect as baseExpect,
	SubmissionPage,
} from "../submissions/fixtures";

export const EXTRACTION_FIXTURES_DIR = path.resolve(
	"e2e/submissions/fixtures",
);
export const SAMPLE_DOCX = path.join(
	EXTRACTION_FIXTURES_DIR,
	"extraction-sample.docx",
);
export const SAMPLE_PDF = path.join(
	EXTRACTION_FIXTURES_DIR,
	"extraction-sample.pdf",
);

export class ExtractionPage {
	readonly page: Page;
	readonly submissionPage: SubmissionPage;
	readonly fileInput: Locator;
	readonly extractionOverlay: Locator;
	readonly extractionElapsed: Locator;
	readonly titleInput: Locator;

	constructor(page: Page) {
		this.page = page;
		this.submissionPage = new SubmissionPage(page);
		this.fileInput = page.locator('input[type="file"]');
		this.extractionOverlay = page.getByTestId("extraction-overlay");
		this.extractionElapsed = page.getByTestId("extraction-elapsed");
		this.titleInput = page.getByLabel("Title");
	}

	async gotoFullPaperForm() {
		await this.submissionPage.goto();
		await this.submissionPage.selectType("FULL_PAPER");
		await baseExpect(
			this.page.getByText("Drop file or click to upload"),
		).toBeVisible();
	}

	async uploadFile(filePath: string) {
		await this.fileInput.setInputFiles(filePath);
	}

	async waitForExtractionStart() {
		await baseExpect(this.extractionOverlay).toBeVisible({ timeout: 10_000 });
	}

	async waitForExtractionComplete(timeoutMs = 120_000) {
		await baseExpect(this.extractionOverlay).not.toBeVisible({
			timeout: timeoutMs,
		});
	}

	async getExtractedTitle(): Promise<string> {
		return this.titleInput.inputValue();
	}

	getAuthorCard(index: number): Locator {
		return this.page.locator(`[data-testid="author-card-${index}"]`);
	}
}

interface ExtractionFixtures {
	extractionPage: ExtractionPage;
}

export const test = submissionTest.extend<ExtractionFixtures>({
	extractionPage: async ({ page }, use) => {
		await use(new ExtractionPage(page));
	},
});

export { baseExpect as expect };
