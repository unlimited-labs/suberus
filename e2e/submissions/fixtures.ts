import { type Page, type Locator } from "@playwright/test"
import { test as base, expect as baseExpect, type TestRunContext, type CleanupContext } from "../helpers/base-fixtures"

// Test data
export const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
}

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

// Mailpit helpers
const MAILPIT_API = "http://localhost:8025/api/v1"

export async function clearMailpit(testRunId?: string) {
	try {
		if (!testRunId) {
			// Legacy: clear all messages
			await fetch(`${MAILPIT_API}/messages`, { method: "DELETE" })
			return
		}

		// Get all messages and delete only those matching testRunId
		const { messages } = await getMailpitMessages()
		for (const message of messages as Array<{ ID: string }>) {
			try {
				const response = await fetch(`${MAILPIT_API}/message/${message.ID}`)
				const details = (await response.json()) as { Headers?: Record<string, string[]> }
				// Check if X-Test-Run-Id header matches
				const testRunHeader = details.Headers?.["X-Test-Run-Id"]?.[0]
				if (testRunHeader === testRunId) {
					await fetch(`${MAILPIT_API}/message/${message.ID}`, { method: "DELETE" })
				}
			} catch {
				// Skip if message already deleted or error fetching
			}
		}
	} catch {
		// Mailpit might not be running
	}
}

export async function getMailpitMessages() {
	try {
		const response = await fetch(`${MAILPIT_API}/messages`)
		return (await response.json()) as {
			messages: Array<{ ID: string; To: Array<{ Address: string }>; Subject: string }>
		}
	} catch {
		return { messages: [] }
	}
}

// Login helper
export async function loginAsTestUser(page: Page) {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(TEST_USER.email)
	await page.getByLabel("Password").fill(TEST_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	// API auth + session + redirect
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

		// Fill affiliation using the placeholder in the same author card
		const affiliationInput = this.getAuthorCard(index).getByPlaceholder("Type affiliation...")
		await affiliationInput.fill(author.affiliationName)
		// Wait for affiliation API response after blur (sets affiliationId in form state)
		await Promise.all([
			this.page.waitForResponse((resp) => resp.url().includes("_server") && resp.status() === 200, { timeout: 10000 }).catch(() => null),
			affiliationInput.blur(),
		])
		await baseExpect(affiliationInput).toHaveValue(author.affiliationName, { timeout: 5000 })
	}

	async fillAffiliation(index: number, affiliationName: string) {
		const affiliationInput = this.getAuthorCard(index).getByPlaceholder("Type affiliation...")
		await affiliationInput.fill(affiliationName)
		// Wait for affiliation API response after blur (sets affiliationId in form state)
		await Promise.all([
			this.page.waitForResponse((resp) => resp.url().includes("_server") && resp.status() === 200, { timeout: 10000 }).catch(() => null),
			affiliationInput.blur(),
		])
		await baseExpect(affiliationInput).toHaveValue(affiliationName, { timeout: 5000 })
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
