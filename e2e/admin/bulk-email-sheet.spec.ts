import * as XLSX from "xlsx"
import {
	clearMailpit,
	getMailpitMessage,
	waitForEmail,
} from "../helpers/mailpit"
import { createTestUser, deleteTestUser, getPrisma } from "../helpers/test-db"
import type { Page } from "@playwright/test"
import { expect, test } from "./fixtures"

test.beforeEach(({}, testInfo) => {
	test.skip(testInfo.project.name.includes("mobile"), "Desktop only")
})

function sheetFile(rows: unknown[][]) {
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Uczestnicy")
	return {
		name: "hotels.xlsx",
		mimeType:
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer,
	}
}

async function openWizard(page: Page, rows: unknown[][]) {
	await page.goto("/admin/bulk-email")
	await page.getByTestId("import-sheet-btn").click()
	await page.locator('input[type="file"]').setInputFiles(sheetFile(rows))
}

test.describe("Admin - Bulk Email from a spreadsheet", () => {
	test("imports a sheet, maps a column and delivers per-recipient values", async ({
		page,
		testRun,
	}) => {
		const runId = testRun.testRunId
		const known = await createTestUser({
			email: `sheet-known-${runId}@e2e.local`,
			firstName: "Karol",
			lastName: "Znany",
			role: "AUTHOR",
		})
		const strangerEmail = `sheet-new-${runId}@e2e.local`
		const db = getPrisma()
		let campaignId: string | null = null

		try {
			await openWizard(page, [
				["Conference 2026 — participants"],
				[],
				["Imię", "Nazwisko", "Mail", "Nazwa hotelu"],
				["Karol", "Znany", known.email, "Riverside Hotel"],
				["Nowa", "Osoba", strangerEmail, ""],
			])

			await expect(page.getByTestId("sheet-preview")).toContainText(
				"Riverside Hotel",
			)
			await expect(page.getByTestId("sheet-email-column")).toContainText("Mail")

			await page.getByTestId("sheet-check-btn").click()
			await expect(page.getByTestId("sheet-counts")).toContainText(
				"1 of 2 have an account",
			)
			await expect(page.getByTestId("sheet-counts")).toContainText("1 not found")
			await expect(page.getByTestId("sheet-empty-cells")).toContainText(
				"Nazwa hotelu",
			)

			await page
				.getByRole("radio", { name: "Add them to the campaign anyway" })
				.click()
			await page.getByTestId("sheet-map-btn").click()

			await page.getByTestId("sheet-target-3").click()
			await page.getByRole("option", { name: "Placeholder" }).click()
			await expect(page.getByTestId("sheet-key-3")).toHaveValue("nazwaHotelu")
			await page.getByTestId("sheet-key-3").fill("hotel")

			await page.getByTestId("sheet-target-1").click()
			await page.getByRole("option", { name: "Last name" }).click()

			await page.getByTestId("sheet-create-btn").click()
			await page.waitForURL(/\/admin\/bulk-email\/[0-9a-f-]+$/, {
				timeout: 15000,
			})
			campaignId = page.url().split("/").pop() as string

			await expect(page.getByTestId("recipient-count")).toHaveText("2")
			await expect(page.getByTestId("placeholder-hotel")).toBeVisible()

			await page.getByTestId("campaign-subject").fill(`Hotel ${runId}`)
			await page
				.getByTestId("campaign-body")
				.fill("Dear {{firstName}}, room at {{hotle}}.")
			await expect(page.getByTestId("placeholder-unknown")).toContainText(
				"{{hotle}}",
			)
			await expect(page.getByTestId("send-campaign-btn")).toBeDisabled()

			await page
				.getByTestId("campaign-body")
				.fill("Dear {{lastName}}, room at {{hotel}}.")
			await expect(page.getByTestId("placeholder-missing")).toContainText(
				strangerEmail,
			)
			await expect(page.getByTestId("send-campaign-btn")).toBeEnabled()

			await page.getByTestId("send-campaign-btn").click()
			await page.getByTestId("confirm-send-campaign-btn").click()

			await expect
				.poll(
					async () => {
						const c = await db.emailCampaign.findUnique({
							where: { id: campaignId as string },
						})
						return c?.status
					},
					{ timeout: 30000 },
				)
				.toBe("SENT")

			const message = await waitForEmail(known.email, runId, 15000)
			expect(message, "no email delivered to the matched recipient").toBeTruthy()
			const full = await getMailpitMessage((message as { ID: string }).ID)
			expect((full as { HTML?: string }).HTML).toContain("Riverside Hotel")
			expect((full as { HTML?: string }).HTML).toContain("Znany")

			const stranger = await waitForEmail(strangerEmail, runId, 15000)
			expect(stranger, "no email delivered to the imported address").toBeTruthy()
			const strangerBody = await getMailpitMessage(
				(stranger as { ID: string }).ID,
			)
			expect((strangerBody as { HTML?: string }).HTML).toContain("Osoba")
		} finally {
			if (campaignId) {
				await db.emailCampaign
					.delete({ where: { id: campaignId } })
					.catch(() => {})
			}
			await deleteTestUser(known.email).catch(() => {})
			await clearMailpit(runId)
		}
	})

	test("keeps a wide sheet inside the dialog", async ({ page, testRun }) => {
		const runId = testRun.testRunId
		const wide = [
			"First name",
			"Last name",
			"Email",
			"Affiliation",
			"Assigned hotel name",
			"Nights of stay (from - to)",
			"Dietary requirements",
		]
		await openWizard(page, [
			["Conference 2026 — participants"],
			[],
			wide,
			[
				"Aleksandra",
				"Wiśniewska-Kowalczyk",
				`wide-${runId}@e2e.local`,
				"University of Somewhere Very Long Indeed",
				"Riverside Hotel and Conference Centre",
				"13.09.2026 - 16.09.2026",
				"No pork, no shellfish, lactose free",
			],
		])

		await expect(page.getByTestId("sheet-preview")).toBeVisible()
		const overflow = await page
			.getByRole("dialog")
			.evaluate((el) => el.scrollWidth - el.clientWidth)
		expect(overflow, "the dialog scrolls horizontally instead of the table").toBe(
			0,
		)
		await expect(page.getByTestId("sheet-preview")).toContainText(
			"Riverside Hotel and Conference Centre",
		)
	})

	test("blocks the import while the sheet repeats an address", async ({
		page,
		testRun,
	}) => {
		const runId = testRun.testRunId
		await openWizard(page, [
			["Imię", "Mail", "Hotel"],
			["Ann", `dup-${runId}@e2e.local`, "A"],
			["Ann again", `DUP-${runId}@e2e.local`, "B"],
		])

		await page.getByTestId("sheet-check-btn").click()
		await expect(page.getByTestId("sheet-problems")).toContainText(
			"appears in rows 2, 3",
		)
		await expect(page.getByTestId("sheet-map-btn")).toHaveCount(0)
	})
})
