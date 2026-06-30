import { type Locator, type Page } from "@playwright/test";

export class PublicProgramPage {
	readonly page: Page;
	readonly ribbon: Locator;
	readonly search: Locator;
	readonly presentationRows: Locator;
	readonly preview: Locator;
	readonly favoriteToggle: Locator;
	readonly favoritedStars: Locator;

	constructor(page: Page) {
		this.page = page;
		this.ribbon = page.getByText(/◆\s*Programme\s*◆/i).first();
		this.search = page.getByPlaceholder(/Search talks/i);
		this.presentationRows = page.getByTestId("presentation-row");
		this.preview = page.getByTestId("presentation-preview");
		this.favoriteToggle = page.getByTestId("favorite-toggle");
		this.favoritedStars = page.getByTestId("favorited-star");
	}

	async goto() {
		await this.page.goto("/program");
		await this.search.waitFor({ state: "visible", timeout: 15000 });
	}

	sessionByTitle(title: string): Locator {
		return this.page.getByText(title, { exact: false });
	}

	async openFirstPresentation() {
		await this.presentationRows.first().click();
		await this.preview.waitFor({ state: "visible", timeout: 10000 });
	}
}
