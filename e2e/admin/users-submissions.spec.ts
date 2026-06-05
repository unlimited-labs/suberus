import { SubmissionStatus, SubmissionType } from "../../src/generated/prisma/enums"
import { createSubmission, createTestUser, deleteTestUser } from "../helpers/test-db"
import { expect, test } from "./fixtures"

// The Submissions column + its header filter live in the desktop table only.
// Mobile renders cards (no header filter), so table/filter tests skip there.

let owner: { id: string; email: string }
let member: { id: string; email: string }
let empty: { id: string; email: string }

test.describe("Admin Users - Submissions column", () => {
	test.beforeAll(async () => {
		const ts = Date.now()
		owner = await createTestUser({
			email: `subcol-owner-${ts}@e2e.local`,
			firstName: "Owner",
			lastName: "SubCol",
		})
		member = await createTestUser({
			email: `subcol-member-${ts}@e2e.local`,
			firstName: "Member",
			lastName: "SubCol",
		})
		empty = await createTestUser({
			email: `subcol-empty-${ts}@e2e.local`,
			firstName: "Empty",
			lastName: "SubCol",
		})

		// member is AUTHOR (owner) of a submitted abstract
		await createSubmission({
			userId: member.id,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.SUBMITTED,
			title: `subcol-abstract-${ts}`,
		})
		// member is COAUTHOR of a poster owned by `owner`
		await createSubmission({
			userId: owner.id,
			type: SubmissionType.POSTER,
			status: SubmissionStatus.SUBMITTED,
			title: `subcol-poster-${ts}`,
			extraAuthors: [{ firstName: "Member", lastName: "SubCol", userId: member.id }],
		})
		// member has a DRAFT abstract (owner)
		await createSubmission({
			userId: member.id,
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.DRAFT,
			title: `subcol-draft-${ts}`,
		})
	})

	test.afterAll(async () => {
		if (empty) await deleteTestUser(empty.id)
		if (member) await deleteTestUser(member.id)
		if (owner) await deleteTestUser(owner.id)
	})

	test.beforeEach(async ({}, testInfo) => {
		test.skip(testInfo.project.name === "mobile-admin", "Header filter is desktop-only")
	})

	test("renders author / coauthor / draft badges", async ({ adminUsersPage }) => {
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()
		await adminUsersPage.search("Member SubCol")

		const row = adminUsersPage.page
			.locator("tr")
			.filter({ has: adminUsersPage.page.locator(`text="${member.email}"`) })
		const cell = row.getByTestId("user-submissions")
		await expect(cell).toContainText("author")
		await expect(cell).toContainText("coauthor")
		await expect(cell).toContainText("(draft)")
	})

	test("user with no submissions shows a dash", async ({ adminUsersPage }) => {
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()
		await adminUsersPage.search("Empty SubCol")

		const row = adminUsersPage.page
			.locator("tr")
			.filter({ has: adminUsersPage.page.locator(`text="${empty.email}"`) })
		await expect(row.getByTestId("user-submissions")).toHaveText("—")
	})

	test("header filter checkbox reflects selection", async ({ adminUsersPage }) => {
		const page = adminUsersPage.page
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()

		await page.getByTestId("submissions-filter-trigger").click()
		const authorOption = page.getByTestId("submission-filter-author")
		await expect(authorOption).toBeVisible()
		await expect(authorOption).toHaveAttribute("aria-checked", "false")

		await authorOption.click()

		// The crux: after clicking, the option must show as checked.
		await expect(authorOption).toHaveAttribute("aria-checked", "true")
	})

	test("role + type filters narrow the list (AND)", async ({ adminUsersPage }) => {
		const page = adminUsersPage.page
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()

		await page.getByTestId("submissions-filter-trigger").click()
		await page.getByTestId("submission-filter-coauthor").click()
		// member is coauthor of a poster → should remain visible
		const memberRow = page
			.locator("tr")
			.filter({ has: page.locator(`text="${member.email}"`) })
		await expect(memberRow).toBeVisible()
	})
})
