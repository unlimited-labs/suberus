import type { Page } from "@playwright/test"
import * as XLSX from "xlsx"
import { loginAs } from "../helpers/auth"
import { clearMailpit, waitForEmail } from "../helpers/mailpit"
import { createSubmission, createTestUser, deleteTestUser, getPrisma } from "../helpers/test-db"
import { DEFAULT_PASSWORD } from "../helpers/test-users"
import { expect, test } from "./fixtures"

// Desktop only — selection + composer are a desktop table/form layout.
test.beforeEach(({}, testInfo) => {
	test.skip(testInfo.project.name.includes("mobile"), "Desktop only")
})

function sheetFile(rows: unknown[][]) {
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Uczestnicy")
	return {
		name: "rooms.xlsx",
		mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer,
	}
}

async function publish(page: Page) {
	await page.getByTestId("publish-announcement-btn").click()
	await page.getByTestId("confirm-publish-btn").click()
	await expect(page.getByTestId("announcement-status")).toHaveText("PUBLISHED", {
		timeout: 15000,
	})
}

test.describe("Admin - Announcements", () => {
	test("publishes to the dashboard, marks read, and edits one person's copy", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const alice = await createTestUser({
			email: `ann-alice-${runId}@e2e.local`,
			firstName: "Alice",
			lastName: "Reader",
			role: "AUTHOR",
		})
		const bob = await createTestUser({
			email: `ann-bob-${runId}@e2e.local`,
			firstName: "Bob",
			lastName: "Reader",
			role: "AUTHOR",
		})
		await createSubmission({
			testRunId: runId,
			title: "Quantum Posters",
			userId: alice.id,
		})
		const db = getPrisma()
		let announcementId = ""

		try {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...alice, firstName: "Alice", lastName: "Reader" })
			await adminUsersPage.selectUser({ ...bob, firstName: "Bob", lastName: "Reader" })

			announcementId = await adminUsersPage.openAnnouncementComposer()
			await expect(page.getByTestId("recipient-count")).toHaveText("2")

			await page.getByTestId("announcement-subject").fill(`Room change ${runId}`)
			await page
				.getByTestId("announcement-body")
				.fill("Hi **{{firstName}}** — your work: {{titel}}.")
			await expect(page.getByTestId("placeholder-unknown")).toContainText("{{titel}}")
			await expect(page.getByTestId("publish-announcement-btn")).toBeDisabled()

			await page
				.getByTestId("announcement-body")
				.fill("Hi **{{firstName}}** — your work: {{title}}.")
			await expect(page.getByTestId("publish-announcement-btn")).toBeEnabled()

			await publish(page)

			const rows = await db.announcementRecipient.findMany({
				where: { announcementId },
			})
			expect(rows).toHaveLength(2)
			const aliceRow = rows.find((r) => r.userId === alice.id)
			expect(aliceRow?.renderedSubject).toBe(`Room change ${runId}`)
			expect(aliceRow?.renderedBody).toContain("<strong>Alice</strong>")
			expect(aliceRow?.renderedBody).toContain("Quantum Posters")
			expect(aliceRow?.publishedAt).not.toBeNull()

			// Alice reads it on her dashboard and marks it read.
			const readerContext = await page.context().browser()?.newContext({
				storageState: { cookies: [], origins: [] },
				baseURL: new URL(page.url()).origin,
			})
			if (!readerContext) throw new Error("no browser for the reader context")
			const readerPage = await readerContext.newPage()
			try {
				await loginAs(readerPage, { email: alice.email, password: DEFAULT_PASSWORD })
				await readerPage.goto("/")

				const row = readerPage.getByTestId("announcement-row")
				await expect(row).toHaveCount(1)
				await expect(row).toContainText(`Room change ${runId}`)
				await expect(
					readerPage.getByTestId("announcement-unread-count"),
				).toContainText("1 unread")

				await row.click()
				await expect(
					readerPage.getByTestId("announcement-dialog-body"),
				).toContainText("Quantum Posters")
				await readerPage.getByTestId("mark-read-btn").click()

				await expect(
					readerPage.getByTestId("announcement-unread-count"),
				).toHaveCount(0)
			} finally {
				await readerContext.close()
			}

			const afterRead = await db.announcementRecipient.findFirst({
				where: { announcementId, userId: alice.id },
			})
			expect(afterRead?.readAt).not.toBeNull()

			// Admin rewrites Bob's copy only.
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail({
				email: bob.email,
				firstName: "Bob",
				lastName: "Reader",
			})
			await expect(page.getByTestId("user-announcement-row")).toHaveCount(1)
			await page.getByTestId("edit-announcement-btn").click()
			await expect(page.getByTestId("recipient-body")).toHaveValue(/Hi \*\*Bob\*\*/)
			await page.getByTestId("recipient-body").fill("Bob only: come at 9.")
			await page.getByTestId("save-recipient-btn").click()

			await expect
				.poll(async () => {
					const r = await db.announcementRecipient.findFirst({
						where: { announcementId, userId: bob.id },
					})
					return r?.renderedBody
				})
				.toContain("Bob only: come at 9.")

			const aliceUntouched = await db.announcementRecipient.findFirst({
				where: { announcementId, userId: alice.id },
			})
			expect(aliceUntouched?.renderedBody).toContain("Quantum Posters")
			expect(aliceUntouched?.readAt).not.toBeNull()
		} finally {
			if (announcementId) {
				await db.announcement.delete({ where: { id: announcementId } }).catch(() => {})
			}
			await deleteTestUser(alice.id)
			await deleteTestUser(bob.id)
		}
	})

	test("waits for the admin to ignore rows with no account", async ({
		page,
		testRun,
	}) => {
		const runId = testRun.testRunId
		const known = await createTestUser({
			email: `ann-sheet-${runId}@e2e.local`,
			firstName: "Karol",
			lastName: "Znany",
			role: "AUTHOR",
		})
		const strangerEmail = `ann-stranger-${runId}@e2e.local`
		const db = getPrisma()
		let announcementId = ""

		try {
			await page.goto("/admin/announcements")
			await page.getByTestId("import-sheet-btn").click()
			await page.locator('input[type="file"]').setInputFiles(
				sheetFile([
					["Imię", "Mail", "Pokój"],
					["Karol", known.email, "A-12"],
					["Nowa", strangerEmail, "B-3"],
				]),
			)
			await page.getByTestId("sheet-check-btn").click()

			await expect(page.getByTestId("sheet-counts")).toContainText(
				"1 of 2 have an account",
			)
			await expect(page.getByText(strangerEmail)).toBeVisible()
			// Blocked until the admin says the strangers may be dropped.
			await expect(page.getByTestId("sheet-map-btn")).toHaveCount(0)

			await page.getByRole("radio", { name: "Ignore them and carry on" }).click()
			await page.getByTestId("sheet-map-btn").click()

			await page.getByTestId("sheet-target-2").click()
			await page.getByRole("option", { name: "Placeholder" }).click()
			await page.getByTestId("sheet-key-2").fill("room")
			await page.getByTestId("sheet-create-btn").click()
			await page.waitForURL(/\/admin\/announcements\/[0-9a-f-]+$/, { timeout: 15000 })
			announcementId = page.url().split("/").pop() as string

			await expect(page.getByTestId("placeholder-room")).toBeVisible()
			await page.getByTestId("announcement-subject").fill(`Room ${runId}`)
			await page.getByTestId("announcement-body").fill("You are in {{room}}.")
			await publish(page)

			const rows = await db.announcementRecipient.findMany({
				where: { announcementId },
			})
			expect(
				rows,
				"the ignored address must not become a recipient",
			).toHaveLength(1)
			expect(rows[0]?.renderedBody).toContain("A-12")

			// The composer offers the same per-recipient preview as a sent email.
			await page.getByTestId("recipient-preview-trigger").click()
			await expect(
				page.getByTestId("delivered-announcement-dialog"),
			).toContainText("A-12")
		} finally {
			if (announcementId) {
				await db.announcement.delete({ where: { id: announcementId } }).catch(() => {})
			}
			await deleteTestUser(known.id)
		}
	})

	test("an email campaign with Save in user profile also lands on the dashboard", async ({
		page,
		testRun,
		adminUsersPage,
	}) => {
		const runId = testRun.testRunId
		const user = await createTestUser({
			email: `ann-copy-${runId}@e2e.local`,
			firstName: "Cara",
			lastName: "Copy",
			role: "AUTHOR",
		})
		const db = getPrisma()
		let campaignId = ""

		try {
			await clearMailpit(runId)
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.selectUser({ ...user, firstName: "Cara", lastName: "Copy" })
			campaignId = await adminUsersPage.openBulkEmailComposer()

			await page.getByTestId("campaign-subject").fill(`Fee reminder ${runId}`)
			await page.getByTestId("campaign-body").fill("Hi **{{firstName}}**, please pay.")
			await page.getByTestId("save-to-profile").click()
			await page.getByTestId("send-campaign-btn").click()
			await page.getByTestId("confirm-send-campaign-btn").click()

			const message = await waitForEmail(user.email, runId, 20000)
			expect(message, "no email delivered").toBeTruthy()

			await expect
				.poll(
					async () => {
						const row = await db.announcementRecipient.findFirst({
							where: { userId: user.id },
						})
						return row?.renderedBody
					},
					{ timeout: 30000 },
				)
				.toContain("<strong>Cara</strong>")

			const announcements = await db.announcement.findMany({
				where: { sourceCampaignId: campaignId },
			})
			expect(announcements).toHaveLength(1)
		} finally {
			if (campaignId) {
				await db.announcement
					.deleteMany({ where: { sourceCampaignId: campaignId } })
					.catch(() => {})
				await db.emailCampaign.delete({ where: { id: campaignId } }).catch(() => {})
			}
			await deleteTestUser(user.id)
		}
	})
})
