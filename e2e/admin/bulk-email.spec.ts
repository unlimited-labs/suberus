import { loginAs } from "../helpers/auth"
import {
	clearMailpit,
	getMailpitMessage,
	waitForEmail,
} from "../helpers/mailpit"
import {
	createSubmission,
	createTestUser,
	deleteTestUser,
	getPrisma,
} from "../helpers/test-db"
import { TEST_USER } from "../helpers/test-users"
import { expect, test } from "./fixtures"

// Desktop only — selection + composer are a desktop table/form layout.
test.beforeEach(({}, testInfo) => {
	test.skip(testInfo.project.name.includes("mobile"), "Desktop only")
})

/** Creates an isolated recipient whose email is tagged for mailpit cleanup. */
async function makeRecipient(
	testRunId: string,
	tag: string,
	firstName: string,
) {
	return createTestUser({
		email: `${tag}-${testRunId}@e2e.local`,
		firstName,
		lastName: "Recipient",
		role: "AUTHOR",
	})
}

/** Waits for an email to `to` (subject contains `runId`) and returns its HTML. */
async function expectEmailHtml(to: string, runId: string): Promise<string> {
	const msg = await waitForEmail(to, runId, 15000)
	expect(msg, `no email delivered to ${to}`).toBeTruthy()
	const full = await getMailpitMessage((msg as { ID: string }).ID)
	const html = (full as { HTML?: string } | null)?.HTML
	expect(html, `no HTML body for ${to}`).toBeTruthy()
	return html as string
}

