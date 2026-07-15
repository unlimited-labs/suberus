import { randomUUID } from "node:crypto";
import { loginAs } from "../helpers/auth";
import {
	createSubmission,
	createTestUser,
	deleteTestUser,
	getPrisma,
} from "../helpers/test-db";
import { DEFAULT_PASSWORD } from "../helpers/test-users";
import { SubmissionStatus } from "../../src/generated/prisma/enums";
import { test, expect } from "./fixtures";

/**
 * Security: the email-verification gate is enforced server-side. SubmissionEmailGate
 * only guards the create view — the draft edit/submit screens never rendered it, so
 * an unverified author reaches these actions through plain UI (e.g. after changing
 * their email, which resets emailVerified).
 */
test.describe("Unverified email — submission gate", () => {
	async function unverifiedAuthor() {
		const email = `unverified-${randomUUID().slice(0, 8)}@e2e.local`;
		const user = await createTestUser({
			email,
			password: DEFAULT_PASSWORD,
			emailVerified: false,
		});
		return { ...user, email };
	}

	test("server refuses to submit a draft for an unverified author", async ({
		page,
	}) => {
		test.slow();
		// Arrange
		const author = await unverifiedAuthor();
		const draft = await createSubmission({
			title: `Unverified draft ${randomUUID().slice(0, 6)}`,
			userId: author.id,
			status: SubmissionStatus.DRAFT,
			withAuthor: true,
		});

		try {
			await loginAs(
				page,
				{ email: author.email, password: DEFAULT_PASSWORD },
				{ clearCookies: true },
			);
			await page.goto(`/submissions/${draft.id}`);

			// Act — no UI gate on this screen, so the button is genuinely reachable
			await page.getByRole("button", { name: "Submit", exact: true }).click();

			// Assert
			await expect(
				page
					.locator("[data-sonner-toast]")
					.getByText(/verify your email address/i),
			).toBeVisible({ timeout: 10000 });

			const after = await getPrisma().submission.findUnique({
				where: { id: draft.id },
			});
			expect(after?.status).toBe(SubmissionStatus.DRAFT);
		} finally {
			await getPrisma().submission.deleteMany({ where: { id: draft.id } });
			await deleteTestUser(author.id);
		}
	});

	test("server refuses to save a draft edit for an unverified author", async ({
		page,
	}) => {
		test.slow();
		// Arrange
		const author = await unverifiedAuthor();
		const draft = await createSubmission({
			title: `Unverified edit ${randomUUID().slice(0, 6)}`,
			userId: author.id,
			status: SubmissionStatus.DRAFT,
			withAuthor: true,
		});

		try {
			await loginAs(
				page,
				{ email: author.email, password: DEFAULT_PASSWORD },
				{ clearCookies: true },
			);
			await page.goto(`/submissions/${draft.id}/edit`);

			const titleInput = page.getByLabel("Title");
			await expect(titleInput).toBeVisible({ timeout: 10000 });
			const edited = `${draft.title} EDITED`;
			await titleInput.fill(edited);

			// Act
			await page.getByRole("button", { name: /Save draft/i }).click();

			// Assert
			await expect(
				page
					.locator("[data-sonner-toast]")
					.getByText(/verify your email address/i),
			).toBeVisible({ timeout: 10000 });

			const after = await getPrisma().submission.findUnique({
				where: { id: draft.id },
			});
			expect(after?.title).toBe(draft.title);
		} finally {
			await getPrisma().submission.deleteMany({ where: { id: draft.id } });
			await deleteTestUser(author.id);
		}
	});

	test("a verified author is unaffected", async ({ page }) => {
		test.slow();
		// Control: proves the tests above fail on the gate, not on a broken flow.
		const email = `verified-${randomUUID().slice(0, 8)}@e2e.local`;
		const author = await createTestUser({
			email,
			password: DEFAULT_PASSWORD,
			emailVerified: true,
		});
		const draft = await createSubmission({
			title: `Verified draft ${randomUUID().slice(0, 6)}`,
			userId: author.id,
			status: SubmissionStatus.DRAFT,
			withAuthor: true,
		});

		try {
			await loginAs(
				page,
				{ email, password: DEFAULT_PASSWORD },
				{ clearCookies: true },
			);
			await page.goto(`/submissions/${draft.id}`);

			await page.getByRole("button", { name: "Submit", exact: true }).click();

			await expect(
				page.locator("[data-sonner-toast]").getByText(/submitted/i),
			).toBeVisible({ timeout: 10000 });

			const after = await getPrisma().submission.findUnique({
				where: { id: draft.id },
			});
			expect(after?.status).not.toBe(SubmissionStatus.DRAFT);
		} finally {
			await getPrisma().submission.deleteMany({ where: { id: draft.id } });
			await deleteTestUser(author.id);
		}
	});
});
