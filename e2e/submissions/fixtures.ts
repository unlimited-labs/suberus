import { test as base, type Page, type Locator } from "@playwright/test"

// Test data
export const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
}

export const VALID_SUBMISSION = {
	type: "ABSTRACT" as const,
	title: "Test Submission Title for E2E",
	content:
		"This is a test abstract content that needs to be at least 100 characters long. We are testing the submission form and API endpoints to ensure everything works correctly.",
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
	keywords: ["testing", "e2e"],
}

// Generate unique submission data to avoid test conflicts
export function createUniqueSubmission(suffix?: string) {
	const id = suffix ?? Date.now().toString()
	return {
		type: "ABSTRACT" as const,
		title: `Test Submission ${id}`,
		content: `This is a test abstract content for submission ${id}. It needs to be at least 100 characters long for validation to pass. Adding more text here.`,
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
		keywords: [`test-${id}`, "e2e"],
	}
}

// Mailpit helpers
const MAILPIT_API = "http://localhost:8025/api/v1"

export async function clearMailpit() {
	try {
		await fetch(`${MAILPIT_API}/messages`, { method: "DELETE" })
	} catch {
		// Mailpit might not be running
	}
}

export async function getMailpitMessages() {
	try {
		const response = await fetch(`${MAILPIT_API}/messages`)
		return (await response.json()) as {
			messages: Array<{ To: Array<{ Address: string }>; Subject: string }>
		}
	} catch {
		return { messages: [] }
	}
}

// Login helper
export async function loginAsTestUser(page: Page) {
	await page.goto("/login")
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 60000 })
	await page.getByLabel("E-mail").fill(TEST_USER.email)
	await page.getByLabel("Password").fill(TEST_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	await page.waitForURL("/", { timeout: 30000 })
}

// Page Object
export class SubmissionPage {
	readonly page: Page
	readonly submitButton: Locator
	readonly titleInput: Locator
	readonly contentInput: Locator

	constructor(page: Page) {
		this.page = page
		this.submitButton = page.getByRole("button", { name: "Submit" })
		this.titleInput = page.getByLabel("Title")
		this.contentInput = page.getByLabel("Abstract")
	}

	async goto() {
		await this.page.goto("/submissions/new")
	}

	async selectType(type: "ABSTRACT" | "POSTER") {
		await this.page.getByRole("button", { name: type, exact: false }).click()
	}

	async fillTitle(title: string) {
		await this.titleInput.fill(title)
	}

	async fillContent(content: string) {
		await this.contentInput.fill(content)
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

		await firstNameInput.fill(author.firstName)
		await lastNameInput.fill(author.lastName)
		await emailInput.fill(author.email)

		// Fill affiliation using the placeholder in the same author card
		const authorCard = this.page
			.locator(`#author-${index}-firstName`)
			.locator("xpath=ancestor::div[contains(@class, 'rounded-lg')]")
		const affiliationInput = authorCard.getByPlaceholder("Type affiliation...")
		await affiliationInput.fill(author.affiliationName)
		await this.page.waitForTimeout(400) // debounce
		await affiliationInput.blur()
		await this.page.waitForTimeout(300) // API call
	}

	async addAuthor() {
		await this.page.getByRole("button", { name: "Add Author" }).click()
	}

	async addKeyword(keyword: string) {
		// Keywords input is inside the Keywords section
		const keywordsSection = this.page
			.locator("text=Keywords")
			.locator("xpath=ancestor::div[contains(@class, 'space-y')]")
		const keywordInput = keywordsSection.locator("input[type='text']")
		await keywordInput.fill(keyword)
		// Press Enter to add keyword (or comma for tokenization)
		await keywordInput.press("Enter")
	}

	async submit() {
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
	submissionPage: SubmissionPage
	uniqueSubmission: ReturnType<typeof createUniqueSubmission>
}

export const test = base.extend<SubmissionFixtures>({
	submissionPage: async ({ page }, use) => {
		const submissionPage = new SubmissionPage(page)
		await use(submissionPage)
	},
	uniqueSubmission: async ({}, use) => {
		const submission = createUniqueSubmission()
		await use(submission)
	},
})

export { expect } from "@playwright/test"