test.describe("Admin - Bulk Email", () => {
	test("sends a campaign with per-recipient placeholders and records history", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		// One recipient WITH a submission (so {{title}} resolves), one WITHOUT.
		const withTitle = await makeRecipient(runId, "alice", "Alice")
		const noTitle = await makeRecipient(runId, "bob", "Bob")
		await createSubmission({
			testRunId: runId,
			title: "Quantum Posters",
			userId: withTitle.id,
		})

		try {
			// Admin auth comes from the chromium-admin project storageState.
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			// Freshly-created users sort newest-first onto page 1; select by email.
			await adminUsersPage.selectUser({ ...withTitle, firstName: "Alice", lastName: "Recipient" })
			await adminUsersPage.selectUser({ ...noTitle, firstName: "Bob", lastName: "Recipient" })

			await adminUsersPage.selectBulkAction("Send email")
			await adminUsersPage.clickApply()

			await page.waitForURL(/\/admin\/bulk-email\/[0-9a-f-]+$/, { timeout: 15000 })
			const campaignId = page.url().split("/").pop() as string

			await page.getByTestId("campaign-subject").fill(`Hello {{firstName}} ${runId}`)
			await page
				.getByTestId("campaign-body")
				.fill("Hi **{{firstName}}** — your work: {{title}}.")

			await page.getByTestId("send-campaign-btn").click()

			// Campaign reaches SENT with both recipients delivered.
			const db = getPrisma()
			await expect
				.poll(
					async () => {
						const c = await db.emailCampaign.findUnique({
							where: { id: campaignId },
							select: { status: true, sentCount: true },
						})
						return `${c?.status}:${c?.sentCount}`
					},
					{ timeout: 30000 },
				)
				.toBe("SENT:2")

			// The composer reflects completion live (SSE → query refetch): the
			// header badge flips to SENT and the progress bar finishes.
			await expect(page.getByTestId("campaign-status")).toHaveText("SENT", {
				timeout: 15000,
			})
			await expect(page.getByTestId("campaign-progress")).toContainText(
				"2 / 2 processed",
				{ timeout: 15000 },
			)

			// Alice's email: firstName + title substituted.
			const aliceHtml = await expectEmailHtml(withTitle.email, runId)
			expect(aliceHtml).toContain("Alice")
			expect(aliceHtml).toContain("Quantum Posters")
			expect(aliceHtml).not.toContain("{{firstName}}")

			// Bob has no submission: {{title}} renders empty, no leftover token.
			const bobHtml = await expectEmailHtml(noTitle.email, runId)
			expect(bobHtml).toContain("Bob")
			expect(bobHtml).not.toContain("{{title}}")

			// "Copy to new draft" clones the sent campaign into a fresh, editable
			// DRAFT prefilled with the same content and recipients.
			await page.getByTestId("copy-campaign-btn").click()
			await page.waitForURL(
				(url) =>
					/\/admin\/bulk-email\/[0-9a-f-]+$/.test(url.pathname) &&
					!url.pathname.endsWith(campaignId),
				{ timeout: 15000 },
			)
			expect(page.url().split("/").pop()).not.toBe(campaignId)
			await expect(page.getByTestId("campaign-status")).toHaveText("DRAFT")
			await expect(page.getByTestId("campaign-subject")).toHaveValue(
				`Hello {{firstName}} ${runId}`,
			)
			await expect(page.getByTestId("recipient-count")).toHaveText("2")

			// History list shows the campaign.
			await page.goto("/admin/bulk-email")
			await expect(page.getByTestId("campaign-list")).toContainText(runId)
		} finally {
			await deleteTestUser(withTitle.id)
			await deleteTestUser(noTitle.id)
			await clearMailpit(runId)
		}
	})

	test("Test (send to me) delivers one preview to the admin", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "carol", "Carol")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Carol", lastName: "Recipient" })
			await adminUsersPage.selectBulkAction("Send email")
			await adminUsersPage.clickApply()
			await page.waitForURL(/\/admin\/bulk-email\/[0-9a-f-]+$/, { timeout: 15000 })

			await page.getByTestId("campaign-subject").fill(`Preview ${runId}`)
			await page.getByTestId("campaign-body").fill("Hi {{firstName}}")
			await page.getByTestId("test-send-btn").click()

			// Goes to the logged-in admin with a [TEST] subject.
			const msg = await waitForEmail("admin@e2e.local", runId, 15000)
			expect(msg).toBeTruthy()
			expect(msg?.Subject).toContain("[TEST]")
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
		}
	})

	test("MJML format renders an HTML preview", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "dave", "Dave")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Dave", lastName: "Recipient" })
			await adminUsersPage.selectBulkAction("Send email")
			await adminUsersPage.clickApply()
			await page.waitForURL(/\/admin\/bulk-email\/[0-9a-f-]+$/, { timeout: 15000 })

			await page.getByTestId("format-select").click()
			await page.getByRole("option", { name: "MJML" }).click()
			await page
				.getByTestId("campaign-body")
				.fill(
					"<mjml><mj-body><mj-section><mj-column><mj-text>Hello MJML World</mj-text></mj-column></mj-section></mj-body></mjml>",
				)
			await page.getByRole("tab", { name: "Preview" }).click()

			const frame = page.frameLocator('[data-testid="email-preview"] iframe')
			await expect(frame.getByText("Hello MJML World")).toBeVisible({ timeout: 15000 })
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
		}
	})

	test("deletes a draft campaign", async ({ page, testRun, adminUsersPage }) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "erin", "Erin")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Erin", lastName: "Recipient" })
			await adminUsersPage.selectBulkAction("Send email")
			await adminUsersPage.clickApply()
			await page.waitForURL(/\/admin\/bulk-email\/[0-9a-f-]+$/, { timeout: 15000 })
			const campaignId = page.url().split("/").pop() as string

			await page.getByTestId("delete-campaign-btn").click()
			await expect(page).toHaveURL("/admin/bulk-email")

			const db = getPrisma()
			const deleted = await db.emailCampaign.findUnique({
				where: { id: campaignId },
			})
			expect(deleted).toBeNull()
		} finally {
			await deleteTestUser(rcpt.id)
		}
	})

	test("non-admin cannot reach the bulk-email page", async ({ page }) => {
		// Drop the admin storageState session, then sign in as a plain author.
		await loginAs(page, TEST_USER, { clearCookies: true })
		await page.goto("/admin/bulk-email")
		// adminRouteMiddleware redirects non-admins to the dashboard.
		await expect(page).toHaveURL("/")
	})
})
