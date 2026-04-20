import { type Locator, type Page } from "@playwright/test";

export class PublicProgramPage {
	readonly page: Page;
	readonly ribbon: Locator;

	constructor(page: Page) {
		this.page = page;
		this.ribbon = page.getByText(/◆\s*Programme\s*◆/i).first();
	}

	async goto() {
		await this.page.goto("/program");
		await this.ribbon.waitFor({ state: "visible", timeout: 15000 });
	}

	sessionByTitle(title: string): Locator {
		return this.page.getByText(title, { exact: false });
	}
}
