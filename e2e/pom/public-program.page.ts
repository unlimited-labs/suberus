import { type Locator, type Page } from "@playwright/test";

export class PublicProgramPage {
	readonly page: Page;
	readonly heading: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.getByRole("heading", { name: /program/i }).first();
	}

	async goto() {
		await this.page.goto("/program");
		await this.heading.waitFor({ state: "visible", timeout: 15000 });
	}

	sessionByTitle(title: string): Locator {
		return this.page.getByText(title, { exact: false });
	}
}
