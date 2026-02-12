import { type Page, type Locator } from "@playwright/test"
import { test as base, expect as baseExpect, type TestRunContext, type CleanupContext } from "../helpers/base-fixtures"
import { loginAs } from "../helpers/auth"

export { TEST_USER } from "../helpers/test-users"
export { clearMailpit, getMailpitMessages } from "../helpers/mailpit"

export const VALID_SUBMISSION = {
	type: "ABSTRACT" as const,
	title: "New Submission from E2E Form Test",
	content:
		"This is a comprehensive test abstract content for our end-to-end testing suite. The purpose of this submission is to validate that our submission form and API endpoints are working correctly. We are testing various aspects of the system including form validation, data persistence, and user interface interactions. This abstract discusses the methodology, results, and conclusions of our testing approach. The testing framework ensures that all components are functioning as expected and that the user experience is smooth and intuitive. Additional context is provided here to meet the minimum character requirements for the abstract field which is configured to require at least 500 characters.",
	authors: [
		{
			firstName: "John",
			lastName: "Doe",
			email: "john.doe@test.com",
			affiliationId: null,
			affiliationName: "Test University",
			isPresenter: true,
		},
	],
	keywords: ["testing", "e2e", "validation"],
}

// Generate unique submission data to avoid test conflicts
export function createUniqueSubmission(suffix?: string) {
	const id = suffix ?? Date.now().toString()
	return {
		type: "ABSTRACT" as const,
		title: `${id}_Test Submission`,
		content: `This is a comprehensive test abstract content for submission ${id}. The purpose of this submission is to validate that our submission form and API endpoints are working correctly. We are testing various aspects of the system including form validation, data persistence, and user interface interactions. This abstract discusses the methodology, results, and conclusions of our testing approach. The testing framework ensures that all components are functioning as expected and that the user experience is smooth and intuitive. Additional context is provided here to meet the minimum character requirements for the abstract field.`,
		authors: [
			{
				firstName: "John",
				lastName: "Doe",
				email: `john.doe.${id}@test.com`,
				affiliationId: null,
				affiliationName: "Test University",
				isPresenter: true,
			},
		],
		keywords: [`test-${id}`, "e2e", "validation"],
	}
}

// Login helper
export async function loginAsTestUser(page: Page) {
	const { TEST_USER } = await import("../helpers/test-users")
	await loginAs(page, TEST_USER)
}

// Page Object
export class SubmissionPage {
	readonly page: Page
	readonly submitButton: Locator
	readonly saveDraftButton: Locator
	readonly titleInput: Locator
	readonly contentInput: Locator

	constructor(page: Page) {
		this.page = page
		this.submitButton = page.getByRole("button", { name: "Submit" })
		this.saveDraftButton = page.getByRole("button", { name: "Save Draft" })
		this.titleInput = page.getByLabel("Title")
		this.contentInput = page.getByLabel("Abstract")
	}

	async goto() {
		await this.page.goto("/submissions/new")
		// Wait for author auto-fill from useSession() to complete
		const firstNameInput = this.page.locator('[data-testid="author-card-0"]').getByLabel("First name")
		await baseExpect(firstNameInput).toBeVisible({ timeout: 30000 })
		await baseExpect(firstNameInput).not.toHaveValue("", { timeout: 15000 })
	}

	async selectType(type: "ABSTRACT" | "POSTER" | "FULL_PAPER") {
		// Map type to display label
		const labels = {
			ABSTRACT: "Oral Presentation",
			POSTER: "Poster",
			FULL_PAPER: "Full Paper",
		}
		await this.page.getByRole("button", { name: labels[type], exact: false }).click()
	}

	async fillTitle(title: string) {
		await this.titleInput.fill(title)
	}

	async fillContent(content: string) {
		await this.contentInput.fill(content)
	}

	/** Get author card by index (0-based) */
	getAuthorCard(index: number): Locator {
		return this.page.locator(`[data-testid="author-card-${index}"]`)
	}

	async fillAuthor(
		index: number,
		author: {
			firstName: string
			lastName: string
			email: string
			affiliationName: string
		}
	) {
		const firstNameInput = this.page.locator(`#author-${index}-firstName`)
		const lastNameInput = this.page.locator(`#author-${index}-lastName`)
		const emailInput = this.page.locator(`#author-${index}-email`)

		// Wait for element to be stable (avoids DOM detachment from React re-render after addAuthor)
		await baseExpect(firstNameInput).toBeVisible({ timeout: 10000 })
		await firstNameInput.fill(author.firstName)
		await lastNameInput.fill(author.lastName)
		await emailInput.fill(author.email)

		// Fill affiliation using the combobox in the same author card
		await this.fillAffiliation(index, author.affiliationName)
	}

	async fillAffiliation(index: number, affiliationName: string) {
		const input = this.getAuthorCard(index).getByLabel("Affiliation")
		// Retry fill+click — dropdown can re-render and detach the option element
		const option = this.page.getByRole("option").filter({ hasText: affiliationName }).first()
		await baseExpect(async () => {
			await input.click()
			await input.fill(affiliationName)
			await baseExpect(option).toBeVisible()
			await option.click()
			await baseExpect(input).toHaveValue(affiliationName)
		}).toPass({ timeout: 30000 })
	}

	async addAuthor() {
		const currentCount = await this.page.locator('[data-testid^="author-card-"]').count()
		await this.page.getByRole("button", { name: "Add Author" }).click()
		// Wait for the new author card to appear in DOM
		await baseExpect(this.page.locator(`[data-testid="author-card-${currentCount}"]`)).toBeVisible({ timeout: 10000 })
	}

	/** Get keywords section container */
	getKeywordsSection(): Locator {
		return this.page.locator('[data-testid="keywords-section"]')
	}

	/** Get submission type button by name (e.g., "Oral Presentation", "Poster", "Full Paper") */
	getSubmissionTypeButton(name: string): Locator {
		return this.page.getByRole("button", { name: new RegExp(name, "i") })
	}

	async addKeyword(keyword: string) {
		const keywordInput = this.getKeywordsSection().getByRole("textbox")
		await keywordInput.fill(keyword)
		// Press Enter to add keyword (or comma for tokenization)
		await keywordInput.press("Enter")
	}

	async submit() {
		await baseExpect(this.submitButton).toBeVisible()
		await baseExpect(this.submitButton).toBeEnabled()
		await this.submitButton.click()
	}

	async fillCompleteForm(data: typeof VALID_SUBMISSION) {
		await this.selectType(data.type)
		await this.fillTitle(data.title)
		await this.fillContent(data.content)

		// Fill first author (already exists)
		await this.fillAuthor(0, data.authors[0])

		// Add keywords
		for (const keyword of data.keywords) {
			await this.addKeyword(keyword)
		}
	}
}

// Extended test with fixtures
interface SubmissionFixtures {
	testRun: TestRunContext
	cleanup: CleanupContext
	submissionPage: SubmissionPage
	uniqueSubmission: ReturnType<typeof createUniqueSubmission>
}

export const test = base.extend<SubmissionFixtures>({
	submissionPage: async ({ page }, use) => {
		const submissionPage = new SubmissionPage(page)
		await use(submissionPage)
	},
	uniqueSubmission: async ({ testRun }, use) => {
		const submission = createUniqueSubmission(testRun.testRunId)
		await use(submission)
	},
})

export { baseExpect as expect }
