import { test, expect } from "@playwright/test";
import { type Page } from "@playwright/test";
import {
	createSubmission,
	createTestUser,
	deleteSubmission,
	deleteTestUser,
	getTestUserIds,
} from "../helpers/test-db";
import { randomUUID } from "crypto";

/**
 * Co-author visibility tests
 * Tests that co-authors can see submissions they're listed on (read-only)
 * Uses per-test user isolation — each test creates its own co-author user
 */

async function login(page: Page, email: string, password: string) {
	await page.goto("/login");
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
	await page.getByLabel("E-mail").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL("/", { timeout: 30000 });
}

interface CoAuthorScenario {
	submission: { id: string; title: string };
	coauthor: { id: string; email: string };
	cleanup: () => Promise<void>;
}

async function arrangeCoAuthorScenario(title: string): Promise<CoAuthorScenario> {
	const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
	const coauthorEmail = `coauthor-${testRunId}@e2e.local`;

	const coauthor = await createTestUser({
		email: coauthorEmail,
		password: "testpass123",
		firstName: "CoAuthor",
		lastName: "Test",
		emailVerified: true,
	});
	const { testUserId } = await getTestUserIds();

	const submission = await createSubmission({
		testRunId,
		title,
		userId: testUserId,
		extraAuthors: [
			{
				firstName: "CoAuthor",
				lastName: "Test",
				email: coauthorEmail,
				userId: coauthor.id,
			},
		],
	});

	return {
		submission,
		coauthor: { id: coauthor.id, email: coauthorEmail },
		cleanup: async () => {
			await deleteSubmission(submission.id).catch(() => {});
			await deleteTestUser(coauthor.id).catch(() => {});
		},
	};
}

test.describe("Co-author Visibility", () => {
	test("co-author sees submission in list with badge", async ({ page }) => {
		// Arrange
		const { submission, coauthor, cleanup } = await arrangeCoAuthorScenario("CoAuthor List Test");

		try {
			// Act
			await login(page, coauthor.email, "testpass123");
			await page.goto("/submissions");

			// Assert
			await expect(page.getByText(submission.title).first()).toBeVisible();
			await expect(page.getByText("Co-author").first()).toBeVisible();
		} finally {
			await cleanup();
		}
	});

	test("co-author detail is read-only — no Edit/Withdraw actions", async ({ page }) => {
		// Arrange
		const { submission, coauthor, cleanup } = await arrangeCoAuthorScenario("CoAuthor ReadOnly Test");

		try {
			// Act
			await login(page, coauthor.email, "testpass123");
			await page.goto(`/submissions/${submission.id}`);

			// Assert — read-only badge visible
			await expect(page.getByText("Co-author (read-only)")).toBeVisible();

			// Assert — no action buttons (Edit, Withdraw)
			await expect(page.getByRole("button", { name: /Edit/i })).not.toBeVisible();
			await expect(page.getByRole("button", { name: /Withdraw/i })).not.toBeVisible();
		} finally {
			await cleanup();
		}
	});

	test("owner sees full actions — no read-only badge", async ({ page }) => {
		// Arrange
		const { submission, cleanup } = await arrangeCoAuthorScenario("Owner Actions Test");

		try {
			// Act — login as owner (test@e2e.local)
			await login(page, "test@e2e.local", "testpass123");
			await page.goto(`/submissions/${submission.id}`);

			// Assert — no read-only badge
			await expect(page.getByText("Co-author (read-only)")).not.toBeVisible();

			// Assert — submission title visible (owner has access)
			await expect(page.getByText(submission.title).first()).toBeVisible();
		} finally {
			await cleanup();
		}
	});

	test("unlinked co-author email — submission not visible", async ({ page }) => {
		// Arrange — create submission with co-author email that doesn't match any user
		const testRunId = `e2e_${randomUUID().slice(0, 8)}`;
		const unlinkedEmail = `nobody-${testRunId}@e2e.local`;
		const otherEmail = `other-${testRunId}@e2e.local`;

		const otherUser = await createTestUser({
			email: otherEmail,
			password: "testpass123",
			firstName: "Other",
			lastName: "User",
			emailVerified: true,
		});
		const { testUserId } = await getTestUserIds();

		const submission = await createSubmission({
			testRunId,
			title: "Unlinked CoAuthor Test",
			userId: testUserId,
			extraAuthors: [
				{ firstName: "Nobody", lastName: "CoAuthor", email: unlinkedEmail },
			],
		});

		try {
			// Act — login as the other user (not listed as co-author)
			await login(page, otherEmail, "testpass123");
			await page.goto("/submissions");

			// Assert — submission not visible
			await expect(page.getByText(submission.title).first()).not.toBeVisible();
		} finally {
			await deleteSubmission(submission.id).catch(() => {});
			await deleteTestUser(otherUser.id).catch(() => {});
		}
	});
});
