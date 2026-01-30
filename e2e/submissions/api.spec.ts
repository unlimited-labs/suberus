import { test, expect } from "@playwright/test"
import {
	VALID_SUBMISSION,
	loginAsTestUser,
	createUniqueSubmission,
	clearMailpit,
	getMailpitMessages,
} from "./fixtures"

test.describe("Submissions API", () => {
	test("POST /api/submissions returns 401 without session", async ({
		request,
	}) => {
		const response = await request.post("/api/submissions", {
			data: VALID_SUBMISSION,
		})

		expect(response.status()).toBe(401)
		const data = await response.json()
		expect(data.error).toBe("Unauthorized")
	})

	test("POST /api/submissions returns 400 for missing title", async ({
		page,
	}) => {
		await loginAsTestUser(page)

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...VALID_SUBMISSION,
				title: "",
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toBe("Validation failed")
		expect(data.issues).toBeDefined()
	})

	test("POST /api/submissions returns 400 for short content", async ({
		page,
	}) => {
		await loginAsTestUser(page)

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...VALID_SUBMISSION,
				content: "Too short",
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toBe("Validation failed")
	})

	test("POST /api/submissions returns 400 for empty authors", async ({
		page,
	}) => {
		await loginAsTestUser(page)

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...VALID_SUBMISSION,
				authors: [],
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toBe("Validation failed")
	})

	test("POST /api/submissions returns 400 for missing presenter", async ({
		page,
	}) => {
		await loginAsTestUser(page)

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...VALID_SUBMISSION,
				authors: [
					{
						...VALID_SUBMISSION.authors[0],
						isPresenter: false,
					},
				],
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toBe("Validation failed")
	})

	test("POST /api/submissions returns 400 for empty keywords", async ({
		page,
	}) => {
		await loginAsTestUser(page)

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...VALID_SUBMISSION,
				keywords: [],
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toBe("Validation failed")
	})

	test("POST /api/submissions creates submission successfully", async ({
		page,
	}) => {
		await loginAsTestUser(page)

		// Use unique data to avoid conflicts
		const submission = createUniqueSubmission()

		const response = await page.context().request.post("/api/submissions", {
			data: submission,
		})

		expect(response.status()).toBe(201)
		const data = await response.json()
		expect(data.success).toBe(true)
		expect(data.id).toBeDefined()
		expect(typeof data.id).toBe("string")
	})

	test("POST /api/submissions validates type enum", async ({ page }) => {
		await loginAsTestUser(page)

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...VALID_SUBMISSION,
				type: "INVALID_TYPE",
			},
		})

		expect(response.status()).toBe(400)
		const data = await response.json()
		expect(data.error).toBe("Validation failed")
	})

	test("POST /api/submissions accepts POSTER type", async ({ page }) => {
		await loginAsTestUser(page)

		const submission = createUniqueSubmission()

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...submission,
				type: "POSTER",
			},
		})

		expect(response.status()).toBe(201)
		const data = await response.json()
		expect(data.success).toBe(true)
	})

	test("POST /api/submissions accepts multiple authors", async ({ page }) => {
		await loginAsTestUser(page)

		const id = Date.now().toString()

		const response = await page.context().request.post("/api/submissions", {
			data: {
				...createUniqueSubmission(id),
				authors: [
					{
						firstName: "John",
						lastName: "Doe",
						email: `john.${id}@test.com`,
						affiliationId: null,
						affiliationName: "University A",
						isPresenter: true,
					},
					{
						firstName: "Jane",
						lastName: "Smith",
						email: `jane.${id}@test.com`,
						affiliationId: null,
						affiliationName: "University B",
						isPresenter: false,
					},
				],
			},
		})

		expect(response.status()).toBe(201)
	})

	test("POST /api/submissions sends confirmation email to presenter", async ({
		page,
	}) => {
		await loginAsTestUser(page)

		// Clear mailpit before test
		await clearMailpit()

		// Use unique submission to ensure we can identify the email
		const submission = createUniqueSubmission()

		const response = await page.context().request.post("/api/submissions", {
			data: submission,
		})

		expect(response.status()).toBe(201)

		// Wait for email to be sent (async)
		await page.waitForTimeout(1000)

		// Check mailpit for email
		const mailpit = await getMailpitMessages()

		// Find email sent to the presenter
		const email = mailpit.messages.find(
			(m) => m.To[0]?.Address === submission.authors[0].email
		)

		expect(email).toBeDefined()
		expect(email?.Subject).toContain("Submission Received")
		expect(email?.Subject).toContain(submission.title)
	})
})
