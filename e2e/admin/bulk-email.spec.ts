import { loginAs } from "../helpers/auth"
import {
	clearMailpit,
	getMailpitMessage,
	mailpit,
	waitForEmail,
} from "../helpers/mailpit"
import {
	createSubmission,
	createTestUser,
	deleteTestUser,
	getPrisma,
} from "../helpers/test-db"
import { CONTACT_EMAIL, TEST_USER } from "../helpers/test-users"
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

			const campaignId = await adminUsersPage.openBulkEmailComposer()

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

	test("sets the Reply-To header when a reply-to address is filled", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const replyToAddr = "organizer@example.com"
		const rcpt = await makeRecipient(runId, "erin", "Erin")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Erin", lastName: "Recipient" })

			const campaignId = await adminUsersPage.openBulkEmailComposer()

			await page.getByTestId("campaign-subject").fill(`Reply-To ${runId}`)
			await page.getByTestId("campaign-body").fill("Hi {{firstName}}")
			await page.getByTestId("campaign-reply-to").fill(replyToAddr)

			await page.getByTestId("send-campaign-btn").click()

			const db = getPrisma()
			await expect
				.poll(
					async () => {
						const c = await db.emailCampaign.findUnique({
							where: { id: campaignId },
							select: { status: true, replyTo: true },
						})
						return `${c?.status}:${c?.replyTo}`
					},
					{ timeout: 30000 },
				)
				.toBe(`SENT:${replyToAddr}`)

			const msg = await waitForEmail(rcpt.email, runId, 15000)
			expect(msg, `no email delivered to ${rcpt.email}`).toBeTruthy()
			const headers = await mailpit.getMessageHeaders((msg as { ID: string }).ID)
			expect(headers["Reply-To"]?.[0]).toBe(replyToAddr)
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
		}
	})

	test("falls back to the conference Contact Email when reply-to is blank", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "frank", "Frank")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Frank", lastName: "Recipient" })

			const campaignId = await adminUsersPage.openBulkEmailComposer()

			await page.getByTestId("campaign-subject").fill(`Reply-To fallback ${runId}`)
			await page.getByTestId("campaign-body").fill("Hi {{firstName}}")
			// Reply-To deliberately left blank.

			await page.getByTestId("send-campaign-btn").click()

			const db = getPrisma()
			await expect
				.poll(
					async () => {
						const c = await db.emailCampaign.findUnique({
							where: { id: campaignId },
							select: { status: true, replyTo: true },
						})
						return `${c?.status}:${c?.replyTo}`
					},
					{ timeout: 30000 },
				)
				.toBe("SENT:null")

			const msg = await waitForEmail(rcpt.email, runId, 15000)
			expect(msg, `no email delivered to ${rcpt.email}`).toBeTruthy()
			const headers = await mailpit.getMessageHeaders((msg as { ID: string }).ID)
			expect(headers["Reply-To"]?.[0]).toBe(CONTACT_EMAIL)
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

	test("Send and Send test are disabled until subject and body are filled", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "gwen", "Gwen")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Gwen", lastName: "Recipient" })
			await adminUsersPage.openBulkEmailComposer()

			// Empty subject + body → both dispatch actions blocked.
			await expect(page.getByTestId("send-campaign-btn")).toBeDisabled()
			await expect(page.getByTestId("test-send-btn")).toBeDisabled()

			// Subject alone is not enough.
			await page.getByTestId("campaign-subject").fill(`Hello ${runId}`)
			await expect(page.getByTestId("send-campaign-btn")).toBeDisabled()
			await expect(page.getByTestId("test-send-btn")).toBeDisabled()

			// Both filled → enabled.
			await page.getByTestId("campaign-body").fill("Hi there")
			await expect(page.getByTestId("send-campaign-btn")).toBeEnabled()
			await expect(page.getByTestId("test-send-btn")).toBeEnabled()
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
			const campaignId = await adminUsersPage.openBulkEmailComposer()

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

	test("saves a draft and persists subject, body and format across reload", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "frank", "Frank")
		const body = "Saved **body** for {{firstName}}"

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Frank", lastName: "Recipient" })
			const campaignId = await adminUsersPage.openBulkEmailComposer()

			await page.getByTestId("campaign-subject").fill(`Draft ${runId}`)
			await page.getByTestId("campaign-body").fill(body)
			// Change the format too, to prove it is part of the saved draft.
			await page.getByTestId("format-select").click()
			await page.getByRole("option", { name: "MJML" }).click()
			await page.getByTestId("save-draft-btn").click()
			await expect(page.getByText("Draft saved")).toBeVisible()

			// The save is persisted as a DRAFT.
			const db = getPrisma()
			await expect
				.poll(async () => {
					const c = await db.emailCampaign.findUnique({
						where: { id: campaignId },
						select: { status: true, format: true, subject: true },
					})
					return `${c?.status}|${c?.format}|${c?.subject}`
				})
				.toBe(`DRAFT|MJML|Draft ${runId}`)

			// Reload rehydrates the composer from the saved draft.
			await page.reload()
			await expect(page.getByTestId("campaign-subject")).toHaveValue(
				`Draft ${runId}`,
			)
			await expect(page.getByTestId("campaign-body")).toHaveValue(body)
			await expect(page.getByTestId("format-select")).toContainText("MJML")
			await expect(page.getByTestId("campaign-status")).toHaveText("DRAFT")
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
		}
	})

	test("a sent campaign is read-only and copies into an editable draft", async ({
		page,
		testRun,
	}) => {
		const runId = testRun.testRunId
		const db = getPrisma()
		const body =
			"<mjml><mj-body><mj-section><mj-column><mj-text>Hi {{firstName}}</mj-text></mj-column></mj-section></mj-body></mjml>"
		const campaign = await db.emailCampaign.create({
			data: {
				subject: `Sent ${runId}`,
				format: "MJML",
				bodySource: body,
				status: "SENT",
				sentAt: new Date(),
				totalRecipients: 2,
				sentCount: 2,
				recipients: {
					create: [
						{ email: `gina-${runId}@e2e.local`, firstName: "Gina", status: "SENT" },
						{ email: `hank-${runId}@e2e.local`, firstName: "Hank", status: "SENT" },
					],
				},
			},
		})

		try {
			await page.goto(`/admin/bulk-email/${campaign.id}`)

			// Read-only: SENT badge, disabled editor, no draft-only actions.
			await expect(page.getByTestId("campaign-status")).toHaveText("SENT")
			await expect(page.getByTestId("campaign-subject")).toBeDisabled()
			await expect(page.getByTestId("campaign-body")).toBeDisabled()
			await expect(page.getByTestId("send-campaign-btn")).toHaveCount(0)
			await expect(page.getByTestId("save-draft-btn")).toHaveCount(0)
			await expect(page.getByTestId("delete-campaign-btn")).toHaveCount(0)
			// Per-recipient delivery is reflected.
			await expect(page.getByTestId("recipient-summary")).toContainText("2 sent")
			await expect(page.getByTestId("recipient-summary")).toContainText("SENT")

			// Copy clones content, format and recipients into a fresh DRAFT.
			await page.getByTestId("copy-campaign-btn").click()
			await page.waitForURL(
				(url) =>
					/\/admin\/bulk-email\/[0-9a-f-]+$/.test(url.pathname) &&
					!url.pathname.endsWith(campaign.id),
				{ timeout: 15000 },
			)
			const copyId = page.url().split("/").pop() as string

			await expect(page.getByTestId("campaign-status")).toHaveText("DRAFT")
			await expect(page.getByTestId("campaign-subject")).toHaveValue(`Sent ${runId}`)
			await expect(page.getByTestId("campaign-body")).toHaveValue(body)
			await expect(page.getByTestId("format-select")).toContainText("MJML")
			await expect(page.getByTestId("recipient-count")).toHaveText("2")
			// The clone is editable again.
			await expect(page.getByTestId("campaign-subject")).toBeEnabled()
			await expect(page.getByTestId("send-campaign-btn")).toBeVisible()

			await db.emailCampaign.delete({ where: { id: copyId } }).catch(() => {})
		} finally {
			await db.emailCampaign.delete({ where: { id: campaign.id } }).catch(() => {})
			await clearMailpit(runId)
		}
	})

	test("renders Markdown and Plain previews", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "mia", "Mia")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Mia", lastName: "Recipient" })
			await adminUsersPage.selectBulkAction("Send email")
			await page.waitForURL(/\/admin\/bulk-email\/[0-9a-f-]+$/, { timeout: 15000 })

			// Markdown (default): bold renders as <strong> inside the preview frame.
			await page.getByTestId("campaign-body").fill("Hello **bold world**")
			await page.getByRole("tab", { name: "Preview" }).click()
			const frame = page.frameLocator('[data-testid="email-preview"] iframe')
			await expect(frame.locator("strong")).toHaveText("bold world", {
				timeout: 15000,
			})

			// Plain: preview shows the source verbatim (no markdown rendering).
			await page.getByRole("tab", { name: "Body" }).click()
			await page.getByTestId("format-select").click()
			await page.getByRole("option", { name: "Plain text" }).click()
			await page.getByTestId("campaign-body").fill("Just **raw** text")
			await page.getByRole("tab", { name: "Preview" }).click()
			await expect(page.getByTestId("email-preview")).toContainText(
				"Just **raw** text",
			)
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
		}
	})

	test("placeholder chips copy the token to the clipboard", async ({
		page,
		context,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "nora", "Nora")
		await context.grantPermissions(["clipboard-read", "clipboard-write"])

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Nora", lastName: "Recipient" })
			await adminUsersPage.selectBulkAction("Send email")
			await page.waitForURL(/\/admin\/bulk-email\/[0-9a-f-]+$/, { timeout: 15000 })

			await page.getByTestId("placeholder-firstName").click()
			await expect(page.getByText("Copied to clipboard")).toBeVisible()
			const copied = await page.evaluate(() => navigator.clipboard.readText())
			expect(copied).toBe("{{firstName}}")
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
		}
	})

	test("records failed deliveries and marks the campaign FAILED", async ({
		page,
		testRun,
	}) => {
		const runId = testRun.testRunId
		const db = getPrisma()
		// Empty recipient addresses make the SMTP send throw, so every delivery
		// fails deterministically (no Mailpit dependency) → status FAILED.
		const campaign = await db.emailCampaign.create({
			data: {
				subject: `Fail ${runId}`,
				format: "PLAIN",
				bodySource: "Hi {{firstName}}",
				status: "DRAFT",
				totalRecipients: 2,
				recipients: {
					create: [
						{ email: "", firstName: "Ivy", status: "PENDING" },
						{ email: "", firstName: "Jack", status: "PENDING" },
					],
				},
			},
		})

		try {
			await page.goto(`/admin/bulk-email/${campaign.id}`)
			await page.getByTestId("send-campaign-btn").click()

			await expect
				.poll(
					async () => {
						const c = await db.emailCampaign.findUnique({
							where: { id: campaign.id },
							select: { status: true, failedCount: true },
						})
						return `${c?.status}:${c?.failedCount}`
					},
					{ timeout: 30000 },
				)
				.toBe("FAILED:2")

			// Header badge → FAILED; the Recipients panel shows the failed count
			// and per-recipient FAILED marks.
			await expect(page.getByTestId("campaign-status")).toHaveText("FAILED", {
				timeout: 15000,
			})
			await expect(page.getByTestId("recipient-summary")).toContainText(
				"2 failed",
			)
			await expect(page.getByTestId("recipient-summary")).toContainText("FAILED")
		} finally {
			await db.emailCampaign.delete({ where: { id: campaign.id } }).catch(() => {})
			await clearMailpit(runId)
		}
	})

	// Minimal valid PDF: file-type detects it by the leading "%PDF" signature,
	// so the server-side magic-number check accepts it.
	const MINIMAL_PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")

	test("attaches a file to a draft and delivers it with the email", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "olive", "Olive")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Olive", lastName: "Recipient" })
			const campaignId = await adminUsersPage.openBulkEmailComposer()

			await page.getByTestId("campaign-subject").fill(`Attach ${runId}`)
			await page.getByTestId("campaign-body").fill("Hi {{firstName}}")

			await page.locator('input[type="file"]').setInputFiles({
				name: "agenda.pdf",
				mimeType: "application/pdf",
				buffer: MINIMAL_PDF,
			})
			await expect(page.getByTestId("attachment-list")).toContainText("agenda.pdf")

			const db = getPrisma()
			await expect
				.poll(() =>
					db.file.count({
						where: { entityType: "EMAIL_CAMPAIGN", entityId: campaignId },
					}),
				)
				.toBe(1)

			await page.getByTestId("send-campaign-btn").click()
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
				.toBe("SENT:1")

			// The delivered email carries the attachment.
			const msg = await waitForEmail(rcpt.email, runId, 15000)
			expect(msg, "no email delivered").toBeTruthy()
			const full = (await getMailpitMessage((msg as { ID: string }).ID)) as {
				Attachments?: { FileName: string }[]
			} | null
			expect(full?.Attachments?.length ?? 0).toBeGreaterThan(0)
			expect(full?.Attachments?.[0]?.FileName).toContain("agenda")
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
		}
	})

	test("removes an attachment from a draft", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const rcpt = await makeRecipient(runId, "peter", "Peter")

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...rcpt, firstName: "Peter", lastName: "Recipient" })
			const campaignId = await adminUsersPage.openBulkEmailComposer()

			await page.locator('input[type="file"]').setInputFiles({
				name: "report.pdf",
				mimeType: "application/pdf",
				buffer: MINIMAL_PDF,
			})
			await expect(page.getByTestId("attachment-list")).toContainText("report.pdf")

			await page.getByTestId("attachment-remove-btn").click()

			const db = getPrisma()
			await expect
				.poll(() =>
					db.file.count({
						where: { entityType: "EMAIL_CAMPAIGN", entityId: campaignId },
					}),
				)
				.toBe(0)
		} finally {
			await deleteTestUser(rcpt.id)
			await clearMailpit(runId)
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
